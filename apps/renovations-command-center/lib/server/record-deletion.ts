import { createHash } from "node:crypto";
import {
  FieldValue,
  type Firestore,
  type Transaction,
} from "firebase-admin/firestore";
import { CommandError, validId } from "../task-command";
import {
  deletableKinds,
  deletionEligibility,
  type DeletableKind,
  type DeletionData,
  type StoredEntry,
  type DeletionEligibility,
} from "../deletion-policy";
import { materialIsAvailable } from "../terminology";
const collections = [
  "rooms",
  "people",
  "tasks",
  "materials",
  "tools",
  "measurements",
  "decisions",
  "evidence",
  "taskHistory",
  "recordHistory",
  "commandReceipts",
  "scheduleRuns",
  "deletionHistory",
];
const revision = (target: StoredEntry) =>
  createHash("sha256").update(JSON.stringify(target)).digest("hex");
async function snapshot(
  db: Firestore,
  tx: Transaction,
  projectId: string,
  owner: string,
) {
  const project = db.doc(`projects/${projectId}`),
    p = await tx.get(project);
  if (!p.exists || p.data()?.ownerUserId !== owner || p.data()?.deletedAt)
    throw new CommandError(403, "Project is unavailable.");
  const snapshots = await Promise.all(
    collections.map((kind) => tx.get(project.collection(kind))),
  );
  const data: DeletionData = Object.fromEntries(
    snapshots.map((s, i) => [
      collections[i],
      s.docs.map((d) => ({ ...d.data(), id: d.id })),
    ]),
  );
  return {
    project,
    target: { ...p.data(), id: projectId } as StoredEntry,
    data,
  };
}
export async function deletionOptions(
  db: Firestore,
  projectId: string,
  owner: string,
) {
  if (!validId(projectId)) throw new CommandError(400, "Invalid project.");
  return db.runTransaction(async (tx) => {
    const s = await snapshot(db, tx, projectId, owner);
    const result: Record<string, DeletionEligibility> = {};
    for (const kind of deletableKinds)
      for (const target of kind === "project"
        ? [s.target]
        : (s.data[kind] ?? []))
        result[`${kind}:${target.id}`] = {
          ...deletionEligibility(kind, target, s.data),
          revision: revision(target),
        };
    return result;
  });
}
export async function deleteOpenRecord(
  db: Firestore,
  projectId: string,
  owner: string,
  kind: DeletableKind,
  id: string,
  expectedRevision: string,
) {
  if (
    !validId(projectId) ||
    !validId(id) ||
    !deletableKinds.includes(kind) ||
    typeof expectedRevision !== "string" ||
    expectedRevision.length !== 64
  )
    throw new CommandError(400, "Invalid deletion request.");
  return db.runTransaction(async (tx) => {
    const s = await snapshot(db, tx, projectId, owner);
    const target =
      kind === "project"
        ? id === projectId
          ? s.target
          : undefined
        : s.data[kind]?.find((r) => r.id === id);
    if (!target) throw new CommandError(404, "Record is unavailable.");
    if (target.deletedAt && target.deletedBy === owner)
      return { deleted: true };
    const eligibility = deletionEligibility(kind, target, s.data);
    if (!eligibility.allowed) throw new CommandError(409, eligibility.reason);
    if (revision(target) !== expectedRevision)
      throw new CommandError(409, "Record changed. Refresh before deleting.");
    const timestamp = FieldValue.serverTimestamp();
    const ref =
      kind === "project" ? s.project : s.project.collection(kind).doc(id);
    tx.update(ref, {
      deletedAt: timestamp,
      deletedBy: owner,
      updatedAt: timestamp,
      ...(kind === "project" ? { activeProject: false } : {}),
    });
    if (kind === "materials" || kind === "tools") {
      const task = s.data.tasks.find((t) => t.id === target.taskId);
      if (task) {
        const itemIds = Array.isArray(task.requiredItemIds)
          ? task.requiredItemIds
              .map(String)
              .filter((key) => key !== `${kind}:${id}`)
          : [];
        const available = itemIds.every((key) => {
          const [k, rid] = key.split(":");
          const r = s.data[k]?.find(
            (item) => item.id === rid && !item.deletedAt,
          );
          return (
            r &&
            (k === "materials"
              ? materialIsAvailable(String(r.status))
              : r.status === "available")
          );
        });
        tx.update(s.project.collection("tasks").doc(task.id), {
          requiredItemIds: itemIds,
          requiredItemsReady: available,
          updatedAt: timestamp,
        });
      }
    }
    tx.create(s.project.collection("deletionHistory").doc(), {
      kind,
      recordId: id,
      before: target,
      deletedBy: owner,
      createdAt: timestamp,
    });
    return { deleted: true };
  });
}
