import { createHash } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import type { Bucket } from "@google-cloud/storage";
import { privatePhotoStore, photoVersionValid, type PhotoStore } from "./photo-store";
import { collections, MAX_BACKUP_JSON_BYTES, MAX_BACKUP_PHOTO_BYTES, validateProjectBackup, type ProjectBackup, type BackupPhoto } from "../backup-format";
import { CommandError, validId } from "../task-command";

export function decodeBackupPhotos(backup: ProjectBackup) {
  return new Map((backup.photoObjects ?? []).map(photo => {
    const bytes = Buffer.from(photo.base64, "base64");
    if (bytes.length !== photo.size || bytes.toString("base64") !== photo.base64
      || createHash("sha256").update(bytes).digest("hex") !== photo.sha256)
      throw new CommandError(400, "Backup photo checksum failed. No project was restored.");
    return [photo.id, { photo, bytes }] as const;
  }));
}

/** Snapshot records together; immutable, generation-pinned photos cannot drift from that snapshot. */
export async function exportProjectArchive(db: Firestore, bucket: Bucket | PhotoStore, owner: string, projectId: string): Promise<ProjectBackup> {
  if (!validId(projectId)) throw new CommandError(400, "Invalid project ID.");
  const photos = privatePhotoStore(bucket);
  const ref = db.doc(`projects/${projectId}`);
  const snapshot = await db.runTransaction(async tx => {
    const project = await tx.get(ref);
    if (!project.exists || project.data()?.ownerUserId !== owner) throw new CommandError(403, "Project is unavailable.");
    const rows = await Promise.all(collections.map(async kind => {
      const records = await tx.get(ref.collection(kind).limit(450));
      return [kind, records.docs.map(row => ({ id: row.id, data: row.data() }))] as const;
    }));
    return { application: "Renovations Command Center" as const, schemaVersion: 2 as const, projectId,
      createdAt: new Date().toISOString(), project: project.data()!, collections: Object.fromEntries(rows), photoObjects: [] as BackupPhoto[] };
  });
  // Apply record/link/count limits before reading any large photo buffers.
  validateProjectBackup({ ...snapshot, schemaVersion: 1, photoObjects: undefined }, owner);
  if (Buffer.byteLength(JSON.stringify(snapshot)) > MAX_BACKUP_JSON_BYTES)
    throw new CommandError(413, "Backup exceeds the 32 MB portable limit. No records were omitted.");
  let total = 0;
  for (const row of snapshot.collections.evidence ?? []) {
    const path = `projects/${projectId}/evidence/${row.id}`;
    if (!validId(row.id) || row.data.path !== path || !validId(row.data.taskId)
      || !photoVersionValid(row.data.generation))
      throw new CommandError(409, "Evidence linkage needs review before backup. No files were omitted.");
    const metadata = await photos.info(path);
    const size = Number(metadata.size);
    if (metadata.version !== row.data.generation || metadata.metadata?.uploadedBy !== owner
      || metadata.metadata?.taskId !== row.data.taskId || metadata.metadata?.firebaseStorageDownloadTokens
      || !["image/jpeg", "image/png", "image/webp"].includes(metadata.contentType ?? "")
      || !Number.isInteger(size) || size <= 0 || size >= 10 * 1024 * 1024)
      throw new CommandError(409, "Private photo verification failed. Backup was not exported.");
    total += size;
    if (total > MAX_BACKUP_PHOTO_BYTES) throw new CommandError(413, "Portable backup supports up to 20 MB of photos. No files were omitted.");
    const bytes = await photos.read(path, row.data.generation as string);
    if (bytes.length !== size) throw new CommandError(409, "Photo changed during backup. Retry export.");
    snapshot.photoObjects.push({ id: row.id, contentType: metadata.contentType!, size,
      sha256: createHash("sha256").update(bytes).digest("hex"), base64: bytes.toString("base64") });
  }
  const plain = JSON.parse(JSON.stringify(snapshot)) as ProjectBackup;
  validateProjectBackup(plain, owner);
  if (Buffer.byteLength(JSON.stringify(plain)) > MAX_BACKUP_JSON_BYTES)
    throw new CommandError(413, "Backup exceeds the 32 MB portable limit. No records were omitted.");
  return plain;
}
