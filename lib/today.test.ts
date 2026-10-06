import { describe, expect, it } from "vitest";
import type { RenovationTask } from "./tasks";
import { getTodayPlan } from "./today";

const today = "2026-06-14";

function createTask(partial: Partial<RenovationTask>): RenovationTask {
  return {
    id: partial.id ?? "task-1",
    name: partial.name ?? "Task",
    roomId: partial.roomId ?? null,
    phase: partial.phase ?? "prep",
    description: partial.description ?? "",
    status: partial.status ?? "ready",
    priority: partial.priority ?? "medium",
    championPersonId: partial.championPersonId ?? null,
    helperPersonIds: partial.helperPersonIds ?? [],
    dependencyTaskIds: partial.dependencyTaskIds ?? [],
    helperRequired: partial.helperRequired ?? false,
    estimatedDurationMinutes:
      partial.estimatedDurationMinutes !== undefined
        ? partial.estimatedDurationMinutes
        : 60,
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
    canRunConcurrent: partial.canRunConcurrent ?? false,
    notes: partial.notes ?? "",
    createdAt: undefined,
    updatedAt: undefined
  };
}

describe("Today planning", () => {
  it("puts the highest-ranked ready task in Start First", () => {
    const tasks = [
      createTask({ id: "low", priority: "low" }),
      createTask({ id: "urgent", priority: "urgent" })
    ];

    const plan = getTodayPlan({ tasks, today });

    expect(plan.startFirst[0].task.id).toBe("urgent");
  });

  it("puts remaining ready tasks in Do Next", () => {
    const tasks = [
      createTask({ id: "one", priority: "urgent" }),
      createTask({ id: "two", priority: "high" })
    ];

    const plan = getTodayPlan({ tasks, today });

    expect(plan.doNext.map((item) => item.task.id)).toEqual(["two"]);
  });

  it("does not include blocked tasks in actionable sections", () => {
    const tasks = [
      createTask({ id: "ready", status: "ready" }),
      createTask({ id: "blocked", status: "blocked", blockerType: "site_condition" })
    ];

    const plan = getTodayPlan({ tasks, today });

    expect(plan.startFirst.some((item) => item.task.id === "blocked")).toBe(false);
    expect(plan.blockedOrNotToday.some((item) => item.task.id === "blocked")).toBe(true);
  });

  it("shows material-blocked tasks in Blocked / Not Today with reasons", () => {
    const tasks = [
      createTask({ id: "material", materialStatus: "needed", status: "ready" })
    ];

    const plan = getTodayPlan({ tasks, today });

    expect(plan.blockedOrNotToday[0].reasons).toContain("Required materials are not available.");
  });

  it("shows dependency-blocked tasks in Blocked / Not Today with dependency reason", () => {
    const tasks = [
      createTask({ id: "dependency", status: "complete" }),
      createTask({ id: "blocked", dependencyTaskIds: ["dependency", "missing"], status: "ready" })
    ];

    const plan = getTodayPlan({ tasks, today });

    expect(plan.blockedOrNotToday[0].reasons.some((reason) => reason.toLowerCase().includes("dependency"))).toBe(true);
  });

  it("evaluates primary recommendations against the full dependency map", () => {
    const tasks = [
      createTask({ id: "done", status: "complete" }),
      createTask({ id: "successor", dependencyTaskIds: ["done"], status: "ready" })
    ];

    const plan = getTodayPlan({ tasks, today });

    expect(plan.startFirst.map((item) => item.task.id)).toEqual(["successor"]);
    expect(plan.blockedOrNotToday.map((item) => item.task.id)).not.toContain(
      "successor"
    );
  });

  it("recognizes completed dependencies outside the primary candidate subset", () => {
    const tasks = [
      createTask({
        id: "helper-dependency",
        status: "complete",
        helperRequired: true
      }),
      createTask({
        id: "successor",
        dependencyTaskIds: ["helper-dependency"],
        status: "ready"
      })
    ];

    const plan = getTodayPlan({ tasks, today });

    expect(plan.startFirst.map((item) => item.task.id)).toEqual(["successor"]);
  });

  it("keeps missing dependencies blocked even when other dependencies are complete", () => {
    const tasks = [
      createTask({ id: "done", status: "complete" }),
      createTask({
        id: "blocked",
        dependencyTaskIds: ["done", "missing"],
        status: "ready"
      })
    ];

    const plan = getTodayPlan({ tasks, today });

    expect(plan.startFirst).toHaveLength(0);
    expect(plan.blockedOrNotToday[0].task.id).toBe("blocked");
    expect(plan.blockedOrNotToday[0].reasons).toContain(
      "1 dependency is incomplete."
    );
  });

  it("skips an oversized recommended task and fills capacity with a later smaller task", () => {
    const tasks = [
      createTask({
        id: "oversized",
        priority: "urgent",
        estimatedDurationMinutes: 240
      }),
      createTask({
        id: "fits",
        priority: "high",
        estimatedDurationMinutes: 60
      })
    ];

    const plan = getTodayPlan({
      tasks,
      today,
      availableMinutes: 120,
      bufferPercent: 0
    });

    expect(plan.startFirst.map((item) => item.task.id)).toEqual(["fits"]);
    expect(plan.blockedOrNotToday.map((item) => item.task.id)).toContain(
      "oversized"
    );
  });

  it("keeps multiple oversized tasks out of planned capacity", () => {
    const tasks = [
      createTask({ id: "too-big-a", estimatedDurationMinutes: 240 }),
      createTask({ id: "too-big-b", estimatedDurationMinutes: 180 }),
      createTask({ id: "fits", estimatedDurationMinutes: 60 })
    ];

    const plan = getTodayPlan({
      tasks,
      today,
      availableMinutes: 120,
      bufferPercent: 0
    });

    expect(plan.startFirst.map((item) => item.task.id)).toEqual(["fits"]);
    expect(plan.capacity.plannedMinutes).toBeLessThanOrEqual(
      plan.capacity.schedulableMinutes
    );
    expect(plan.blockedOrNotToday.map((item) => item.task.id)).toEqual([
      "too-big-a",
      "too-big-b"
    ]);
  });

  it("excludes waiting or curing tasks from Start First and Do Next", () => {
    const tasks = [
      createTask({
        id: "curing",
        status: "waiting_curing",
        readinessState: "ready"
      }),
      createTask({ id: "ready", status: "ready", priority: "high" })
    ];

    const plan = getTodayPlan({ tasks, today });

    expect(plan.startFirst.map((item) => item.task.id)).toEqual(["ready"]);
    expect(plan.doNext.map((item) => item.task.id)).not.toContain("curing");
    expect(plan.blockedOrNotToday.map((item) => item.task.id)).toContain(
      "curing"
    );
  });

  it("respects earliest start restrictions", () => {
    const tasks = [
      createTask({ id: "future", earliestStartDate: "2026-06-20", status: "ready" })
    ];

    const plan = getTodayPlan({ tasks, today });

    expect(plan.blockedOrNotToday[0].reasons.some((reason) => reason.includes("Earliest start"))).toBe(true);
  });

  it("uses available time minus buffer for schedulable capacity", () => {
    const tasks = [
      createTask({ id: "a", estimatedDurationMinutes: 300, status: "ready" })
    ];

    const plan = getTodayPlan({ tasks, today, availableMinutes: 300, bufferMinutes: 60 });

    expect(plan.capacity.schedulableMinutes).toBe(240);
  });

  it("calculates the protected buffer as a crew capacity percentage", () => {
    const plan = getTodayPlan({
      tasks: [],
      today,
      availableMinutes: 600,
      bufferPercent: 15
    });

    expect(plan.capacity.bufferMinutes).toBe(90);
    expect(plan.capacity.schedulableMinutes).toBe(510);
  });

  it("shows in-progress work and reserves its capacity before recommendations", () => {
    const tasks = [
      createTask({ id: "active", status: "in_progress", estimatedDurationMinutes: 180 }),
      createTask({ id: "next", status: "ready", estimatedDurationMinutes: 180 })
    ];

    const plan = getTodayPlan({
      tasks,
      today,
      availableMinutes: 360,
      bufferPercent: 0
    });

    expect(plan.currentWork.map((item) => item.task.id)).toEqual(["active"]);
    expect(plan.startFirst.map((item) => item.task.id)).toEqual(["next"]);
    expect(plan.capacity.inProgressMinutes).toBe(180);
    expect(plan.capacity.plannedMinutes).toBe(360);
    expect(plan.capacity.remainingMinutes).toBe(0);
  });

  it("does not recommend work that exceeds capacity remaining after active work", () => {
    const tasks = [
      createTask({ id: "active", status: "in_progress", estimatedDurationMinutes: 240 }),
      createTask({ id: "too-large", status: "ready", estimatedDurationMinutes: 180 })
    ];

    const plan = getTodayPlan({
      tasks,
      today,
      availableMinutes: 360,
      bufferPercent: 0
    });

    expect(plan.currentWork).toHaveLength(1);
    expect(plan.startFirst).toHaveLength(0);
    expect(plan.blockedOrNotToday[0].task.id).toBe("too-large");
  });

  it("does not exceed schedulable capacity for planned work", () => {
    const tasks = [
      createTask({ id: "a", estimatedDurationMinutes: 180, priority: "urgent" }),
      createTask({ id: "b", estimatedDurationMinutes: 180, priority: "high" }),
      createTask({ id: "c", estimatedDurationMinutes: 180, priority: "medium" })
    ];

    const plan = getTodayPlan({ tasks, today, availableMinutes: 360, bufferMinutes: 60 });

    expect(plan.capacity.plannedMinutes).toBeLessThanOrEqual(plan.capacity.schedulableMinutes);
  });

  it("excludes helper-required work when helper is unavailable", () => {
    const tasks = [
      createTask({ id: "helper", helperRequired: true })
    ];

    const plan = getTodayPlan({ tasks, today, helperAvailable: false });

    expect(plan.startFirst).toHaveLength(0);
    expect(plan.doNext).toHaveLength(0);
    expect(plan.blockedOrNotToday[0].reasons).toContain("Helper is required but not available.");
  });

  it("shows helper work when helper is available", () => {
    const tasks = [
      createTask({ id: "helper", helperRequired: true, status: "ready" })
    ];

    const plan = getTodayPlan({ tasks, today, helperAvailable: true });

    expect(plan.helperWork[0].task.id).toBe("helper");
  });

  it("shows passive-wait-compatible work in Prep While Waiting", () => {
    const tasks = [
      createTask({ id: "concurrent", canRunConcurrent: true, status: "ready" })
    ];

    const plan = getTodayPlan({ tasks, today });

    expect(plan.prepWhileWaiting[0].task.id).toBe("concurrent");
  });

  it("excludes completed and cancelled tasks from today plan sections", () => {
    const tasks = [
      createTask({ id: "done", status: "complete" }),
      createTask({ id: "cancelled", status: "cancelled" })
    ];

    const plan = getTodayPlan({ tasks, today });

    expect(plan.startFirst).toHaveLength(0);
    expect(plan.doNext).toHaveLength(0);
    expect(plan.helperWork).toHaveLength(0);
    expect(plan.prepWhileWaiting).toHaveLength(0);
    expect(plan.blockedOrNotToday).toHaveLength(0);
  });

  it("returns empty sections for empty task input", () => {
    const plan = getTodayPlan({ tasks: [], today });

    expect(plan.startFirst).toEqual([]);
    expect(plan.currentWork).toEqual([]);
    expect(plan.doNext).toEqual([]);
    expect(plan.prepWhileWaiting).toEqual([]);
    expect(plan.helperWork).toEqual([]);
    expect(plan.blockedOrNotToday).toEqual([]);
  });

  it("produces stable ordering for identical input", () => {
    const tasks = [
      createTask({ id: "a", name: "A" }),
      createTask({ id: "b", name: "B" })
    ];

    const first = getTodayPlan({ tasks, today });
    const second = getTodayPlan({ tasks, today });

    expect(first.startFirst.map((item) => item.task.id)).toEqual(
      second.startFirst.map((item) => item.task.id)
    );
  });

  it("does not mutate input tasks", () => {
    const task = createTask({ id: "immutable", status: "ready" });
    const tasks = [task];
    const copy = JSON.stringify(tasks);

    getTodayPlan({ tasks, today });

    expect(JSON.stringify(tasks)).toBe(copy);
  });

  it("marks invalid-duration tasks as not actionable", () => {
    const tasks = [
      createTask({ id: "invalid", estimatedDurationMinutes: 0, status: "ready" })
    ];

    const plan = getTodayPlan({ tasks, today });

    expect(plan.blockedOrNotToday[0].reasons).toContain(
      "Estimated duration must be a positive number."
    );
  });

  it("updates remaining capacity after planned tasks are grouped", () => {
    const tasks = [
      createTask({ id: "a", estimatedDurationMinutes: 120, priority: "urgent" }),
      createTask({ id: "b", estimatedDurationMinutes: 120, priority: "high" })
    ];

    const plan = getTodayPlan({ tasks, today, availableMinutes: 300, bufferMinutes: 120 });

    expect(plan.capacity.remainingMinutes).toBe(60);
  });
});
