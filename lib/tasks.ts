import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type TaskStatus =
  | "draft"
  | "not_ready"
  | "ready"
  | "in_progress"
  | "blocked"
  | "waiting_curing"
  | "qc_review"
  | "complete"
  | "rework_required"
  | "cancelled";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskPhase =
  | "setup"
  | "demolition"
  | "prep"
  | "rough_in"
  | "waterproofing"
  | "tile"
  | "flooring"
  | "drywall"
  | "paint"
  | "trim"
  | "fixtures"
  | "cleanup"
  | "other";

export type ReadinessState = "not_ready" | "ready";

export type TaskCriticalPathRisk = "none" | "low" | "medium" | "high";

export type RenovationTask = {
  id: string;
  name: string;
  roomId: string | null;
  phase: TaskPhase;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  championPersonId: string | null;
  helperPersonIds: string[];
  helperRequired: boolean;
  estimatedDurationMinutes: number | null;
  actualDurationMinutes: number | null;
  earliestStartDate: string | null;
  dueDate: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  readinessState: string;
  readinessReasons: string[];
  criticalPathRisk: TaskCriticalPathRisk;
  photosRequired: boolean;
  canRunConcurrent: boolean;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type TaskFormInput = {
  name: string;
  roomId: string;
  phase: TaskPhase;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  championPersonId: string;
  helperPersonIds: string[];
  helperRequired: boolean;
  estimatedDurationMinutes: string;
  earliestStartDate: string;
  dueDate: string;
  notes: string;
  photosRequired: boolean;
  canRunConcurrent: boolean;
  criticalPathRisk: TaskCriticalPathRisk;
};

export type TaskCount = {
  total: number;
};

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

function nullableString(value: unknown) {
  const stringValue = String(value || "").trim();

  return stringValue || null;
}

function nullableNumber(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return value;
}

function formDurationToNumber(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const parsedValue = parseInt(trimmedValue, 10);

  return Number.isNaN(parsedValue) ? null : parsedValue;
}

function statusFromValue(value: unknown): TaskStatus {
  const status = String(value || "draft");

  if (
    status === "draft" ||
    status === "not_ready" ||
    status === "ready" ||
    status === "in_progress" ||
    status === "blocked" ||
    status === "waiting_curing" ||
    status === "qc_review" ||
    status === "complete" ||
    status === "rework_required" ||
    status === "cancelled"
  ) {
    return status;
  }

  return "draft";
}

function priorityFromValue(value: unknown): TaskPriority {
  const priority = String(value || "medium");

  if (
    priority === "low" ||
    priority === "medium" ||
    priority === "high" ||
    priority === "urgent"
  ) {
    return priority;
  }

  return "medium";
}

function phaseFromValue(value: unknown): TaskPhase {
  const phase = String(value || "setup");

  if (
    phase === "setup" ||
    phase === "demolition" ||
    phase === "prep" ||
    phase === "rough_in" ||
    phase === "waterproofing" ||
    phase === "tile" ||
    phase === "flooring" ||
    phase === "drywall" ||
    phase === "paint" ||
    phase === "trim" ||
    phase === "fixtures" ||
    phase === "cleanup" ||
    phase === "other"
  ) {
    return phase;
  }

  return "setup";
}

function readinessFromValue(value: unknown): ReadinessState {
  return value === "ready" ? "ready" : "not_ready";
}

function riskFromValue(value: unknown): TaskCriticalPathRisk {
  const risk = String(value || "none");

  if (risk === "low" || risk === "medium" || risk === "high") {
    return risk;
  }

  return "none";
}

function toTask(id: string, data: Record<string, unknown>): RenovationTask {
  return {
    id,
    name: String(data.name || ""),
    roomId: nullableString(data.roomId),
    phase: phaseFromValue(data.phase),
    description: String(data.description || ""),
    status: statusFromValue(data.status),
    priority: priorityFromValue(data.priority),
    championPersonId: nullableString(data.championPersonId),
    helperPersonIds: Array.isArray(data.helperPersonIds)
      ? data.helperPersonIds.map(String)
      : [],
    helperRequired: Boolean(data.helperRequired),
    estimatedDurationMinutes: nullableNumber(data.estimatedDurationMinutes),
    actualDurationMinutes: nullableNumber(data.actualDurationMinutes),
    earliestStartDate: nullableString(data.earliestStartDate),
    dueDate: nullableString(data.dueDate),
    scheduledStart: nullableString(data.scheduledStart),
    scheduledEnd: nullableString(data.scheduledEnd),
    readinessState: readinessFromValue(data.readinessState),
    readinessReasons: Array.isArray(data.readinessReasons)
      ? data.readinessReasons.map(String)
      : [],
    criticalPathRisk: riskFromValue(data.criticalPathRisk),
    photosRequired: Boolean(data.photosRequired),
    canRunConcurrent: Boolean(data.canRunConcurrent),
    notes: String(data.notes || ""),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
}

export function taskFormToDuration(value: string) {
  return formDurationToNumber(value);
}

export async function listProjectTasks(projectId: string) {
  const snapshot = await getDocs(tasksCollection(projectId));
  const tasks = snapshot.docs.map((taskDoc) =>
    toTask(taskDoc.id, taskDoc.data())
  );

  return tasks.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getProjectTask(projectId: string, taskId: string) {
  const taskDoc = await getDoc(taskDocument(projectId, taskId));

  if (!taskDoc.exists()) {
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
  await addDoc(tasksCollection(projectId), {
    name: input.name.trim(),
    roomId: nullableString(input.roomId),
    phase: input.phase || "setup",
    description: input.description.trim(),
    status: input.status || "draft",
    priority: input.priority || "medium",
    championPersonId: nullableString(input.championPersonId),
    helperPersonIds: input.helperPersonIds,
    helperRequired: input.helperRequired,
    estimatedDurationMinutes: formDurationToNumber(
      input.estimatedDurationMinutes
    ),
    actualDurationMinutes: null,
    earliestStartDate: nullableString(input.earliestStartDate),
    dueDate: nullableString(input.dueDate),
    scheduledStart: null,
    scheduledEnd: null,
    readinessState: "not_ready",
    readinessReasons: [],
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
  await updateDoc(taskDocument(projectId, taskId), {
    name: input.name.trim(),
    roomId: nullableString(input.roomId),
    phase: input.phase,
    description: input.description.trim(),
    status: input.status,
    priority: input.priority,
    championPersonId: nullableString(input.championPersonId),
    helperPersonIds: input.helperPersonIds,
    helperRequired: input.helperRequired,
    estimatedDurationMinutes: formDurationToNumber(
      input.estimatedDurationMinutes
    ),
    earliestStartDate: nullableString(input.earliestStartDate),
    dueDate: nullableString(input.dueDate),
    criticalPathRisk: input.criticalPathRisk,
    photosRequired: input.photosRequired,
    canRunConcurrent: input.canRunConcurrent,
    notes: input.notes.trim(),
    updatedAt: serverTimestamp()
  });
}
