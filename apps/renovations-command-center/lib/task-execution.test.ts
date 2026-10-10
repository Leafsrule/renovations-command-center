import { describe, expect, it } from "vitest";
import {
  evaluateTaskTransition,
  type TaskExecutionAction,
  type TaskTransitionContext
} from "./task-execution";
import type { RenovationTask } from "./tasks";

const today = "2026-06-15";

function createTask(partial: Partial<RenovationTask> = {}): RenovationTask {
  return {
    id: partial.id ?? "task-1",
    name: partial.name ?? "Set bathroom vanity",
    roomId: partial.roomId ?? null,
    phase: partial.phase ?? "fixtures",
    description: partial.description ?? "",
    status: partial.status ?? "ready",
    priority: partial.priority ?? "medium",
    championPersonId: partial.championPersonId ?? null,
    helperPersonIds: partial.helperPersonIds ?? (partial.helperRequired ? ["assigned-helper"] : []),
    dependencyTaskIds: partial.dependencyTaskIds ?? [],
    helperRequired: partial.helperRequired ?? false,
    estimatedDurationMinutes: partial.estimatedDurationMinutes ?? 90,
    actualDurationMinutes: partial.actualDurationMinutes ?? null,
    earliestStartDate: partial.earliestStartDate ?? null,
    dueDate: partial.dueDate ?? null,
    scheduledStart: partial.scheduledStart ?? null,
    scheduledEnd: partial.scheduledEnd ?? null,
    readinessState: partial.readinessState ?? "ready",
    readinessReasons: partial.readinessReasons ?? [],
    blockerType: partial.blockerType ?? "none",
    blockerNotes: partial.blockerNotes ?? "",
    blockedUntilDate: partial.blockedUntilDate ?? null,
    materialStatus: partial.materialStatus ?? "ready",
    materialItems: partial.materialItems ?? [],
    materialNotes: partial.materialNotes ?? "",
    materialNeededByDate: partial.materialNeededByDate ?? null,
    materialBlockerNotes: partial.materialBlockerNotes ?? "",
    criticalPathRisk: partial.criticalPathRisk ?? "none",
    photosRequired: partial.photosRequired ?? false,
    evidenceCount: partial.evidenceCount,
    qcRequired: partial.qcRequired,
    qcPassed: partial.qcPassed,
    cureUntil: partial.cureUntil,
    canRunConcurrent: partial.canRunConcurrent ?? false,
    notes: partial.notes ?? ""
  };
}

function evaluate(
  task: RenovationTask,
  action: TaskExecutionAction,
  context: Partial<TaskTransitionContext> = {}
) {
  return evaluateTaskTransition(task, action, {
    tasks: context.tasks ?? [task],
    today,
    helperAvailable: context.helperAvailable,
    blocker: context.blocker
  });
}

describe("task execution transitions", () => {
  it("starts a ready task", () => {
    expect(evaluate(createTask(), "start")).toMatchObject({
      allowed: true,
      updates: {
        status: "in_progress",
        readinessState: "ready",
        readinessReasons: []
      }
    });
  });

  it("synchronizes readiness when starting a task", () => {
    const result = evaluate(
      createTask({ status: "ready", readinessState: "not_ready" }),
      "start"
    );

    expect(result).toMatchObject({
      allowed: true,
      updates: {
        status: "in_progress",
        readinessState: "ready",
        readinessReasons: []
      }
    });
  });

  it.each([
    ["dependency-blocked", createTask({ dependencyTaskIds: ["demo"] }), [createTask({ id: "demo", status: "in_progress" })]],
    ["material-blocked", createTask({ materialStatus: "ordered" }), undefined],
    ["actively blocked", createTask({ blockerType: "site_condition", blockerNotes: "Subfloor is wet." }), undefined],
    ["invalid duration", createTask({ estimatedDurationMinutes: 0 }), undefined],
    ["completed", createTask({ status: "complete" }), undefined],
    ["cancelled", createTask({ status: "cancelled" }), undefined]
  ])("does not start a %s task", (_label, task, otherTasks) => {
    expect(evaluate(task, "start", { tasks: [task, ...(otherTasks ?? [])] }).allowed).toBe(false);
  });

  it("does not start helper-required work without helper availability", () => {
    expect(evaluate(createTask({ helperRequired: true }), "start", { helperAvailable: false }).allowed).toBe(false);
  });

  it("moves in-progress work into waiting or curing", () => {
    expect(evaluate(createTask({ status: "in_progress" }), "mark_waiting")).toMatchObject({ allowed: true, updates: { status: "waiting_curing" } });
  });

  it("preserves coherent readiness when marking active work waiting", () => {
    expect(evaluate(createTask({ status: "in_progress" }), "mark_waiting"))
      .toMatchObject({
        allowed: true,
        updates: {
          status: "waiting_curing",
          readinessState: "ready",
          readinessReasons: []
        }
      });
  });

  it("resumes waiting work only when readiness still passes", () => {
    expect(evaluate(createTask({ status: "waiting_curing" }), "resume")).toMatchObject({
      allowed: true,
      updates: {
        status: "in_progress",
        readinessState: "ready",
        readinessReasons: []
      }
    });
    expect(
      evaluate(
        createTask({ status: "waiting_curing", materialStatus: "ordered" }),
        "resume"
      ).allowed
    ).toBe(false);
  });

  it("synchronizes readiness when resuming waiting work", () => {
    const result = evaluate(
      createTask({
        status: "waiting_curing",
        readinessState: "ready",
        readinessReasons: ["stale reason"]
      }),
      "resume"
    );

    expect(result).toMatchObject({
      allowed: true,
      updates: {
        status: "in_progress",
        readinessState: "ready",
        readinessReasons: []
      }
    });
  });

  it("does not move ready work directly into waiting or curing", () => {
    expect(evaluate(createTask(), "mark_waiting").allowed).toBe(false);
  });

  it("completes active work and rejects completion from invalid states", () => {
    expect(evaluate(createTask({ status: "in_progress" }), "complete").allowed).toBe(true);
    expect(evaluate(createTask({ status: "ready" }), "complete").allowed).toBe(false);
  });

  it("requires blocker type and note", () => {
    expect(evaluate(createTask(), "block", { blocker: { blockerType: "none", blockerNotes: "Damage found" } }).allowed).toBe(false);
    expect(evaluate(createTask(), "block", { blocker: { blockerType: "site_condition", blockerNotes: "   " } }).allowed).toBe(false);
  });

  it("preserves an optional blocked-until date", () => {
    const result = evaluate(createTask(), "block", { blocker: { blockerType: "inspection", blockerNotes: "Awaiting rough-in inspection.", blockedUntilDate: "2026-06-18" } });
    expect(result).toMatchObject({ allowed: true, updates: { blockedUntilDate: "2026-06-18" } });
  });

  it("clears blocker metadata and returns genuinely ready work to ready", () => {
    const task = createTask({ status: "blocked", readinessState: "blocked", blockerType: "access", blockerNotes: "Room locked." });
    expect(evaluate(task, "clear_blocker")).toMatchObject({
      allowed: true,
      updates: { status: "ready", readinessState: "ready", blockerType: "none", blockerNotes: "", blockedUntilDate: null }
    });
  });

  it("clears blocker metadata but remains not ready when materials are unavailable", () => {
    const task = createTask({ status: "blocked", readinessState: "blocked", blockerType: "access", blockerNotes: "Room locked.", materialStatus: "needed" });
    expect(evaluate(task, "clear_blocker")).toMatchObject({ allowed: true, updates: { status: "not_ready", readinessState: "not_ready", blockerType: "none" } });
  });

  it("does not mutate input and returns stable output", () => {
    const task = createTask({ status: "blocked", readinessState: "blocked", blockerType: "weather", blockerNotes: "Exterior is wet." });
    const before = JSON.stringify(task);
    const first = evaluate(task, "clear_blocker");
    const second = evaluate(task, "clear_blocker");
    expect(JSON.stringify(task)).toBe(before);
    expect(first).toEqual(second);
  });

  it("does not include unrelated task fields in execution updates", () => {
    const result = evaluate(createTask({ status: "in_progress" }), "mark_waiting");

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.updates).toEqual({
        status: "waiting_curing",
        readinessState: "ready",
        readinessReasons: []
      });
      expect(result.updates).not.toHaveProperty("name");
      expect(result.updates).not.toHaveProperty("dependencyTaskIds");
      expect(result.updates).not.toHaveProperty("materialStatus");
      expect(result.updates).not.toHaveProperty("notes");
      expect(result.updates).not.toHaveProperty("dueDate");
    }
  });
});

// Required evidence is a completion constraint, not merely a screen hint.
it("denies completion without required evidence", () => {
 const task = createTask({status:"in_progress",photosRequired:true});
 expect(evaluateTaskTransition(task,"complete",{tasks:[task]}).allowed).toBe(false);
});
it("denies completion while required QC has not passed", () => {
 const task = createTask({status:"in_progress",qcRequired:true,qcPassed:false});
 expect(evaluateTaskTransition(task,"complete",{tasks:[task]}).allowed).toBe(false);
});

describe("pause and terminal-state guards",()=>{
 it("pauses without labelling ordinary stopped work as curing",()=>{expect(evaluate(createTask({status:"in_progress"}),"pause")).toMatchObject({allowed:true,updates:{status:"ready"}});});
 it("never reopens completed or cancelled work through blocker clearing",()=>{for(const status of ["complete","cancelled"] as const)expect(evaluate(createTask({status,blockerType:"material"}),"clear_blocker").allowed).toBe(false);});
 it("rejects premature completion while still permitting entering a recorded curing wait",()=>{const task=createTask({status:"in_progress",cureUntil:new Date(Date.now()+86400000).toISOString()});expect(evaluate(task,"complete").allowed).toBe(false);expect(evaluate(task,"mark_waiting").allowed).toBe(true);});
});
