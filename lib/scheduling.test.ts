import { describe, expect, it } from "vitest";
import type { RenovationTask } from "./tasks";
import {
  getRecommendedNextTasks,
  getTaskReadinessEvaluation,
  getProjectSchedulingInsights
} from "./scheduling";

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

describe("scheduling engine", () => {
  it("marks a dependency-blocked task as not ready", () => {
    const dependency = createTask({ id: "dependency", status: "complete" });
    const task = createTask({
      id: "tile",
      dependencyTaskIds: ["dependency", "missing"],
      status: "ready",
      materialStatus: "ready"
    });

    const evaluation = getTaskReadinessEvaluation(task, new Map([[dependency.id, dependency]]), { today });

    expect(evaluation.state).toBe("blocked");
    expect(evaluation.blockingDependencyIds).toEqual(["missing"]);
    expect(evaluation.reasons).toContain("1 dependency is incomplete.");
  });

  it("marks a task with missing required material as blocked", () => {
    const task = createTask({
      id: "plumbing",
      materialStatus: "needed",
      status: "ready"
    });

    const evaluation = getTaskReadinessEvaluation(task, new Map(), { today });

    expect(evaluation.state).toBe("blocked");
    expect(evaluation.missingMaterial).toBe(true);
    expect(evaluation.reasons).toContain("Required materials are not available.");
  });

  it("marks a task with material blocked as blocked", () => {
    const task = createTask({
      id: "grout",
      materialStatus: "blocked",
      status: "ready"
    });

    const evaluation = getTaskReadinessEvaluation(task, new Map(), { today });

    expect(evaluation.state).toBe("blocked");
  });

  it("marks a task with an active blocker as blocked", () => {
    const task = createTask({
      id: "drywall",
      status: "blocked",
      blockerType: "site_condition"
    });

    const evaluation = getTaskReadinessEvaluation(task, new Map(), { today });

    expect(evaluation.state).toBe("blocked");
    expect(evaluation.activeBlocker).toBe(true);
  });

  it("marks a task with negative duration as invalid", () => {
    const task = createTask({ id: "cleanup", estimatedDurationMinutes: -30 });

    const evaluation = getTaskReadinessEvaluation(task, new Map(), { today });

    expect(evaluation.state).toBe("invalid");
    expect(evaluation.reasons).toContain("Estimated duration must be a positive number.");
  });

  it("marks a task with zero duration as invalid", () => {
    const task = createTask({ id: "cleanup", estimatedDurationMinutes: 0 });

    const evaluation = getTaskReadinessEvaluation(task, new Map(), { today });

    expect(evaluation.state).toBe("invalid");
  });

  it("excludes a completed task from recommendations", () => {
    const task = createTask({ id: "paint", status: "complete" });
    const recommendations = getRecommendedNextTasks([task], { today });

    expect(recommendations).toHaveLength(0);
  });

  it("excludes a cancelled task from recommendations", () => {
    const task = createTask({ id: "paint", status: "cancelled" });
    const recommendations = getRecommendedNextTasks([task], { today });

    expect(recommendations).toHaveLength(0);
  });

  it("includes a valid ready task in Recommended Next", () => {
    const task = createTask({ id: "demo", status: "ready", readinessState: "ready", materialStatus: "ready" });
    const recommendations = getRecommendedNextTasks([task], { today });

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].task.id).toBe("demo");
    expect(recommendations[0].reasons).toContain("Ready for work.");
  });

  it("ranks a higher priority ready task ahead of a lower priority one", () => {
    const low = createTask({ id: "low", priority: "low" });
    const urgent = createTask({ id: "urgent", priority: "urgent" });
    const recommendations = getRecommendedNextTasks([low, urgent], { today });

    expect(recommendations[0].task.id).toBe("urgent");
  });

  it("unblocks a successor after completing a dependency", () => {
    const dependency = createTask({ id: "rough-in", status: "complete" });
    const successor = createTask({
      id: "waterproof",
      dependencyTaskIds: [dependency.id],
      status: "ready",
      materialStatus: "ready"
    });

    const evaluation = getTaskReadinessEvaluation(successor, new Map([[dependency.id, dependency]]), { today });

    expect(evaluation.state).toBe("ready");
  });

  it("excludes a task too large for remaining capacity", () => {
    const task = createTask({ id: "flooring", estimatedDurationMinutes: 300, status: "ready", readinessState: "ready" });

    const recommendations = getRecommendedNextTasks([task], { today, availableMinutes: 120 });

    expect(recommendations).toHaveLength(0);
  });

  it("blocks a helper-required task when helper is unavailable", () => {
    const task = createTask({ id: "electrical", helperRequired: true, status: "ready", readinessState: "ready" });

    const evaluation = getTaskReadinessEvaluation(task, new Map(), { today, helperAvailable: false });

    expect(evaluation.state).toBe("blocked");
    expect(evaluation.reasons).toContain("Helper is required but not available.");
  });

  it("recommends a concurrent task during passive wait when eligible", () => {
    const task = createTask({ id: "cleanup", canRunConcurrent: true, status: "ready", readinessState: "ready" });
    const recommendations = getRecommendedNextTasks([task], { today, passiveWaitActive: true });

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].reasons).toContain("Eligible to run while another task is waiting.");
  });

  it("returns a stable ordering for identical input", () => {
    const a = createTask({ id: "a", priority: "medium" });
    const b = createTask({ id: "b", priority: "medium" });
    const first = getRecommendedNextTasks([a, b], { today });
    const second = getRecommendedNextTasks([a, b], { today });

    expect(first.map((recommendation) => recommendation.task.id)).toEqual(
      second.map((recommendation) => recommendation.task.id)
    );
  });

  it("returns safe empty result for empty task input", () => {
    const recommendations = getRecommendedNextTasks([], { today });

    expect(recommendations).toEqual([]);
  });

  it("does not mutate caller-owned input", () => {
    const task = createTask({ id: "slu", status: "ready" });
    const tasks = [task];
    const copy = JSON.stringify(tasks);

    getRecommendedNextTasks(tasks, { today });

    expect(JSON.stringify(tasks)).toBe(copy);
  });

  it("provides blocked reasons from project scheduling insights", () => {
    const task = createTask({ id: "tile", status: "blocked", blockerType: "material" });
    const insights = getProjectSchedulingInsights([task], today);

    expect(insights[0].reasons.some((reason) => reason.includes("blocker"))).toBe(true);
  });
});
