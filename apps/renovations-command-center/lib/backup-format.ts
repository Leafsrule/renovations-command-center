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
  schemaVersion: 1;
  projectId: string;
  createdAt: string;
  project: Record<string, unknown>;
  collections: Record<string, Row[]>;
};
export function validateProjectBackup(
  value: unknown,
  ownerId: string,
): ProjectBackup {
  const backup = value as ProjectBackup;
  if (
    !backup ||
    backup.application !== "Renovations Command Center" ||
    backup.schemaVersion !== 1 ||
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
  return backup;
}
