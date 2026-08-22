export type ValidationState = "pending" | "pass" | "warning" | "fail";
export type ApprovalState = "draft" | "pending" | "approved" | "declined" | "superseded";

export type MeasurementRecord = {
  id: string;
  projectId: string;
  roomId: string | null;
  taskId: string | null;
  label: string;
  feet: number | null;
  inches: number | null;
  decimalFeet: number | null;
  tolerance: number | null;
  unit: "in" | "ft" | "mm" | "cm";
  validationState: ValidationState;
  recheckRequired: boolean;
  photoEvidenceIds: string[];
  notes: string;
};

export type PhotoRequirement = {
  id: string;
  projectId: string;
  roomId: string | null;
  taskId: string | null;
  category: "before" | "during" | "after" | "issue" | "material" | "receipt" | "inspection";
  label: string;
  required: boolean;
  captured: boolean;
  evidenceIds: string[];
};

export type MaterialRecord = {
  id: string;
  projectId: string;
  taskIds: string[];
  name: string;
  quantity: number | null;
  unit: string;
  status: "needed" | "ordered" | "purchased" | "picked_up" | "delivered" | "on_site" | "missing" | "used";
  requiredBy: string | null;
  supplier: string;
  cost: number | null;
  evidenceIds: string[];
  notes: string;
};

export type DecisionRecord = {
  id: string;
  projectId: string;
  title: string;
  decision: string;
  state: ApprovalState;
  affectedTaskIds: string[];
  evidenceIds: string[];
  supersedesDecisionId: string | null;
};

export type CoordinatePoint = {
  id: string;
  projectId: string;
  roomId: string | null;
  label: string;
  x: number;
  y: number;
  z: number | null;
  unit: "in" | "ft" | "mm" | "cm";
  datum: string;
  validationState: ValidationState;
  notes: string;
};

export type ValidationCheck = {
  id: string;
  projectId: string;
  entityType: "task" | "measurement" | "coordinate" | "dimension" | "material" | "photo";
  entityId: string;
  rule: string;
  state: ValidationState;
  message: string;
  checkedAt: string;
};

export type SyncAuditLog = {
  id: string;
  projectId: string;
  source: "excel" | "google_sheets" | "google_drive" | "google_calendar" | "gmail" | "firestore";
  direction: "import" | "export" | "bidirectional";
  entityType: string;
  sourceRecordId: string;
  destinationRecordId: string | null;
  state: "success" | "warning" | "failure";
  message: string;
  createdAt: string;
};

export const favoriteOperationalModules = [
  { slug: "measurements", title: "Measurements", description: "Field measurements, tolerance checks, evidence, and recheck queues." },
  { slug: "photos", title: "Photos & files", description: "Camera-first evidence organized by task, room, date, and category." },
  { slug: "materials", title: "Materials", description: "Material readiness, required dates, linked tasks, and blocker impact." },
  { slug: "decisions", title: "Decisions & approvals", description: "Revision history, pending approvals, sign-off, and evidence links." },
  { slug: "coordinates", title: "Coordinates & validation", description: "Control points, dimensions, discrepancy checks, and required actions." }
] as const;
