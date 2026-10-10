import {
  FieldValue,
  Timestamp,
  type Firestore,
} from "firebase-admin/firestore";
import { createHash } from "node:crypto";
import type { Bucket } from "@google-cloud/storage";
import { privatePhotoStore, type PhotoStore } from "./photo-store";
import { decodeBackupPhotos } from "./project-archive";
import { validateProjectBackup } from "../backup-format";
import { CommandError, validId } from "../task-command";
function restoreValues(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(restoreValues);
  if (value && typeof value === "object") {
    const data = value as Record<string, unknown>;
    if (
      data.type === "firestore/timestamp/1.0" &&
      typeof data.seconds === "number" &&
      typeof data.nanoseconds === "number"
    )
      return new Timestamp(data.seconds, data.nanoseconds);
    return Object.fromEntries(
      Object.entries(data).map(([key, v]) => [key, restoreValues(v)]),
    );
  }
  return value;
}
export async function restoreProject(
  db: Firestore,
  owner: string,
  projectId: string,
  value: unknown,
  bucket?: Bucket | PhotoStore,
) {
  if (!validId(projectId)) throw new CommandError(400, "Invalid restore ID.");
  let backup;
  try {
    backup = validateProjectBackup(value, owner);
  } catch (e) {
    throw new CommandError(
      400,
      e instanceof Error ? e.message : "Invalid backup.",
    );
  }
  if ((backup.collections.evidence ?? []).length && (backup.schemaVersion !== 2 || !bucket))
    throw new CommandError(
      400,
      "Media-backed restore requires private file-copy verification. No changes were made.",
    );
  const digest = createHash("sha256")
    .update(JSON.stringify(backup))
    .digest("hex");
  const ref = db.doc(`projects/${projectId}`);
  // Verify all checksums before reserving a destination or writing any object.
  const photos = decodeBackupPhotos(backup);
  const reservation = db.doc(`projectRestores/${projectId}`);
  await db.runTransaction(async tx => {
    const [existing, pending] = await Promise.all([tx.get(ref), tx.get(reservation)]);
    if (existing.exists && (existing.data()?.ownerUserId !== owner || existing.data()?.restoreDigest !== digest))
      throw new CommandError(409, "Restore destination already exists. No records were overwritten.");
    if (pending.exists && (pending.data()?.owner !== owner || pending.data()?.digest !== digest))
      throw new CommandError(409, "Restore destination is reserved for a different backup.");
    if (!pending.exists) tx.create(reservation, { owner, digest, createdAt: FieldValue.serverTimestamp() });
  });
  const store = bucket ? privatePhotoStore(bucket) : undefined;
  const restoredEvidence = new Map<string, Record<string, unknown>>();
  for (const row of backup.collections.evidence ?? []) {
    const { photo, bytes } = photos.get(row.id)!;
    const path = `projects/${projectId}/evidence/${row.id}`;
    let metadata;
    try { metadata = await store!.info(path); }
    catch (error) {
      if ((error as { code?: number }).code !== 404) throw error;
      try {
        await store!.create(path, bytes, photo.contentType, { uploadedBy: owner, taskId: String(row.data.taskId), restoreDigest: digest, sha256: photo.sha256 });
      } catch (saveError) { if ((saveError as { code?: number }).code !== 412) throw saveError; }
      metadata = await store!.info(path);
    }
    if (!metadata.version || metadata.metadata?.uploadedBy !== owner || metadata.metadata?.taskId !== row.data.taskId
      || metadata.metadata?.restoreDigest !== digest || metadata.metadata?.sha256 !== photo.sha256
      || metadata.metadata?.firebaseStorageDownloadTokens || metadata.contentType !== photo.contentType
      || Number(metadata.size) !== photo.size)
      throw new CommandError(409, "Restored photo conflicts with this backup. Keep the backup and original project.");
    const readback = await store!.read(path, metadata.version);
    if (createHash("sha256").update(readback).digest("hex") !== photo.sha256)
      throw new CommandError(409, "Restored photo checksum failed. Project was not published.");
    restoredEvidence.set(row.id, { ...row.data, path, generation: metadata.version, size: photo.size, contentType: photo.contentType });
  }
  await db.runTransaction(async (tx) => {
    const [existing, pending] = await Promise.all([tx.get(ref), tx.get(reservation)]);
    if (pending.data()?.owner !== owner || pending.data()?.digest !== digest)
      throw new CommandError(409, "Restore reservation changed. Keep the backup.");
    if (existing.exists) {
      if (
        existing.data()?.ownerUserId === owner &&
        existing.data()?.restoreDigest === digest
      )
        return;
      throw new CommandError(
        409,
        "Restore destination already exists. No records were overwritten.",
      );
    }
    tx.create(ref, {
      ...(restoreValues(backup.project) as Record<string, unknown>),
      name: `${String(backup.project.name)} (restored copy)`,
      activeProject: false,
      ownerUserId: owner,
      restoredFrom: backup.projectId,
      restoredBy: owner,
      restoredAt: FieldValue.serverTimestamp(),
      restoreDigest: digest,
    });
    for (const [kind, rows] of Object.entries(backup.collections))
      for (const row of rows)
        tx.create(
          ref.collection(kind).doc(row.id),
          restoreValues(kind === "evidence" ? restoredEvidence.get(row.id)! : row.data) as Record<string, unknown>,
        );
    tx.update(reservation, { completedAt: FieldValue.serverTimestamp() });
  });
  return projectId;
}
