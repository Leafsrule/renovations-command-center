import { describe, expect, it } from "vitest";
import type { RenovationTask } from "./tasks";
import {
  buildScheduleBoardItems,
  getScheduleVisualState,
  getScheduleWindow
} from "./schedule-board";
import { getProjectSchedulingInsights } from "./scheduling";

const today = "2026-07-01";

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
    estimatedDurationMinutes: partial.estimatedDurationMinutes ?? 60,
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
    notes: partial.notes ?? ""
  };
}

describe("schedule board projection", () => {
  it("classifies completed and overdue tasks", () => {
    const complete = createTask({ id: "complete", status: "complete" });
    const overdue = createTask({ id: "overdue", dueDate: "2026-06-30" });
    const insights = getProjectSchedulingInsights([complete, overdue], today);

    expect(getScheduleVisualState(complete, insights.find((item) => item.taskId === complete.id)!)).toBe("completed");
    expect(getScheduleVisualState(overdue, insights.find((item) => item.taskId === overdue.id)!)).toBe("overdue");
  });

  it("shows dependency and material restrictions as waiting", () => {
    const dependency = createTask({ id: "dependency", status: "in_progress" });
    const waiting = createTask({
      id: "waiting",
      dependencyTaskIds: [dependency.id],
      materialStatus: "needed"
    });
    const items = buildScheduleBoardItems([dependency, waiting], new Map(), today);

    expect(items.find((item) => item.task.id === waiting.id)?.visualState).toBe("waiting");
  });

  it("uses scheduled start before earliest start and due date", () => {
    const task = createTask({
      scheduledStart: "2026-07-04T09:00:00",
      earliestStartDate: "2026-07-03",
      dueDate: "2026-07-05"
    });
    const [item] = buildScheduleBoardItems([task], new Map(), today);

    expect(item.anchorDate).toBe("2026-07-04");
    expect(item.isUnscheduled).toBe(false);
  });

  it("creates an inclusive forward window beginning today", () => {
    expect(getScheduleWindow(today, 3)).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03"
    ]);
  });
});
