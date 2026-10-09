import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp
} from "firebase/firestore";
import { validateTaskEdit } from "./task-integrity";
import { db } from "@/lib/firebase";
import {
  type TaskExecutionAction,
  type TaskTransitionContext
} from "@/lib/task-execution";

import { toTask, nullableString, formDurationToNumber, parseMaterialItems, type RenovationTask, type TaskFormInput, type TaskCount } from "./task-model";
import { sendTaskCommand } from "./task-command-client";
import { taskRevision } from "./task-command";
export * from "./task-model";

function requireDb() {
  if (!db) {
    throw new Error(
      "Firestore is not configured yet. Check your Firebase values in .env.local."
    );
  }

  return db;
}

function tasksCollection(projectId: string) {
  return collection(requireDb(), "projects", projectId, "tasks");
}

function taskDocument(projectId: string, taskId: string) {
  return doc(requireDb(), "projects", projectId, "tasks", taskId);
}

export function taskFormToDuration(value: string) {
  return formDurationToNumber(value);
}

export async function listProjectTasks(projectId: string) {
  const snapshot = await getDocs(tasksCollection(projectId));
  const tasks = snapshot.docs.filter(d=>!d.data().deletedAt).map((taskDoc) =>
    toTask(taskDoc.id, taskDoc.data())
  );

  return tasks.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getProjectTask(projectId: string, taskId: string) {
  const taskDoc = await getDoc(taskDocument(projectId, taskId));

  if (!taskDoc.exists() || taskDoc.data()?.deletedAt) {
    return null;
  }

  return toTask(taskDoc.id, taskDoc.data());
}

export async function countProjectTasks(
  projectId: string
): Promise<TaskCount> {
  const tasks = await listProjectTasks(projectId);

  return {
    total: tasks.length
  };
}

export async function createProjectTask(
  projectId: string,
  input: TaskFormInput
) {
  validateTaskEdit(input, await listProjectTasks(projectId));
  await addDoc(tasksCollection(projectId), {
    name: input.name.trim(),
    roomId: nullableString(input.roomId),
    phase: input.phase || "setup",
    description: input.description.trim(),
    status: input.status || "draft",
    priority: input.priority || "medium",
    championPersonId: nullableString(input.championPersonId),
    helperPersonIds: input.helperPersonIds,
    dependencyTaskIds: [...new Set(input.dependencyTaskIds)],
    helperRequired: input.helperRequired,
    estimatedDurationMinutes: formDurationToNumber(
      input.estimatedDurationMinutes
    ),
    actualDurationMinutes: null,
    earliestStartDate: nullableString(input.earliestStartDate),
    dueDate: nullableString(input.dueDate),
    scheduledStart: null,
    scheduledEnd: null,
    readinessState: input.readinessState,
    readinessReasons: [...new Set(input.readinessReasons)],
    blockerType: input.blockerType,
    blockerNotes: input.blockerNotes.trim(),
    blockedUntilDate: input.blockedUntilDate || null,
    materialStatus: input.materialStatus,
    materialItems: parseMaterialItems(input.materialItemsText),
    materialNotes: input.materialNotes.trim(),
    materialNeededByDate: input.materialNeededByDate || null,
    materialBlockerNotes: input.materialBlockerNotes.trim(),
    criticalPathRisk: input.criticalPathRisk || "none",
    photosRequired: input.photosRequired,
    canRunConcurrent: input.canRunConcurrent,
    notes: input.notes.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateProjectTask(
  projectId: string,
  taskId: string,
  input: TaskFormInput
) {
  const knownTasks = await listProjectTasks(projectId);
  const updates = {
    name: input.name.trim(),
    roomId: nullableString(input.roomId),
    phase: input.phase,
    description: input.description.trim(),
    status: input.status,
    priority: input.priority,
    championPersonId: nullableString(input.championPersonId),
    helperPersonIds: input.helperPersonIds,
    dependencyTaskIds: [...new Set(input.dependencyTaskIds)],
    helperRequired: input.helperRequired,
    estimatedDurationMinutes: formDurationToNumber(
      input.estimatedDurationMinutes
    ),
    earliestStartDate: nullableString(input.earliestStartDate),
    dueDate: nullableString(input.dueDate),
    readinessState: input.readinessState,
    readinessReasons: [...new Set(input.readinessReasons)],
    blockerType: input.blockerType,
    blockerNotes: input.blockerNotes.trim(),
    blockedUntilDate: input.blockedUntilDate || null,
    materialStatus: input.materialStatus,
    materialItems: parseMaterialItems(input.materialItemsText),
    materialNotes: input.materialNotes.trim(),
    materialNeededByDate: input.materialNeededByDate || null,
    materialBlockerNotes: input.materialBlockerNotes.trim(),
    criticalPathRisk: input.criticalPathRisk,
    photosRequired: input.photosRequired,
    canRunConcurrent: input.canRunConcurrent,
    notes: input.notes.trim(),
    updatedAt: serverTimestamp()
  };
  await runTransaction(requireDb(), async transaction => {
    const snapshots = await Promise.all(knownTasks.map(task => transaction.get(taskDocument(projectId,task.id))));
    const tasks = snapshots.filter(snapshot => snapshot.exists()).map(snapshot=>toTask(snapshot.id,snapshot.data()!));
    const current = tasks.find(task=>task.id===taskId);
    if (!current) throw new Error("Task is unavailable.");
    if (input.expectedUpdatedAt !== JSON.stringify(current.updatedAt ?? null)) throw new Error("Task changed since this draft was opened. Reload and compare your draft before saving.");
    validateTaskEdit(input,tasks,current);
    transaction.update(taskDocument(projectId,taskId),updates);
  });
}

export async function executeProjectTaskAction(
  projectId: string,
  task: RenovationTask,
  action: TaskExecutionAction,
  context: TaskTransitionContext
) {
  const transition = await sendTaskCommand(projectId, task.id, {
    kind: "action", action, expectedRevision: taskRevision(task.updatedAt),
    helperAvailable: context.helperAvailable === true, blocker: context.blocker,
  });
  const refreshedTask = await getProjectTask(projectId, task.id);
  if (!refreshedTask) throw new Error("Task was updated but could not be refreshed.");
  return {task:refreshedTask,transition};
}
