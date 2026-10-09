import { materialIsAvailable } from "../terminology";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { Bucket } from "@google-cloud/storage";
import { privatePhotoStore, PHOTO_TYPES, PHOTO_LIMIT, photoHash, type PhotoStore } from "./photo-store";
import { createHash } from "node:crypto";
import {
  CommandError,
  parseTaskCommand,
  taskRevision,
  validId,
} from "../task-command";
import { toTask } from "../task-model";
import { evaluateTaskTransition } from "../task-execution";
import {
  calendarMinutes,
  DEFAULT_CALENDAR,
  validateCalendar,
} from "../calendar";
import { getTodayDateString } from "../scheduling";
import { assignedWorkMinutes } from "../person-availability";

export async function runTaskCommand(
  db: Firestore,
  bucket: Bucket | PhotoStore,
  owner: string,
  projectId: string,
  taskId: string,
  value: unknown,
) {
  if (!validId(projectId) || !validId(taskId))
    throw new CommandError(400, "Invalid project or task.");
  const command = parseTaskCommand(value);
  const photos = privatePhotoStore(bucket);
  const projectRef = db.doc(`projects/${projectId}`);
  const taskRef = projectRef.collection("tasks").doc(taskId);
  const receiptRef = projectRef
    .collection("commandReceipts")
    .doc(command.commandId);
  const historyRef = projectRef
    .collection("taskHistory")
    .doc(command.commandId);
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ taskId, command }))
    .digest("hex");
  // Check ownership before looking at private Storage objects, then recheck in the transaction.
  const project = await projectRef.get();
  if (!project.exists || project.data()?.ownerUserId !== owner || project.data()?.deletedAt)
    throw new CommandError(403, "Project is unavailable.");
  const acknowledged = await receiptRef.get();
  if (acknowledged.exists) {
    if (
      acknowledged.data()?.actor !== owner ||
      acknowledged.data()?.fingerprint !== fingerprint
    )
      throw new CommandError(
        409,
        "Command ID was already used for a different change.",
      );
    return acknowledged.data()!.result;
  }
  const evidenceQuery = taskRef.parent
    .parent!.collection("evidence")
    .where("taskId", "==", taskId);
  const evidenceSnapshot =
    command.kind === "action" && command.action === "complete"
      ? await evidenceQuery.get()
      : null;
  const verifiedEvidence = new Map<string, string>();
  if (evidenceSnapshot) {
    for (const entry of evidenceSnapshot.docs) {
      const path = `projects/${projectId}/evidence/${entry.id}`;
      if (entry.data().path !== path) continue;
      try {
        const metadata = await photos.info(path);
        if (
          metadata.metadata?.taskId === taskId &&
          metadata.metadata?.uploadedBy === owner &&
          metadata.version === entry.data().generation &&
          !metadata.metadata.firebaseStorageDownloadTokens &&
          PHOTO_TYPES.includes(metadata.contentType) &&
          metadata.size > 0 && metadata.size < PHOTO_LIMIT
        )
          { await photos.read(path, metadata.version); verifiedEvidence.set(entry.id, metadata.version); }
      } catch {
        /* Missing/unreadable evidence is not completion proof. */
      }
    }
  }
  let upload:
    | { path: string; generation: string; size: number; contentType: string }
    | undefined;
  if (command.kind === "evidence") {
    const path = `projects/${projectId}/evidence/${command.evidenceId}`;
    const temporary = `projects/${projectId}/evidence-staging/${command.evidenceId}`;
    let metadata;
    try { metadata = await photos.info(path); }
    catch (e) {
      if ((e as { code?: number }).code !== 404) throw e;
      const source = await photos.info(temporary).catch(() => {
        throw new CommandError(400, "Uploaded media is unavailable. Retry after upload finishes.");
      });
      if (!source.version || source.metadata.taskId !== taskId || source.metadata.uploadedBy !== owner
        || !PHOTO_TYPES.includes(source.contentType) || source.size <= 0 || source.size >= PHOTO_LIMIT)
        throw new CommandError(400, "Media failed private-object verification.");
      const bytes = await photos.read(temporary, source.version);
      try { await photos.create(path, bytes, source.contentType, { taskId, uploadedBy: owner, sourceGeneration: source.version, sha256: photoHash(bytes) }); }
      catch (error) { if ((error as {code?: number}).code !== 412) throw error; }
      metadata = await photos.info(path);
    }
    if (!metadata.version || metadata.metadata.taskId !== taskId || metadata.metadata.uploadedBy !== owner
      || metadata.metadata.firebaseStorageDownloadTokens || !PHOTO_TYPES.includes(metadata.contentType)
      || metadata.size <= 0 || metadata.size >= PHOTO_LIMIT)
      throw new CommandError(400, "Private media verification failed.");
    await photos.read(path, metadata.version);
    await photos.removeStaging(temporary);
    upload = {
      path,
      generation: metadata.version,
      size: Number(metadata.size),
      contentType: metadata.contentType!,
    };
  }
  return db.runTransaction(async (tx) => {
    const [
      ownedProject,
      receipt,
      snapshot,
      tasks,
      settings,
      evidence,
      materials,
      tools,
      people,
    ] = await Promise.all([
      tx.get(projectRef),
      tx.get(receiptRef),
      tx.get(taskRef),
      tx.get(projectRef.collection("tasks")),
      tx.get(projectRef.collection("settings").doc("planning")),
      tx.get(evidenceQuery),
      tx.get(projectRef.collection("materials")),
      tx.get(projectRef.collection("tools")),
      tx.get(projectRef.collection("people")),
    ]);
    if (!ownedProject.exists || ownedProject.data()?.ownerUserId !== owner || ownedProject.data()?.deletedAt)
      throw new CommandError(403, "Project is unavailable.");
    if (receipt.exists) {
      if (
        receipt.data()?.actor !== owner ||
        receipt.data()?.fingerprint !== fingerprint
      )
        throw new CommandError(
          409,
          "Command ID was already used for a different change.",
        );
      return receipt.data()!.result;
    }
    if (!snapshot.exists || snapshot.data()?.deletedAt) throw new CommandError(404, "Task no longer exists.");
    if (tasks.size > 400)
      throw new CommandError(
        400,
        "Project exceeds the safe task transaction limit.",
      );
    const task = toTask(taskId, snapshot.data()!);
    if (
      command.kind !== "evidence" &&
      taskRevision(task.updatedAt) !== command.expectedRevision
    )
      throw new CommandError(
        409,
        "CONFLICT: Task changed on another device. Reload and compare your draft.",
      );
    const timestamp = FieldValue.serverTimestamp();
    let updates: Record<string, unknown>;
    let result: unknown = { allowed: true, updates: {}, reason: "Saved." };
    let action: string = command.kind;
    let reason = "";
    if (command.kind === "action") {
      // Neither task-universe, dates, evidence counts nor availability aggregates are trusted from the browser.
      const universe = tasks.docs.filter(d=>!d.data().deletedAt).map((d) => toTask(d.id, d.data()));
      const linkedMaterials = materials.docs.filter(
        (d) => !d.data().deletedAt && d.data().taskId === taskId,
      );
      const linkedTools = tools.docs.filter((d) => !d.data().deletedAt && d.data().taskId === taskId);
      task.requiredItemsReady =
        linkedMaterials.every((d) =>
          materialIsAvailable(d.data().status),
        ) && linkedTools.every((d) => d.data().status === "available");
      task.evidenceCount = evidence.docs.filter(
        (d) => verifiedEvidence.get(d.id) === d.data().generation,
      ).length;
      const overrideId = snapshot.data()?.overrideAuditId;
      const override =
        typeof overrideId === "string" && validId(overrideId)
          ? await tx.get(projectRef.collection("taskHistory").doc(overrideId))
          : null;
      if (
        !override?.exists ||
        override.data()?.action !== "owner_exception" ||
        override.data()?.taskId !== taskId ||
        override.data()?.reason !== task.completionOverrideReason ||
        override.data()?.actor !== owner
      )
        task.completionOverrideReason = "";
      const requiredChecks = (task.qcChecklist ?? []).filter((i) => i.required);
      task.qcPassed =
        requiredChecks.length > 0 &&
        requiredChecks.every((i) => i.passed === true);
      const today = getTodayDateString();
      if (["start", "resume"].includes(command.action)) {
        const calendar = settings.data()?.calendar
          ? validateCalendar(settings.data()!.calendar)
          : DEFAULT_CALENDAR;
        if (calendarMinutes(today, calendar) <= 0)
          throw new CommandError(
            409,
            "Today is outside the project work calendar.",
          );
        if (task.cureUntil && Date.parse(task.cureUntil) > Date.now())
          throw new CommandError(409, "The curing period has not ended.");
        if (assignedWorkMinutes(task,people.docs.filter(d=>!d.data().deletedAt).map(d=>({id:d.id,active:d.data().active===true,availability:d.data().availability})),today,calendar) <= 0)
          throw new CommandError(409,"Assigned worker/helper availability is unknown or unavailable today. Update the person calendar before starting.");
        if (
          task.helperRequired &&
          (!command.helperAvailable ||
            task.helperPersonIds.some(
              (id) =>
                !people.docs.filter(d=>!d.data().deletedAt).some(
                  (d) => d.id === id && d.data().active === true,
                ),
            ))
        )
          throw new CommandError(
            409,
            "Confirm an active assigned helper is available today.",
          );
      }
      const transition = evaluateTaskTransition(task, command.action, {
        tasks: universe,
        today,
        helperAvailable: command.helperAvailable,
        blocker: command.blocker,
      });
      if (!transition.allowed) throw new CommandError(409, transition.reason);
      result = transition;
      updates = { ...transition.updates };
      action = command.action;
      reason =
        command.blocker?.blockerNotes.trim() ||
        task.completionOverrideReason ||
        "";
    } else if (command.kind === "quality") {
      if (["complete", "cancelled"].includes(task.status))
        throw new CommandError(
          409,
          "Historical completed/cancelled work cannot be rewritten here.",
        );
      const i = command.input;
      if (task.qcRequired && !i.required && !i.overrideReason.trim())
        throw new CommandError(
          400,
          "Record an owner exception before removing required QC.",
        );
      const checks = i.items.filter((item) => item.required);
      updates = {
        qcRequired: i.required,
        qcPassed: checks.length > 0 && checks.every((item) => item.passed),
        qcChecklist: i.items,
        cureUntil: i.cureUntil,
        completionOverrideReason: i.overrideReason.trim(),
        overrideAuditId: i.overrideReason.trim() ? historyRef.id : null,
        actualDurationMinutes:
          Number(task.actualDurationMinutes || 0) + i.workMinutes,
        ...(i.rework ? { status: "rework_required" } : {}),
      };
      action = i.overrideReason.trim()
        ? "owner_exception"
        : i.rework
          ? "require_rework"
          : "quality_and_work_record";
      reason = i.overrideReason.trim() || i.workNote.trim();
    } else {
      const ref = projectRef.collection("evidence").doc(command.evidenceId);
      const existing = evidence.docs.find((d) => d.id === command.evidenceId);
      if (existing)
        throw new CommandError(
          409,
          "Media was already linked by another command.",
        );
      tx.create(ref, {
        taskId,
        caption: command.caption.trim(),
        category: command.category,
        ...upload!,
        uploadedBy: owner,
        createdAt: timestamp,
      });
      updates = { evidenceCount: evidence.size + 1 };
    }
    tx.update(taskRef, { ...updates, updatedAt: timestamp });
    tx.create(historyRef, {
      taskId,
      taskName: task.name,
      action,
      fromStatus: task.status,
      toStatus: updates.status ?? task.status,
      actor: owner,
      createdAt: timestamp,
      reason,
      ...(command.kind === "quality"
        ? {
            workMinutes: command.input.workMinutes,
            workNote: command.input.workNote.trim(),
            checklist: command.input.items,
          }
        : {}),
      ...(command.kind === "action"
        ? { helperAvailable: command.helperAvailable }
        : {}),
    });
    tx.create(receiptRef, {
      actor: owner,
      taskId,
      fingerprint,
      result,
      createdAt: timestamp,
    });
    return result;
  });
}
