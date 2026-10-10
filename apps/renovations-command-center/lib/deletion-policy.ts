export const deletableKinds = [
  "project",
  "rooms",
  "people",
  "tasks",
  "materials",
  "tools",
  "measurements",
  "decisions",
] as const;
export type DeletableKind = (typeof deletableKinds)[number];
export type StoredEntry = { id: string; [key: string]: unknown };
export type DeletionData = Record<string, StoredEntry[]>;
export type DeletionEligibility = {
  allowed: boolean;
  reason: string;
  revision?: string;
};
const closed = (status: unknown) =>
  [
    "complete",
    "cancelled",
    "archived",
    "closed",
    "used",
    "approved",
    "verified",
    "superseded",
    "rejected",
  ].includes(String(status));
const ids = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String) : [];
export function deletionEligibility(
  kind: DeletableKind,
  target: StoredEntry,
  data: DeletionData,
): DeletionEligibility {
  const deny = (reason: string) => ({ allowed: false, reason });
  if (target.deletedAt) return deny("This record has already been deleted.");
  if (closed(target.status)) return deny("Closed entries must be retained.");
  const tasks = data.tasks ?? [],
    history = data.taskHistory ?? [];
  const hasClosedHistory = (id: string) =>
    tasks.some((t) => t.id === id && closed(t.status)) ||
    history.some(
      (h) =>
        h.taskId === id &&
        (closed(h.fromStatus) || closed(h.toStatus) || h.action === "complete"),
    );
  if (kind === "project") {
    if (
      tasks.some((t) => hasClosedHistory(t.id)) ||
      (data.evidence ?? []).length
    )
      return deny("Closed entries or saved media must be retained.");
    if (Object.values(data).some((rows) => rows.length))
      return deny("This project has entries. Keep it and use Archive instead.");
  }
  if (kind === "rooms" || kind === "people") {
    const linked = tasks.filter((t) =>
      kind === "rooms"
        ? t.roomId === target.id
        : t.championPersonId === target.id ||
          ids(t.helperPersonIds).includes(target.id),
    );
    if (linked.some((t) => hasClosedHistory(t.id)))
      return deny("Closed task entries are linked to this record.");
    if (linked.length)
      return deny("Reassign linked tasks before deleting this record.");
    if (
      kind === "rooms" &&
      (data.measurements ?? []).some((r) => r.roomId === target.id)
    )
      return deny("Linked measurements must be retained or reassigned.");
  }
  if (kind === "tasks") {
    if (hasClosedHistory(target.id))
      return deny("Closed task history must be retained.");
    if (
      history.some((h) => h.taskId === target.id) ||
      Number(target.actualDurationMinutes) > 0
    )
      return deny("Posted work history must be retained.");
    if (
      (data.evidence ?? []).some((r) => r.taskId === target.id) ||
      Number(target.evidenceCount) > 0
    )
      return deny("Saved media must be retained.");
    if (
      !["design", "draft", "not_ready", "ready"].includes(String(target.status))
    )
      return deny("Only unused planning tasks can be deleted.");
    if (
      tasks.some((t) => ids(t.dependencyTaskIds).includes(target.id)) ||
      ["materials", "tools", "measurements", "decisions"].some((k) =>
        (data[k] ?? []).some((r) => r.taskId === target.id),
      )
    )
      return deny(
        "Remove or reassign linked entries before deleting this task.",
      );
    if (
      (data.scheduleRuns ?? []).some((r) =>
        JSON.stringify(r).includes(target.id),
      )
    )
      return deny("Saved schedule entries reference this task.");
  }
  if (["materials", "tools", "measurements", "decisions"].includes(kind)) {
    if (hasClosedHistory(String(target.taskId)))
      return deny("Closed task entries are linked to this record.");
    if (
      (data.recordHistory ?? []).some(
        (h) =>
          h.kind === kind &&
          h.recordId === target.id &&
          [h.before, h.after].some(
            (v) =>
              v &&
              typeof v === "object" &&
              closed((v as { status?: unknown }).status),
          ),
      )
    )
      return deny("Closed record history must be retained.");
    if (
      tasks.some(
        (t) =>
          t.id === target.taskId &&
          (!["design", "draft", "not_ready", "ready"].includes(
            String(t.status),
          ) ||
            history.some((h) => h.taskId === t.id)),
      )
    )
      return deny(
        "Posted work must be retained. This linked record cannot be deleted.",
      );
  }
  return {
    allowed: true,
    reason: "Unused open record. Deletion retains its audit history.",
  };
}
