import {
  getProjectSchedulingInsights,
  type TaskSchedulingInsight
} from "./scheduling";
import type { RenovationTask } from "./tasks";

export type ScheduleVisualState =
  | "completed"
  | "overdue"
  | "blocked"
  | "waiting"
  | "review"
  | "in_progress"
  | "ready"
  | "scheduled"
  | "pending";

export type ScheduleBoardItem = {
  task: RenovationTask;
  insight: TaskSchedulingInsight;
  visualState: ScheduleVisualState;
  anchorDate: string;
  isUnscheduled: boolean;
  roomName: string;
};

function normalizeDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

export function getTaskAnchorDate(task: RenovationTask, today: string) {
  return (
    normalizeDate(task.scheduledStart) ??
    normalizeDate(task.earliestStartDate) ??
    normalizeDate(task.dueDate) ??
    today
  );
}

export function getScheduleVisualState(
  task: RenovationTask,
  insight: TaskSchedulingInsight
): ScheduleVisualState {
  if (task.status === "complete" || task.status === "cancelled") {
    return "completed";
  }

  if (insight.isOverdue) {
    return "overdue";
  }

  if (insight.isBlocked) {
    return "blocked";
  }

  if (insight.isWaitingOnDependencies || insight.isWaitingOnMaterials || task.status === "waiting_curing") {
    return "waiting";
  }

  if (insight.category === "needs_review") {
    return "review";
  }

  if (task.status === "in_progress") {
    return "in_progress";
  }

  if (insight.isReadyNow) {
    return "ready";
  }

  if (insight.isScheduledLater || task.scheduledStart) {
    return "scheduled";
  }

  return "pending";
}

export function buildScheduleBoardItems(
  tasks: RenovationTask[],
  roomNames: Map<string, string>,
  today: string
): ScheduleBoardItem[] {
  const insights = getProjectSchedulingInsights(tasks, today);
  const insightMap = new Map(insights.map((insight) => [insight.taskId, insight]));
  const stateRank: Record<ScheduleVisualState, number> = {
    overdue: 0,
    blocked: 1,
    in_progress: 2,
    ready: 3,
    waiting: 4,
    review: 5,
    scheduled: 6,
    pending: 7,
    completed: 8
  };

  return tasks
    .map((task) => {
      const insight = insightMap.get(task.id);
      if (!insight) {
        return null;
      }

      const anchorDate = getTaskAnchorDate(task, today);
      const isUnscheduled = !task.scheduledStart && !task.earliestStartDate && !task.dueDate;

      return {
        task,
        insight,
        visualState: getScheduleVisualState(task, insight),
        anchorDate,
        isUnscheduled,
        roomName: task.roomId ? roomNames.get(task.roomId) ?? "Unknown area" : "No area"
      } satisfies ScheduleBoardItem;
    })
    .filter((item): item is ScheduleBoardItem => item !== null)
    .sort((a, b) => {
      if (a.anchorDate !== b.anchorDate) {
        return a.anchorDate.localeCompare(b.anchorDate);
      }

      if (stateRank[a.visualState] !== stateRank[b.visualState]) {
        return stateRank[a.visualState] - stateRank[b.visualState];
      }

      return a.task.name.localeCompare(b.task.name);
    });
}

export function getScheduleWindow(today: string, numberOfDays = 14) {
  const [year, month, day] = today.split("-").map(Number);

  return Array.from({ length: numberOfDays }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, day + index));
    return [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0")
    ].join("-");
  });
}
