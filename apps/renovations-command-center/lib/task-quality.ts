import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";
export type QualityItem = { label: string; required: boolean; passed: boolean };
export async function saveTaskQuality(
  projectId: string,
  taskId: string,
  input: {
    items: QualityItem[];
    required: boolean;
    cureUntil: string | null;
    overrideReason: string;
    workMinutes: number;
    workNote: string;
    rework: boolean;
  },
) {
  if (!db || !auth?.currentUser) throw new Error("Sign in to save the review.");
  if (input.items.some((i) => !i.label.trim()))
    throw new Error("Checklist items need a description.");
  if (input.cureUntil && !Number.isFinite(new Date(input.cureUntil).getTime()))
    throw new Error("Choose a valid curing release time.");
  if (!Number.isFinite(input.workMinutes) || input.workMinutes < 0)
    throw new Error("Actual work minutes cannot be negative.");
  if (input.workMinutes > 0 && !input.workNote.trim())
    throw new Error("Describe the actual work performed.");
  const ref = doc(db, "projects", projectId, "tasks", taskId),
    auditRef = doc(collection(db, "projects", projectId, "taskHistory"));
  const actor = auth.currentUser.uid;
  await runTransaction(db, async (tx) => {
    const task = await tx.get(ref);
    if (!task.exists()) throw new Error("Task no longer exists.");
    if (["complete", "cancelled"].includes(task.data().status))
      throw new Error(
        "Historical completed/cancelled work cannot be rewritten here.",
      );
    if (
      task.data().qcRequired &&
      !input.required &&
      !input.overrideReason.trim()
    )
      throw new Error(
        "Record an owner exception reason before removing required QC.",
      );
    const requiredPassed = input.items
      .filter((i) => i.required)
      .every((i) => i.passed);
    if (input.required && !input.items.some((i) => i.required))
      throw new Error("Add at least one required quality item.");
    const updates = {
      qcRequired: input.required,
      qcPassed: requiredPassed,
      qcChecklist: input.items,
      cureUntil: input.cureUntil,
      completionOverrideReason: input.overrideReason.trim(),
      overrideAuditId: input.overrideReason.trim() ? auditRef.id : null,
      actualDurationMinutes:
        Number(task.data().actualDurationMinutes || 0) + input.workMinutes,
      ...(input.rework ? { status: "rework_required" } : {}),
      updatedAt: serverTimestamp(),
    };
    tx.update(ref, updates);
    tx.set(auditRef, {
      taskId,
      action: input.rework
        ? "require_rework"
        : input.overrideReason.trim()
          ? "owner_exception"
          : "quality_and_work_record",
      reason: input.overrideReason.trim() || input.workNote.trim(),
      workMinutes: input.workMinutes,
      checklist: input.items,
      actor,
      createdAt: serverTimestamp(),
    });
  });
}
