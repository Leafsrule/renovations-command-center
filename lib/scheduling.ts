import type { RenovationTask, TaskPhase } from "./tasks";

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

export type TaskReadinessEvaluationState =
  | "ready"
  | "blocked"
  | "invalid"
  | "not_ready";

export type TaskReadinessEvaluation = {
  taskId: string;
  state: TaskReadinessEvaluationState;
  isReady: boolean;
  isBlocked: boolean;
  isInvalid: boolean;
  blockingDependencyIds: string[];
  missingMaterial: boolean;
  activeBlocker: boolean;
  helperRequiredAndUnavailable: boolean;
  earliestStartBlocked: boolean;
  isCompletedOrCancelled: boolean;
  reasons: string[];
};

export type RecommendationOptions = {
  today?: string;
  availableMinutes?: number;
  helperAvailable?: boolean;
  passiveWaitActive?: boolean;
  maxRecommendations?: number;
};

export type TaskRecommendation = {
  task: RenovationTask;
  rank: number;
  reasons: string[];
};

const phaseOrder: TaskPhase[] = [
  "setup",
  "demolition",
  "prep",
  "rough_in",
  "waterproofing",
  "tile",
  "flooring",
  "drywall",
  "paint",
  "trim",
  "fixtures",
  "cleanup",
  "other"
];

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

function isTaskCompletedOrCancelled(task: RenovationTask) {
  return task.status === "complete" || task.status === "cancelled";
}

function taskHasIncompleteDependencies(
  task: RenovationTask,
  taskMap: Map<string, RenovationTask>
) {
  return task.dependencyTaskIds.filter((dependencyTaskId) => {
    const dependencyTask = taskMap.get(dependencyTaskId);
    return !dependencyTask || !isTaskCompletedOrCancelled(dependencyTask);
  });
}

function taskHasMissingMaterials(task: RenovationTask) {
  return (
    task.materialStatus === "needed" ||
    task.materialStatus === "ordered" ||
    task.materialStatus === "partial" ||
    task.materialStatus === "blocked"
  );
}

function taskHasActiveBlocker(task: RenovationTask, today: string) {
  return (
    task.status === "blocked" ||
    task.readinessState === "blocked" ||
    task.blockerType !== "none" ||
    isDateAfter(task.blockedUntilDate, today)
  );
}

function taskHasInvalidDuration(task: RenovationTask) {
  return task.estimatedDurationMinutes === null || task.estimatedDurationMinutes <= 0;
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
  return reasons.filter(Boolean).slice(0, 5);
}

function evaluateTaskReadiness(
  task: RenovationTask,
  taskMap: Map<string, RenovationTask>,
  options: RecommendationOptions = {}
): TaskReadinessEvaluation {
  const today = options.today ?? getTodayDateString();
  const isCompletedOrCancelled = isTaskCompletedOrCancelled(task);
  const blockingDependencyIds = taskHasIncompleteDependencies(task, taskMap);
  const missingMaterial = taskHasMissingMaterials(task);
  const activeBlocker = taskHasActiveBlocker(task, today);
  const invalidDuration = taskHasInvalidDuration(task);
  const earliestStartBlocked = isDateAfter(task.earliestStartDate, today);
  const helperRequiredAndUnavailable =
    task.helperRequired === true && options.helperAvailable === false;
  const reasons: string[] = [];

  if (isCompletedOrCancelled) {
    reasons.push(
      task.status === "cancelled"
        ? "Task is cancelled and excluded from recommendations."
        : "Task is complete and excluded from recommendations."
    );
  }

  if (invalidDuration) {
    reasons.push("Estimated duration must be a positive number.");
  }

  if (activeBlocker) {
    reasons.push("An active blocker is recorded.");
  }

  if (blockingDependencyIds.length > 0) {
    reasons.push(
      `${blockingDependencyIds.length} dependency ${
        blockingDependencyIds.length === 1 ? "is" : "are"
      } incomplete.`
    );
  }

  if (missingMaterial) {
    reasons.push("Required materials are not available.");
  }

  if (earliestStartBlocked) {
    reasons.push(
      `Earliest start is ${task.earliestStartDate}, which is after today.`
    );
  }

  if (helperRequiredAndUnavailable) {
    reasons.push("Helper is required but not available.");
  }

  if (
    !isCompletedOrCancelled &&
    !invalidDuration &&
    !activeBlocker &&
    blockingDependencyIds.length === 0 &&
    !missingMaterial &&
    !earliestStartBlocked &&
    !helperRequiredAndUnavailable &&
    task.readinessState !== "ready" &&
    task.status !== "ready"
  ) {
    reasons.push("Task is not marked ready yet.");
  }

  if (
    !isCompletedOrCancelled &&
    !invalidDuration &&
    !activeBlocker &&
    blockingDependencyIds.length === 0 &&
    !missingMaterial &&
    !earliestStartBlocked &&
    !helperRequiredAndUnavailable &&
    (task.readinessState === "ready" || task.status === "ready")
  ) {
    reasons.push("Task is ready for work.");
  }

  const state: TaskReadinessEvaluationState = isCompletedOrCancelled
    ? "not_ready"
    : invalidDuration
    ? "invalid"
    : activeBlocker || blockingDependencyIds.length > 0 || missingMaterial || earliestStartBlocked || helperRequiredAndUnavailable
    ? "blocked"
    : task.readinessState === "ready" || task.status === "ready"
    ? "ready"
    : "not_ready";

  return {
    taskId: task.id,
    state,
    isReady: state === "ready",
    isBlocked: state === "blocked",
    isInvalid: state === "invalid",
    blockingDependencyIds,
    missingMaterial,
    activeBlocker,
    helperRequiredAndUnavailable,
    earliestStartBlocked,
    isCompletedOrCancelled,
    reasons: capReasons(reasons)
  };
}

export function getTaskReadinessEvaluation(
  task: RenovationTask,
  taskMap: Map<string, RenovationTask>,
  options: RecommendationOptions = {}
): TaskReadinessEvaluation {
  return evaluateTaskReadiness(task, taskMap, options);
}

export function getTaskSchedulingInsight(
  task: RenovationTask,
  taskMap: Map<string, RenovationTask>,
  today = getTodayDateString()
): TaskSchedulingInsight {
  const readiness = getTaskReadinessEvaluation(task, taskMap, { today });
  const isCompleted = isTaskCompletedOrCancelled(task);
  const isWaitingOnDependencies = readiness.blockingDependencyIds.length > 0;
  const isWaitingOnMaterials = taskHasMissingMaterials(task);
  const isBlocked = readiness.isBlocked;
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
    readiness.isReady &&
    !isScheduledLater &&
    !isOverdue;
  const reasons = [...readiness.reasons];

  if (isOverdue) {
    reasons.push(`Due date has passed: ${task.dueDate}.`);
  } else if (isDueSoon) {
    reasons.push(`Due soon: ${task.dueDate}.`);
  }

  if (isScheduledLater) {
    reasons.push(`Earliest start is ${task.earliestStartDate}.`);
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
    blockingDependencyIds: readiness.blockingDependencyIds,
    sortScore
  };
}

function compareTaskPriority(a: RenovationTask, b: RenovationTask) {
  const priorityRank = { urgent: 4, high: 3, medium: 2, low: 1 } as const;

  if (priorityRank[a.priority] !== priorityRank[b.priority]) {
    return priorityRank[b.priority] - priorityRank[a.priority];
  }

  const phaseA = phaseOrder.indexOf(a.phase);
  const phaseB = phaseOrder.indexOf(b.phase);

  if (phaseA !== phaseB) {
    return phaseA - phaseB;
  }

  if (a.estimatedDurationMinutes !== null && b.estimatedDurationMinutes !== null) {
    if (a.estimatedDurationMinutes !== b.estimatedDurationMinutes) {
      return a.estimatedDurationMinutes - b.estimatedDurationMinutes;
    }
  } else if (a.estimatedDurationMinutes === null && b.estimatedDurationMinutes !== null) {
    return 1;
  } else if (a.estimatedDurationMinutes !== null && b.estimatedDurationMinutes === null) {
    return -1;
  }

  if (a.name !== b.name) {
    return a.name.localeCompare(b.name);
  }

  return a.id.localeCompare(b.id);
}

export function getRecommendedNextTasks(
  tasks: RenovationTask[],
  options: RecommendationOptions = {}
): TaskRecommendation[] {
  const today = options.today ?? getTodayDateString();
  const taskMap = new Map(tasks.map((task) => [task.id, task]));

  const candidates = tasks
    .map((task) => ({
      task,
      readiness: getTaskReadinessEvaluation(task, taskMap, {
        today,
        helperAvailable: options.helperAvailable
      })
    }))
    .filter(({ readiness }) => readiness.state === "ready")
    .filter(({ task, readiness }) => {
      if (options.helperAvailable === false && readiness.helperRequiredAndUnavailable) {
        return false;
      }

      if (options.passiveWaitActive && !task.canRunConcurrent) {
        return false;
      }

      if (
        typeof options.availableMinutes === "number" &&
        task.estimatedDurationMinutes !== null &&
        task.estimatedDurationMinutes > options.availableMinutes
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => compareTaskPriority(a.task, b.task));

  return candidates
    .sort((a, b) => compareTaskPriority(a.task, b.task))
    .map(({ task }, index) => {
      const reasons: string[] = ["Ready for work."];

    if (options.availableMinutes !== undefined) {
      reasons.push("Fits within the supplied remaining capacity.");
    }

    if (options.helperAvailable === false && task.helperRequired) {
      reasons.push("Helper is required but unavailable.");
    } else if (task.helperRequired) {
      reasons.push("Helper is required and available.");
    }

    if (options.passiveWaitActive && task.canRunConcurrent) {
      reasons.push("Eligible to run while another task is waiting.");
    }

    if (!options.passiveWaitActive) {
      reasons.push("Eligible for normal task scheduling.");
    }

    return {
      task,
      rank: index + 1,
      reasons: capReasons(reasons)
    };
  });
}

export function getProjectSchedulingInsights(
  tasks: RenovationTask[],
  today = getTodayDateString()
): TaskSchedulingInsight[] {
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const baseInsights = tasks.map((task) =>
    getTaskSchedulingInsight(task, taskMap, today)
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
