import {
  collection,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";
export type FieldKind = "materials" | "tools" | "measurements" | "decisions";
export type FieldRecord = {
  id: string;
  name: string;
  taskId: string;
  quantity: number;
  unit: string;
  status: string;
  notes: string;
  supplier: string;
  neededDate: string;
  feet: number;
  inches: number;
  tolerance: number;
  version: number;
  approvalReason: string;
};
export function emptyFieldRecord(): FieldRecord {
  return {
    id: crypto.randomUUID(),
    name: "",
    taskId: "",
    quantity: 1,
    unit: "each",
    status: "unknown",
    notes: "",
    supplier: "",
    neededDate: "",
    feet: 0,
    inches: 0,
    tolerance: 0,
    version: 0,
    approvalReason: "",
  };
}
export function validateFieldRecord(kind: FieldKind, record: FieldRecord) {
  if (!record.name.trim()) throw new Error("Name is required.");
  if (!record.taskId) throw new Error("Choose a linked task.");
  if (!Number.isInteger(record.version) || record.version < 0)
    throw new Error("Invalid record version.");
  if (
    kind === "materials" &&
    (!Number.isFinite(record.quantity) ||
      record.quantity <= 0 ||
      !record.unit.trim())
  )
    throw new Error("Enter a positive quantity and unit.");
  if (
    kind === "measurements" &&
    (!Number.isFinite(record.feet) ||
      !Number.isFinite(record.inches) ||
      !Number.isFinite(record.tolerance) ||
      record.feet < 0 ||
      !Number.isInteger(record.feet) ||
      record.inches < 0 ||
      record.inches >= 12 ||
      record.tolerance < 0)
  )
    throw new Error(
      "Use whole nonnegative feet, inches from 0 to under 12, and a nonnegative tolerance.",
    );
  if (
    ["verified", "approved"].includes(record.status) &&
    !record.approvalReason.trim()
  )
    throw new Error(
      "Record how this measurement was verified or why the decision was approved.",
    );
}
export async function listFieldRecords(
  projectId: string,
  kind: FieldKind,
): Promise<FieldRecord[]> {
  if (!db) throw new Error("Firestore is not configured.");
  const snapshot = await getDocs(collection(db, "projects", projectId, kind));
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as FieldRecord);
}
export async function saveFieldRecord(
  projectId: string,
  kind: FieldKind,
  record: FieldRecord,
  ownerId: string,
  changeId: string,
) {
  validateFieldRecord(kind, record);
  if (!db || auth?.currentUser?.uid !== ownerId)
    throw new Error("Sign in with the original account to save this change.");
  const recordRef = doc(db, "projects", projectId, kind, record.id);
  await runTransaction(db, async (tx) => {
    const [current, task] = await Promise.all([
      tx.get(recordRef),
      tx.get(doc(db!, "projects", projectId, "tasks", record.taskId)),
    ]);
    if (!task.exists()) throw new Error("Linked task no longer exists.");
    if (current.exists() && current.data().taskId !== record.taskId)
      throw new Error(
        "Create a separate record to link a different task. Existing linkage is preserved.",
      );
    const itemIds: string[] = Array.isArray(task.data().requiredItemIds)
      ? task.data().requiredItemIds
      : [];
    const itemKey = `${kind}:${record.id}`;
    const nextItemIds = ["materials", "tools"].includes(kind)
      ? [...new Set([...itemIds, itemKey])]
      : itemIds;
    const requiredItems = await Promise.all(
      nextItemIds
        .filter((key) => key !== itemKey)
        .map((key) => {
          const [itemKind, itemId] = key.split(":");
          return tx.get(doc(db!, "projects", projectId, itemKind, itemId));
        }),
    );
    if (current.data()?.lastChangeId === changeId) return;
    if (Number(current.data()?.version || 0) !== record.version)
      throw new Error(
        "CONFLICT: This record changed on another device. Reload it and review your draft.",
      );
    if (["materials", "tools"].includes(kind)) {
      const isAvailable = (itemKind: string, status: unknown) =>
        itemKind === "materials"
          ? ["on_site", "used"].includes(String(status))
          : status === "available";
      const ready =
        isAvailable(kind, record.status) &&
        requiredItems.every(
          (snapshot, index) =>
            snapshot.exists() &&
            isAvailable(
              nextItemIds.filter((key) => key !== itemKey)[index].split(":")[0],
              snapshot.data()?.status,
            ),
        );
      tx.update(doc(db!, "projects", projectId, "tasks", record.taskId), {
        requiredItemIds: nextItemIds,
        requiredItemsReady: ready,
        updatedAt: serverTimestamp(),
      });
    }
    tx.set(recordRef, {
      ...record,
      lastChangeId: changeId,
      name: record.name.trim(),
      version: record.version + 1,
      totalInches:
        kind === "measurements" ? record.feet * 12 + record.inches : null,
      updatedAt: serverTimestamp(),
    });
    tx.set(doc(collection(db!, "projects", projectId, "recordHistory")), {
      kind,
      recordId: record.id,
      before: current.exists() ? current.data() : null,
      after: { ...record, version: record.version + 1 },
      changedBy: ownerId,
      createdAt: serverTimestamp(),
    });
  });
}
export type PendingFieldChange = {
  kind: FieldKind;
  record: FieldRecord;
  ownerId: string;
  projectId: string;
  state: "draft" | "pending" | "conflicting" | "failed";
  error: string;
  changeId: string;
};
export function pendingKey(
  ownerId: string,
  projectId: string,
  kind: FieldKind,
) {
  return `rcc:field-draft:${ownerId}:${projectId}:${kind}`;
}
export function storePending(change: PendingFieldChange) {
  localStorage.setItem(
    pendingKey(change.ownerId, change.projectId, change.kind),
    JSON.stringify(change),
  );
}
export function readPending(
  ownerId: string,
  projectId: string,
  kind: FieldKind,
): PendingFieldChange | null {
  const raw = localStorage.getItem(pendingKey(ownerId, projectId, kind));
  if (!raw) return null;
  const change = JSON.parse(raw) as PendingFieldChange;
  if (
    change.ownerId !== ownerId ||
    change.projectId !== projectId ||
    change.kind !== kind
  )
    throw new Error("Draft scope does not match this account/project.");
  return change;
}
