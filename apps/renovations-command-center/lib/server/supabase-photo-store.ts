import { StorageClient } from "@supabase/storage-js";
import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { CommandError, validId } from "../task-command";
import { PHOTO_LIMIT, PHOTO_TYPES, photoHash, type PhotoInfo, type PhotoStore } from "./photo-store";
// Dedicated app bucket: leave headroom below the provider's 1 GB free allowance.
export const FREE_PHOTO_CAPACITY = 800 * 1024 * 1024;
export function supabasePhotoStore(db: Firestore, client: StorageClient, bucketName: string): PhotoStore {
  const files = client.from(bucketName);
  const capacity = db.doc("photoStorage/capacity");
  const manifest = (path: string) => {
    const parts = path.split("/");
    if (parts.length !== 4 || parts[0] !== "projects" || !validId(parts[1]) || !validId(parts[3]) || !["evidence", "evidence-staging"].includes(parts[2])) throw new CommandError(400, "Invalid photo path.");
    return db.doc(`photoStorageObjects/${photoHash(Buffer.from(path))}`);
  };
  async function checkBucket() {
    const { data, error } = await client.getBucket(bucketName);
    if (error || !data || data.public !== false) throw new CommandError(503, "Private photo storage is unavailable. Keep the device copy.");
  }
  function providerError(error: { statusCode?: string; message: string }): never {
    if (Number(error.statusCode) === 404) throw Object.assign(new Error("Photo unavailable."), { code: 404 });
    if (Number(error.statusCode) === 409 || error.message === "The resource already exists") throw Object.assign(new Error("Photo exists."), { code: 412 });
    throw new CommandError(503, "Photo storage is unavailable or at its free limit. Keep the device copy and retry.");
  }
  async function info(path: string): Promise<PhotoInfo> {
    const ref = manifest(path);
    await checkBucket();
    const record = await ref.get();
    const { data, error } = await files.info(path);
    if (error) providerError(error);
    const m = record.data();
    if (m?.path === path && m.state === "reserved") throw Object.assign(new Error("Photo upload is unconfirmed."), { code: 404 });
    if (!data || !m || m.path !== path || m.state !== "ready" || !data.id || !data.version) throw new CommandError(409, "Photo verification is incomplete. Retry with the original device copy.");
    const version = `supabase:${data.id}:${data.version}`;
    const size = data.size ?? data.metadata?.size;
    const contentType = data.contentType ?? data.metadata?.mimetype;
    if (m.version !== version || size !== m.size || contentType !== m.contentType) throw new CommandError(409, "Private photo identity changed.");
    return { version, size: m.size, contentType: m.contentType, metadata: { ...m.metadata, sha256: m.sha256 } };
  }
  async function read(path: string, version: string) {
    const before = await info(path);
    if (before.version !== version) throw new CommandError(409, "Photo version changed.");
    const { data, error } = await files.download(path);
    if (error) providerError(error);
    if (!data || data.size !== before.size || data.size >= PHOTO_LIMIT) throw new CommandError(409, "Photo size changed.");
    const bytes = Buffer.from(await data.arrayBuffer());
    const after = await info(path);
    if (after.version !== version || photoHash(bytes) !== before.metadata.sha256) throw new CommandError(409, "Photo checksum changed.");
    return bytes;
  }
  return {
    info, read,
    async create(path, bytes, contentType, metadata) {
      const ref = manifest(path);
      if (!PHOTO_TYPES.includes(contentType) || bytes.length <= 0 || bytes.length >= PHOTO_LIMIT || !metadata.uploadedBy || !validId(metadata.taskId)) throw new CommandError(400, "Invalid private image.");
      await checkBucket();
      const sha256 = photoHash(bytes);
      const fingerprint = photoHash(Buffer.from(JSON.stringify({ path, size: bytes.length, contentType, metadata, sha256 })));
      await db.runTransaction(async tx => {
        const [existing, usage] = await Promise.all([tx.get(ref), tx.get(capacity)]);
        if (existing.exists) {
          if (existing.data()?.state === "deleting") throw new CommandError(409, "Staging cleanup is in progress. Retry confirmation.");
          if (existing.data()?.fingerprint !== fingerprint) throw new CommandError(409, "Photo ID belongs to a different upload.");
          return;
        }
        const used = usage.data()?.reservedBytes ?? 0;
        if (!Number.isSafeInteger(used) || used < 0 || used + bytes.length > FREE_PHOTO_CAPACITY) throw new CommandError(507, "Free photo storage is full. Photo remains on this device; archive photos before retrying.");
        tx.set(capacity, { reservedBytes: used + bytes.length });
        tx.create(ref, { path, size: bytes.length, contentType, metadata, sha256, fingerprint, state: "reserved", createdAt: FieldValue.serverTimestamp() });
      });
      const upload = await files.upload(path, bytes, { contentType, cacheControl: "0", upsert: false });
      if (upload.error && !(Number(upload.error.statusCode) === 409 || upload.error.message === "The resource already exists")) providerError(upload.error);
      // Unknown/lost upload responses retry the same reservation; never overwrite.
      const { data, error } = await files.info(path);
      if (error) providerError(error);
      if (!data?.id || !data.version || (data.size ?? data.metadata?.size) !== bytes.length || (data.contentType ?? data.metadata?.mimetype) !== contentType) throw new CommandError(409, "Uploaded photo identity failed verification.");
      const downloaded = await files.download(path);
      if (downloaded.error) providerError(downloaded.error);
      if (!downloaded.data || downloaded.data.size !== bytes.length || photoHash(new Uint8Array(await downloaded.data.arrayBuffer())) !== sha256) throw new CommandError(409, "Uploaded photo checksum failed. Keep the original.");
      const version = `supabase:${data.id}:${data.version}`;
      await db.runTransaction(async tx => {
        const current = await tx.get(ref);
        if (current.data()?.state === "deleting" || current.data()?.fingerprint !== fingerprint || (current.data()?.version && current.data()?.version !== version)) throw new CommandError(409, "Upload reservation changed.");
        tx.update(ref, { version, state: "ready" });
      });
    },
    async removeStaging(path) {
      if (!/^projects\/[^/]+\/evidence-staging\/[^/]+$/.test(path)) throw new CommandError(400, "Only staging files can be removed.");
      const ref = manifest(path);
      await checkBucket();
      const record = await db.runTransaction(async tx => {
        const current = await tx.get(ref);
        if (!current.exists) return null;
        if (!["ready", "deleting"].includes(current.data()?.state)) throw new CommandError(409, "Staging upload is unconfirmed. Retry before cleanup.");
        tx.update(ref, { state: "deleting" });
        return current.data()!;
      });
      if (!record) return;
      const deleted = await files.remove([path]);
      if (deleted.error) providerError(deleted.error);
      await db.runTransaction(async tx => {
        const [current, usage] = await Promise.all([tx.get(ref), tx.get(capacity)]);
        if (!current.exists) return;
        if (current.data()?.state !== "deleting" || current.data()?.fingerprint !== record.fingerprint) throw new CommandError(409, "Cleanup reservation changed.");
        const used = usage.data()?.reservedBytes;
        if (!Number.isSafeInteger(used) || used < record.size) throw new CommandError(409, "Photo capacity requires review.");
        tx.delete(ref);
        tx.set(capacity, { reservedBytes: used - record.size });
      });
    },
  };
}
