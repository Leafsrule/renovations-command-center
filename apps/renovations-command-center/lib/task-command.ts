import type { TaskExecutionAction, TaskBlockerInput } from "./task-execution";
export type QualityItem = { label: string; required: boolean; passed: boolean };
export type QualityInput = {
  items: QualityItem[];
  required: boolean;
  cureUntil: string | null;
  overrideReason: string;
  workMinutes: number;
  workNote: string;
  rework: boolean;
};
export type TaskCommand = { commandId: string } & (
  | {
      kind: "action";
      action: TaskExecutionAction;
      expectedRevision: string;
      helperAvailable: boolean;
      blocker?: TaskBlockerInput;
    }
  | { kind: "quality"; expectedRevision: string; input: QualityInput }
  | { kind: "evidence"; evidenceId: string; caption: string; category: string }
);
export class CommandError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function taskRevision(value: unknown): string {
  if (
    value &&
    typeof value === "object" &&
    "seconds" in value &&
    "nanoseconds" in value
  )
    return `${value.seconds}:${value.nanoseconds}`;
  return "none";
}
export function validId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
}
export function parseTaskCommand(value: unknown): TaskCommand {
  if (!value || typeof value !== "object")
    throw new CommandError(400, "Invalid command.");
  const c = value as TaskCommand;
  if (!validId(c.commandId)) throw new CommandError(400, "Invalid command ID.");
  if (c.kind === "evidence") {
    if (
      !validId(c.evidenceId) ||
      typeof c.caption !== "string" ||
      c.caption.length > 2000 ||
      !["Before", "During", "After", "Issue", "Receipt", "Inspection"].includes(
        c.category,
      )
    )
      throw new CommandError(400, "Invalid evidence details.");
    return c;
  }
  if (typeof c.expectedRevision !== "string" || c.expectedRevision.length > 100)
    throw new CommandError(400, "Task revision required.");
  if (c.kind === "action") {
    if (
      ![
        "start",
        "resume",
        "pause",
        "mark_waiting",
        "complete",
        "block",
        "clear_blocker",
      ].includes(c.action) ||
      typeof c.helperAvailable !== "boolean"
    )
      throw new CommandError(400, "Invalid task action.");
    if (
      c.action === "block" &&
      (!c.blocker ||
        ![
          "dependency",
          "material",
          "site_condition",
          "labor",
          "access",
          "inspection",
          "client_decision",
          "weather",
          "safety",
          "other",
        ].includes(c.blocker.blockerType) ||
        typeof c.blocker.blockerNotes !== "string" ||
        !c.blocker.blockerNotes.trim() ||
        c.blocker.blockerNotes.length > 2000)
    )
      throw new CommandError(400, "Choose a blocker and describe it.");
    if (
      c.blocker?.blockedUntilDate &&
      !/^\d{4}-\d{2}-\d{2}$/.test(c.blocker.blockedUntilDate)
    )
      throw new CommandError(400, "Invalid blocker date.");
    return c;
  }
  if (c.kind !== "quality") throw new CommandError(400, "Unknown command.");
  const i = c.input;
  if (
    !i ||
    !Array.isArray(i.items) ||
    i.items.length > 50 ||
    i.items.some(
      (item) =>
        !item ||
        typeof item.label !== "string" ||
        !item.label.trim() ||
        item.label.length > 500 ||
        typeof item.required !== "boolean" ||
        typeof item.passed !== "boolean",
    ) ||
    typeof i.required !== "boolean" ||
    typeof i.rework !== "boolean" ||
    typeof i.overrideReason !== "string" ||
    i.overrideReason.length > 2000 ||
    typeof i.workNote !== "string" ||
    i.workNote.length > 4000 ||
    !Number.isInteger(i.workMinutes) ||
    i.workMinutes < 0 ||
    i.workMinutes > 1440
  )
    throw new CommandError(400, "Invalid quality/work record.");
  if (i.workMinutes > 0 && !i.workNote.trim())
    throw new CommandError(400, "Describe the work performed.");
  if (i.required && !i.items.some((item) => item.required))
    throw new CommandError(400, "Add a required quality item.");
  if (
    i.cureUntil !== null &&
    (typeof i.cureUntil !== "string" ||
      !/(Z|[+-]\d{2}:\d{2})$/.test(i.cureUntil) ||
      !Number.isFinite(Date.parse(i.cureUntil)))
  )
    throw new CommandError(400, "Curing time must include a timezone.");
  return c;
}
