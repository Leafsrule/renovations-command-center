export type TaskStatus =
  | "design"
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
  | "design"
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

export type TaskReadinessState =
  "design" | "not_ready" | "ready" | "blocked" | "needs_review";

export type TaskBlockerType =
  | "none"
  | "dependency"
  | "material"
  | "site_condition"
  | "labor"
  | "access"
  | "inspection"
  | "client_decision"
  | "weather"
  | "safety"
  | "other";

export type TaskMaterialStatus =
  "design" | "not_required" | "needed" | "ordered" | "partial" | "received" | "stock" | "ready" | "blocked";

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
  dependencyTaskIds: string[];
  helperRequired: boolean;
  estimatedDurationMinutes: number | null;
  actualDurationMinutes: number | null;
  earliestStartDate: string | null;
  dueDate: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  readinessState: TaskReadinessState;
  readinessReasons: string[];
  blockerType: TaskBlockerType;
  blockerNotes: string;
  blockedUntilDate: string | null;
  materialStatus: TaskMaterialStatus;
  materialItems: string[];
  materialNotes: string;
  materialNeededByDate: string | null;
  materialBlockerNotes: string;
  criticalPathRisk: TaskCriticalPathRisk;
  photosRequired: boolean;
  canRunConcurrent: boolean;
  qcChecklist?: { label: string; required: boolean; passed: boolean }[];
  completionOverrideReason?: string;
  requiredItemsReady?: boolean;
  evidenceCount?: number;
  qcRequired?: boolean;
  qcPassed?: boolean;
  cureUntil?: string | null;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type TaskFormInput = {
  expectedUpdatedAt?: string;
  name: string;
  roomId: string;
  phase: TaskPhase;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  championPersonId: string;
  helperPersonIds: string[];
  dependencyTaskIds: string[];
  helperRequired: boolean;
  estimatedDurationMinutes: string;
  earliestStartDate: string;
  dueDate: string;
  notes: string;
  photosRequired: boolean;
  canRunConcurrent: boolean;
  criticalPathRisk: TaskCriticalPathRisk;
  readinessState: TaskReadinessState;
  readinessReasons: string[];
  blockerType: TaskBlockerType;
  blockerNotes: string;
  blockedUntilDate: string;
  materialStatus: TaskMaterialStatus;
  materialItemsText: string;
  materialNotes: string;
  materialNeededByDate: string;
  materialBlockerNotes: string;
};

export type TaskCount = {
  total: number;
};

export function nullableString(value: unknown) {
  const stringValue = String(value || "").trim();

  return stringValue || null;
}

function nullableNumber(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return value;
}

export function formDurationToNumber(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const numericValue = Number(trimmedValue);

  if (!Number.isFinite(numericValue)) {
    throw new Error("Estimated duration must be a number of minutes.");
  }

  const parsedValue = parseInt(trimmedValue, 10);

  if (parsedValue < 0) {
    throw new Error("Estimated duration cannot be negative.");
  }

  return parsedValue;
}

export function parseMaterialItems(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  ];
}

function statusFromValue(value: unknown): TaskStatus {
  const status = String(value || "draft");

  if (
    status === "design" ||
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
    phase === "design" ||
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

function readinessFromValue(value: unknown): TaskReadinessState {
  const readinessState = String(value || "not_ready");

  if (
    readinessState === "design" ||
    readinessState === "not_ready" ||
    readinessState === "ready" ||
    readinessState === "blocked" ||
    readinessState === "needs_review"
  ) {
    return readinessState;
  }

  return "not_ready";
}

function blockerTypeFromValue(value: unknown): TaskBlockerType {
  const blockerType = String(value || "none");

  if (
    blockerType === "none" ||
    blockerType === "dependency" ||
    blockerType === "material" ||
    blockerType === "site_condition" ||
    blockerType === "labor" ||
    blockerType === "access" ||
    blockerType === "inspection" ||
    blockerType === "client_decision" ||
    blockerType === "weather" ||
    blockerType === "safety" ||
    blockerType === "other"
  ) {
    return blockerType;
  }

  return "none";
}

function materialStatusFromValue(value: unknown): TaskMaterialStatus {
  if (
    value === "design" ||
    value === "received" ||
    value === "stock" ||
    value === "not_required" ||
    value === "needed" ||
    value === "ordered" ||
    value === "partial" ||
    value === "ready" ||
    value === "blocked"
  ) {
    return value;
  }

  return "not_required";
}

function riskFromValue(value: unknown): TaskCriticalPathRisk {
  const risk = String(value || "none");

  if (risk === "low" || risk === "medium" || risk === "high") {
    return risk;
  }

  return "none";
}

export function toTask(
  id: string,
  data: Record<string, unknown>,
): RenovationTask {
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
    dependencyTaskIds: Array.isArray(data.dependencyTaskIds)
      ? data.dependencyTaskIds.filter(
          (dependencyId): dependencyId is string =>
            typeof dependencyId === "string",
        )
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
      ? data.readinessReasons.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
    blockerType: blockerTypeFromValue(data.blockerType),
    blockerNotes:
      typeof data.blockerNotes === "string" ? data.blockerNotes : "",
    blockedUntilDate:
      typeof data.blockedUntilDate === "string" && data.blockedUntilDate !== ""
        ? data.blockedUntilDate
        : null,
    materialStatus: materialStatusFromValue(data.materialStatus),
    materialItems: Array.isArray(data.materialItems)
      ? data.materialItems.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
    materialNotes:
      typeof data.materialNotes === "string" ? data.materialNotes : "",
    materialNeededByDate:
      typeof data.materialNeededByDate === "string" &&
      data.materialNeededByDate !== ""
        ? data.materialNeededByDate
        : null,
    materialBlockerNotes:
      typeof data.materialBlockerNotes === "string"
        ? data.materialBlockerNotes
        : "",
    criticalPathRisk: riskFromValue(data.criticalPathRisk),
    photosRequired: Boolean(data.photosRequired),
    canRunConcurrent: Boolean(data.canRunConcurrent),
    qcChecklist: Array.isArray(data.qcChecklist) ? data.qcChecklist : [],
    completionOverrideReason: String(data.completionOverrideReason || ""),
    requiredItemsReady:
      typeof data.requiredItemsReady === "boolean"
        ? data.requiredItemsReady
        : undefined,
    evidenceCount: Number(data.evidenceCount || 0),
    qcRequired: Boolean(data.qcRequired),
    qcPassed: Boolean(data.qcPassed),
    cureUntil: nullableString(data.cureUntil),
    notes: String(data.notes || ""),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}
