import {
  collection,
  doc,
  getDoc,
  getDocs,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "./firebase";
const collections = [
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
        !row.id ||
        row.id.includes("/") ||
        ids.has(row.id) ||
        !row.data ||
        typeof row.data !== "object"
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
  return backup;
}
export async function exportProjectBackup(
  projectId: string,
): Promise<ProjectBackup> {
  if (!db || !auth?.currentUser) throw new Error("Sign in before exporting.");
  const project = await getDoc(doc(db, "projects", projectId));
  if (!project.exists() || project.data().ownerUserId !== auth.currentUser.uid)
    throw new Error("Project is unavailable.");
  const rows = await Promise.all(
    collections.map(async (kind) => {
      const snapshot = await getDocs(
        collection(db!, "projects", projectId, kind),
      );
      return [
        kind,
        snapshot.docs.map((d) => ({ id: d.id, data: d.data() })),
      ] as const;
    }),
  );
  return {
    application: "Renovations Command Center",
    schemaVersion: 1,
    projectId,
    createdAt: new Date().toISOString(),
    project: project.data(),
    collections: Object.fromEntries(rows),
  };
}
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
/** Restore into a separate project. The source and existing newer projects are untouched. Evidence stays in its originating project storage. */
export async function restoreProjectBackup(value: unknown) {
  if (!db || !auth?.currentUser) throw new Error("Sign in before restoring.");
  const backup = validateProjectBackup(value, auth.currentUser.uid);
  if ((backup.collections.evidence ?? []).length)
    throw new Error(
      "Evidence-backed restore requires private file-copy and parity verification. No changes were made.",
    );
  const ref = doc(collection(db, "projects"));
  const batch = writeBatch(db);
  batch.set(ref, {
    ...(restoreValues(backup.project) as Record<string, unknown>),
    name: `${String(backup.project.name)} (restored copy)`,
    activeProject: false,
    restoredFrom: backup.projectId,
  });
  for (const [kind, rows] of Object.entries(backup.collections))
    for (const row of rows)
      batch.set(
        doc(db, "projects", ref.id, kind, row.id),
        restoreValues(row.data) as Record<string, unknown>,
      );
  await batch.commit();
  const restored = await exportProjectBackup(ref.id);
  for (const [kind, rows] of Object.entries(backup.collections))
    if ((restored.collections[kind]?.length ?? 0) !== rows.length)
      throw new Error(
        `Restored copy ${ref.id} needs review: ${kind} count mismatch. Original project remains intact.`,
      );
  function canonical(value: unknown): string {
    const plain = JSON.parse(JSON.stringify(value));
    function sort(value: unknown): unknown {
      if (Array.isArray(value)) return value.map(sort);
      if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,sort(v)]));
      return value;
    }
    return JSON.stringify(sort(plain));
  }
  for (const [kind,rows] of Object.entries(backup.collections)) {
    const actual = new Map(restored.collections[kind].map(row=>[row.id,row.data]));
    for (const row of rows) if (canonical(actual.get(row.id)) !== canonical(row.data)) throw new Error(`Restored copy ${ref.id} needs review: ${kind}/${row.id} semantic parity failed. Original remains intact.`);
  }
  return ref.id;
}
