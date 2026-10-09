import type { TaskPhase, TaskStatus, TaskReadinessState, TaskMaterialStatus } from "./task-model";
export const phaseLabels: Record<TaskPhase, string> = {
  "design": "Design",
  "setup": "Setup",
  "demolition": "Demolition",
  "prep": "Prep",
  "rough_in": "Rough-in",
  "waterproofing": "Waterproofing",
  "tile": "Tile",
  "flooring": "Flooring",
  "drywall": "Drywall",
  "paint": "Paint",
  "trim": "Trim",
  "fixtures": "Fixtures",
  "cleanup": "Cleanup",
  "other": "Other"
};
export const statusLabels: Record<TaskStatus, string> = {
  "design": "Design",
  "draft": "Draft",
  "not_ready": "Not ready",
  "ready": "Ready",
  "in_progress": "In progress",
  "blocked": "Blocked",
  "waiting_curing": "Waiting / curing",
  "qc_review": "QC review",
  "complete": "Complete",
  "rework_required": "Rework required",
  "cancelled": "Cancelled"
};
export const readinessLabels: Record<TaskReadinessState, string> = {
  "design": "Design",
  "not_ready": "Not ready",
  "ready": "Ready",
  "blocked": "Blocked",
  "needs_review": "Needs review"
};
export const materialLabels: Record<TaskMaterialStatus, string> = {
  "design": "Design",
  "not_required": "Not required",
  "needed": "Needed",
  "ordered": "Ordered",
  "partial": "Partially Received",
  "received": "Received",
  "stock": "Stock",
  "ready": "Ready",
  "blocked": "Blocked"
};

export function displayLabel(value: string) {
  const aliases: Record<string, string> = { partial: "Partially Received", on_site: "Stock", delivered: "Received", rough_in: "Rough-in", waiting_curing: "Waiting / curing", qc_review: "QC review" };
  return aliases[value] ?? (value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " "));
}
export function materialIsAvailable(status: string) {
  return ["ready", "received", "stock", "on_site", "used"].includes(status);
}
