export const collections = [
  "tasks",
  "rooms",
  "people",
  "settings",
  "materials",
  "tools",
  "measurements",
  "decisions",
  "evidence",
  "recordHistory",
  "taskHistory",
  "scheduleRuns",
] as const;
type Row = { id: string; data: Record<string, unknown> };
export type ProjectBackup = {
  application: "Renovations Command Center";
  schemaVersion: 1 | 2;
  projectId: string;
  createdAt: string;
  project: Record<string, unknown>;
  collections: Record<string, Row[]>;
  photoObjects?: BackupPhoto[];
};
export type BackupPhoto = { id: string; contentType: string; size: number; sha256: string; base64: string };
export const MAX_BACKUP_PHOTO_BYTES = 20 * 1024 * 1024;
export const MAX_BACKUP_JSON_BYTES = 32 * 1024 * 1024;
export function validateProjectBackup(
  value: unknown,
  ownerId: string,
): ProjectBackup {
  const backup = value as ProjectBackup;
  if (
    !backup ||
    backup.application !== "Renovations Command Center" ||
    ![1, 2].includes(backup.schemaVersion) ||
    backup.project?.ownerUserId !== ownerId
  )
    throw new Error("Choose a backup from this app and your account.");
  if (
    !backup.collections ||
    Object.keys(backup.collections).some(
      (key) => !collections.includes(key as (typeof collections)[number]),
    )
  )
    throw new Error("Backup contains unsupported record collections.");
  let count = 1;
  for (const [kind, rows] of Object.entries(backup.collections)) {
    if (!Array.isArray(rows)) throw new Error(`Invalid ${kind} collection.`);
    const ids = new Set<string>();
    for (const row of rows) {
      if (
        !row ||
        typeof row.id !== "string" ||
        !row.id ||
        row.id.includes("/") ||
        ids.has(row.id) ||
        !row.data ||
        typeof row.data !== "object" ||
        Array.isArray(row.data)
      )
        throw new Error(`Invalid or duplicate ${kind} record.`);
      ids.add(row.id);
      count++;
    }
  }
  if (count > 450)
    throw new Error(
      "Backup exceeds the atomic restore limit of 450 records. No records were changed.",
    );
  const tasks = backup.collections.tasks ?? [],
    taskIds = new Set(tasks.map((t) => t.id));
  const roomIds = new Set((backup.collections.rooms ?? []).map((r) => r.id)),
    personIds = new Set((backup.collections.people ?? []).map((r) => r.id));
  for (const task of tasks) {
    if (task.data.roomId && !roomIds.has(String(task.data.roomId)))
      throw new Error("Backup has orphaned room links.");
    if (
      task.data.championPersonId &&
      !personIds.has(String(task.data.championPersonId))
    )
      throw new Error("Backup has orphaned champion links.");
    if (
      Array.isArray(task.data.helperPersonIds) &&
      task.data.helperPersonIds.some((id) => !personIds.has(String(id)))
    )
      throw new Error("Backup has orphaned helper links.");
    if (
      !Array.isArray(task.data.dependencyTaskIds) ||
      task.data.dependencyTaskIds.some((id) => !taskIds.has(String(id)))
    )
      throw new Error("Backup has orphaned task dependencies.");
  }
  for (const kind of [
    "materials",
    "tools",
    "measurements",
    "decisions",
    "evidence",
  ]) {
    for (const row of backup.collections[kind] ?? [])
      if (!taskIds.has(String(row.data.taskId)))
        throw new Error(`Orphaned ${kind} task link.`);
  }
  const graph = new Map(
    tasks.map((task) => [task.id, task.data.dependencyTaskIds as string[]]),
  );
  const visiting = new Set<string>(),
    visited = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id))
      throw new Error("Backup contains circular task dependencies.");
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of graph.get(id) ?? []) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of graph.keys()) visit(id);
  if (backup.schemaVersion === 2) {
    const photos = backup.photoObjects;
    const evidence = backup.collections.evidence ?? [];
    if (!Array.isArray(photos) || photos.length !== evidence.length)
      throw new Error("Backup must contain every evidence photo.");
    const ids = new Set<string>();
    let total = 0;
    for (const photo of photos) {
      if (!photo || typeof photo.id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(photo.id) || !evidence.some(row => row.id === photo.id) || ids.has(photo.id)
        || !["image/jpeg", "image/png", "image/webp"].includes(photo.contentType)
        || !Number.isInteger(photo.size) || photo.size <= 0 || photo.size >= 10 * 1024 * 1024
        || typeof photo.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(photo.sha256)
        || typeof photo.base64 !== "string" || photo.base64.length !== 4 * Math.ceil(photo.size / 3)
        || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(photo.base64))
        throw new Error("Invalid or duplicate backup photo.");
      ids.add(photo.id);
      total += photo.size;
    }
    if (total > MAX_BACKUP_PHOTO_BYTES) throw new Error("Photo backup exceeds the 20 MB portable limit. No files were omitted.");
  } else if (backup.photoObjects !== undefined) throw new Error("Photo files require backup format 2.");
  return backup;
}
