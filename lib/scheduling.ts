import type { RenovationTask } from "./tasks";

export type TaskSchedulingCategory =
  | "completed"
  | "recommended_next"
  | "ready_now"
  | "overdue"
  | "due_soon"
  | "blocked"
  | "waiting_on_dependencies"
  | "waiting_on_materials"
  | "needs_review"
  | "scheduled_later"
  | "not_ready";

export type TaskSchedulingInsight = {
  taskId: string;
  category: TaskSchedulingCategory;
  isCompleted: boolean;
  isBlocked: boolean;
  isWaitingOnDependencies: boolean;
  isWaitingOnMaterials: boolean;
  isReadyNow: boolean;
  isOverdue: boolean;
  isDueSoon: boolean;
  isScheduledLater: boolean;
  reasons: string[];
  blockingDependencyIds: string[];
  sortScore: number;
};

export type ProjectSchedulingSummary = {
  totalTasks: number;
  completedCount: number;
  readyNowCount: number;
  recommendedNextCount: number;
  blockedCount: number;
  waitingOnDependenciesCount: number;
  waitingOnMaterialsCount: number;
  needsReviewCount: number;
  overdueCount: number;
  dueSoonCount: number;
  scheduledLaterCount: number;
  notReadyCount: number;
};

type InsightInput = {
  task: RenovationTask;
  taskMap: Map<string, RenovationTask>;
  today: string;
};

function isValidDateString(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isDateBefore(date: string | null | undefined, today: string) {
  return isValidDateString(date) && date < today;
}

function isDateAfter(date: string | null | undefined, today: string) {
  return isValidDateString(date) && date > today;
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function isDateWithinDays(
  date: string | null | undefined,
  today: string,
  days: number
) {
  if (!isValidDateString(date)) {
    return false;
  }

  const futureDate = addDaysToDateString(today, days);

  return date >= today && date <= futureDate;
}

export function getTodayDateString(): string {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function isTaskCompletedForScheduling(task: RenovationTask) {
  return task.status === "complete" || task.status === "cancelled";
}

function taskIsWaitingOnMaterials(task: RenovationTask) {
  return (
    task.materialStatus === "needed" ||
    task.materialStatus === "ordered" ||
    task.materialStatus === "partial" ||
    task.materialStatus === "blocked"
  );
}

function priorityScore(task: RenovationTask) {
  if (task.priority === "urgent") {
    return 30;
  }

  if (task.priority === "high") {
    return 20;
  }

  if (task.priority === "medium") {
    return 10;
  }

  return 0;
}

function criticalPathScore(task: RenovationTask) {
  if (task.criticalPathRisk === "high") {
    return 25;
  }

  if (task.criticalPathRisk === "medium") {
    return 15;
  }

  if (task.criticalPathRisk === "low") {
    return 5;
  }

  return 0;
}

function durationScore(task: RenovationTask) {
  if (task.estimatedDurationMinutes === null) {
    return 0;
  }

  if (task.estimatedDurationMinutes <= 60) {
    return 8;
  }

  if (task.estimatedDurationMinutes <= 180) {
    return 4;
  }

  return 0;
}

function capReasons(reasons: string[]) {
  return reasons.slice(0, 4);
}

function getBaseSchedulingInsight({
  task,
  taskMap,
  today
}: InsightInput): TaskSchedulingInsight {
  const isCompleted = isTaskCompletedForScheduling(task);
  const blockingDependencyIds = task.dependencyTaskIds.filter(
    (dependencyTaskId) => {
      const dependencyTask = taskMap.get(dependencyTaskId);

      return !dependencyTask || !isTaskCompletedForScheduling(dependencyTask);
    }
  );
  const isWaitingOnDependencies = blockingDependencyIds.length > 0;
  const isWaitingOnMaterials = taskIsWaitingOnMaterials(task);
  const isBlocked =
    task.status === "blocked" ||
    task.readinessState === "blocked" ||
    task.blockerType !== "none" ||
    isValidDateString(task.blockedUntilDate) ||
    task.materialStatus === "blocked";
  const isOverdue = !isCompleted && isDateBefore(task.dueDate, today);
  const isDueSoon =
    !isCompleted && !isOverdue && isDateWithinDays(task.dueDate, today, 7);
  const isScheduledLater =
    !isCompleted && isDateAfter(task.earliestStartDate, today);
  const needsReview =
    !isCompleted &&
    (task.readinessState === "needs_review" ||
      task.status === "qc_review" ||
      task.status === "rework_required");
  const isReadyNow =
    !isCompleted &&
    !isBlocked &&
    !isWaitingOnDependencies &&
    !isWaitingOnMaterials &&
    !isScheduledLater &&
    (task.readinessState === "ready" || task.status === "ready");
  const reasons: string[] = [];

  if (isCompleted) {
    reasons.push(task.status === "cancelled" ? "Task is cancelled." : "Task is complete.");
  }

  if (isBlocked) {
    reasons.push("A blocker is recorded.");
  }

  if (isWaitingOnDependencies) {
    reasons.push(
      `${blockingDependencyIds.length} dependency ${
        blockingDependencyIds.length === 1 ? "is" : "are"
      } not complete.`
    );
  }

  if (isWaitingOnMaterials) {
    reasons.push("Materials may not be ready.");
  }

  if (needsReview) {
    reasons.push("Task needs review.");
  }

  if (isOverdue) {
    reasons.push(`Due date has passed: ${task.dueDate}.`);
  } else if (isDueSoon) {
    reasons.push(`Due soon: ${task.dueDate}.`);
  }

  if (isScheduledLater) {
    reasons.push(`Earliest start is ${task.earliestStartDate}.`);
  }

  if (isReadyNow) {
    reasons.push("No blockers are currently stopping this task.");
  }

  if (!isCompleted && !isReadyNow && task.readinessState === "not_ready") {
    reasons.push("Task is marked not ready.");
  }

  let category: TaskSchedulingCategory = "not_ready";

  if (isCompleted) {
    category = "completed";
  } else if (isBlocked || isOverdue) {
    category = isOverdue ? "overdue" : "blocked";
  } else if (isWaitingOnDependencies) {
    category = "waiting_on_dependencies";
  } else if (isWaitingOnMaterials) {
    category = "waiting_on_materials";
  } else if (needsReview) {
    category = "needs_review";
  } else if (isScheduledLater) {
    category = "scheduled_later";
  } else if (isDueSoon) {
    category = "due_soon";
  } else if (isReadyNow) {
    category = "ready_now";
  }

  const sortScore =
    (isOverdue ? 1000 : 0) +
    (isDueSoon ? 500 : 0) +
    (isReadyNow ? 250 : 0) +
    priorityScore(task) +
    criticalPathScore(task) +
    durationScore(task);

  return {
    taskId: task.id,
    category,
    isCompleted,
    isBlocked,
    isWaitingOnDependencies,
    isWaitingOnMaterials,
    isReadyNow,
    isOverdue,
    isDueSoon,
    isScheduledLater,
    reasons: capReasons(reasons),
    blockingDependencyIds,
    sortScore
  };
}

export function getTaskSchedulingInsight(
  task: RenovationTask,
  taskMap: Map<string, RenovationTask>,
  today = getTodayDateString()
): TaskSchedulingInsight {
  return getBaseSchedulingInsight({ task, taskMap, today });
}

export function getProjectSchedulingInsights(
  tasks: RenovationTask[],
  today = getTodayDateString()
): TaskSchedulingInsight[] {
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const baseInsights = tasks.map((task) =>
    getBaseSchedulingInsight({ task, taskMap, today })
  );
  const recommendedTaskIds = new Set(
    baseInsights
      .filter((insight) => insight.category === "ready_now")
      .sort((a, b) => b.sortScore - a.sortScore)
      .slice(0, 3)
      .map((insight) => insight.taskId)
  );

  return baseInsights.map((insight) =>
    recommendedTaskIds.has(insight.taskId)
      ? {
          ...insight,
          category: "recommended_next",
          reasons: capReasons(["Recommended next based on readiness.", ...insight.reasons])
        }
      : insight
  );
}

export function getProjectSchedulingSummary(
  insights: TaskSchedulingInsight[]
): ProjectSchedulingSummary {
  return {
    totalTasks: insights.length,
    completedCount: insights.filter((insight) => insight.isCompleted).length,
    readyNowCount: insights.filter((insight) => insight.isReadyNow).length,
    recommendedNextCount: insights.filter(
      (insight) => insight.category === "recommended_next"
    ).length,
    blockedCount: insights.filter((insight) => insight.isBlocked).length,
    waitingOnDependenciesCount: insights.filter(
      (insight) => insight.isWaitingOnDependencies
    ).length,
    waitingOnMaterialsCount: insights.filter(
      (insight) => insight.isWaitingOnMaterials
    ).length,
    needsReviewCount: insights.filter(
      (insight) => insight.category === "needs_review"
    ).length,
    overdueCount: insights.filter((insight) => insight.isOverdue).length,
    dueSoonCount: insights.filter((insight) => insight.isDueSoon).length,
    scheduledLaterCount: insights.filter((insight) => insight.isScheduledLater)
      .length,
    notReadyCount: insights.filter((insight) => insight.category === "not_ready")
      .length
  };
}
