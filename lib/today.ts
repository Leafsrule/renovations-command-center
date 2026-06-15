import type { RenovationTask } from "./tasks";
import {
  getRecommendedNextTasks,
  getTaskReadinessEvaluation
} from "./scheduling";

export type TodayPlanTask = {
  task: RenovationTask;
  reasons: string[];
  isHelperWork: boolean;
  isPassiveWaitWork: boolean;
  durationMinutes: number | null;
};

export type TodayPlanCapacity = {
  availableMinutes: number;
  bufferPercent: number;
  bufferMinutes: number;
  schedulableMinutes: number;
  inProgressMinutes: number;
  plannedMinutes: number;
  remainingMinutes: number;
};

export type TodayPlan = {
  currentWork: TodayPlanTask[];
  startFirst: TodayPlanTask[];
  doNext: TodayPlanTask[];
  prepWhileWaiting: TodayPlanTask[];
  helperWork: TodayPlanTask[];
  blockedOrNotToday: TodayPlanTask[];
  capacity: TodayPlanCapacity;
};

export type TodayPlanInput = {
  tasks: RenovationTask[];
  today?: string;
  availableMinutes?: number;
  bufferPercent?: number;
  bufferMinutes?: number;
  helperAvailable?: boolean;
};

const DEFAULT_AVAILABLE_MINUTES = 10 * 60;
const DEFAULT_BUFFER_PERCENT = 20;

function copyTask(task: RenovationTask): RenovationTask {
  return JSON.parse(JSON.stringify(task)) as RenovationTask;
}

function isCompletedOrCancelled(task: RenovationTask) {
  return task.status === "complete" || task.status === "cancelled";
}

export function getTodayPlan(input: TodayPlanInput): TodayPlan {
  const today = input.today;
  const availableMinutes = Math.max(
    0,
    typeof input.availableMinutes === "number"
      ? input.availableMinutes
      : DEFAULT_AVAILABLE_MINUTES
  );
  const bufferPercent = Math.min(
    100,
    Math.max(
      0,
      typeof input.bufferPercent === "number"
        ? input.bufferPercent
        : typeof input.bufferMinutes === "number" && availableMinutes > 0
          ? (input.bufferMinutes / availableMinutes) * 100
          : DEFAULT_BUFFER_PERCENT
    )
  );
  const bufferMinutes = Math.round(availableMinutes * (bufferPercent / 100));
  const schedulableMinutes = Math.max(0, availableMinutes - bufferMinutes);
  const helperAvailable = input.helperAvailable ?? true;
  const taskMap = new Map(input.tasks.map((task) => [task.id, task]));
  const currentWork = input.tasks
    .filter((task) => task.status === "in_progress")
    .map((task) => ({
      task: copyTask(task),
      reasons: ["Currently in progress."],
      isHelperWork: task.helperRequired === true,
      isPassiveWaitWork: false,
      durationMinutes: task.estimatedDurationMinutes
    }));
  const currentWorkIds = new Set(currentWork.map((item) => item.task.id));
  const inProgressMinutes = currentWork.reduce(
    (sum, item) =>
      sum +
      (item.durationMinutes !== null && item.durationMinutes > 0
        ? item.durationMinutes
        : 0),
    0
  );
  const recommendationCapacity = Math.max(
    0,
    schedulableMinutes - inProgressMinutes
  );

  const primaryCandidates = input.tasks.filter(
    (task) =>
      !isCompletedOrCancelled(task) &&
      task.status !== "in_progress" &&
      !task.helperRequired &&
      !task.canRunConcurrent
  );

  const recommended = getRecommendedNextTasks(primaryCandidates, {
    today,
    availableMinutes: recommendationCapacity,
    helperAvailable,
    passiveWaitActive: false
  });

  const scheduledTasks: TodayPlanTask[] = [];
  const scheduledTaskIds = new Set<string>();
  let remainingCapacity = recommendationCapacity;

  for (const recommendation of recommended) {
    const duration = recommendation.task.estimatedDurationMinutes ?? 0;

    if (duration > remainingCapacity) {
      break;
    }

    scheduledTasks.push({
      task: copyTask(recommendation.task),
      reasons: recommendation.reasons,
      isHelperWork: recommendation.task.helperRequired === true,
      isPassiveWaitWork: recommendation.task.canRunConcurrent === true,
      durationMinutes: recommendation.task.estimatedDurationMinutes
    });
    scheduledTaskIds.add(recommendation.task.id);
    remainingCapacity -= duration;
  }

  const startFirst = scheduledTasks.slice(0, 1);
  const doNext = scheduledTasks.slice(1);

  const helperWork: TodayPlanTask[] = [];
  const prepWhileWaiting: TodayPlanTask[] = [];
  const blockedOrNotToday: TodayPlanTask[] = [];

  for (const task of input.tasks) {
    if (
      scheduledTaskIds.has(task.id) ||
      currentWorkIds.has(task.id) ||
      isCompletedOrCancelled(task)
    ) {
      continue;
    }

    const readiness = getTaskReadinessEvaluation(task, taskMap, {
      today,
      helperAvailable,
      availableMinutes: schedulableMinutes
    });

    const reasons = [...readiness.reasons];
    const durationMinutes = task.estimatedDurationMinutes;
    const isReady = readiness.state === "ready";
    const isHelperTask = task.helperRequired === true;
    const isPassiveWaitTask = task.canRunConcurrent === true && isReady;

    if (isHelperTask && isReady && helperAvailable) {
      helperWork.push({
        task: copyTask(task),
        reasons: reasons.length > 0 ? reasons : ["Ready for helper work."],
        isHelperWork: true,
        isPassiveWaitWork: isPassiveWaitTask,
        durationMinutes
      });
      continue;
    }

    if (isPassiveWaitTask) {
      prepWhileWaiting.push({
        task: copyTask(task),
        reasons: reasons.length > 0 ? reasons : ["Safe to do while waiting."],
        isHelperWork: isHelperTask,
        isPassiveWaitWork: true,
        durationMinutes
      });
      continue;
    }

    const finalReasons = [...reasons];

    if (isReady && task.helperRequired && helperAvailable) {
      finalReasons.push("Ready helper work is available.");
    }

    if (isReady && task.canRunConcurrent) {
      finalReasons.push("Eligible to run while another task is waiting.");
    }

    if (isReady && !isHelperTask && !isPassiveWaitTask && task.estimatedDurationMinutes !== null) {
      const duration = task.estimatedDurationMinutes;
      if (duration > remainingCapacity) {
        finalReasons.push("Does not fit today's remaining capacity.");
      }
    }

    if (finalReasons.length === 0) {
      finalReasons.push(
        "Task is not ready for work today or does not fit the available time."
      );
    }

    blockedOrNotToday.push({
      task: copyTask(task),
      reasons: finalReasons,
      isHelperWork: isHelperTask,
      isPassiveWaitWork: isPassiveWaitTask,
      durationMinutes
    });
  }

  const recommendedMinutes = startFirst.concat(doNext).reduce((sum, item) => {
    return sum + (item.durationMinutes ?? 0);
  }, 0);
  const plannedMinutes = inProgressMinutes + recommendedMinutes;

  return {
    currentWork,
    startFirst,
    doNext,
    prepWhileWaiting,
    helperWork,
    blockedOrNotToday,
    capacity: {
      availableMinutes,
      bufferPercent,
      bufferMinutes,
      schedulableMinutes,
      inProgressMinutes,
      plannedMinutes,
      remainingMinutes: Math.max(0, schedulableMinutes - plannedMinutes)
    }
  };
}
