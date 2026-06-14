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
  bufferMinutes: number;
  schedulableMinutes: number;
  plannedMinutes: number;
  remainingMinutes: number;
};

export type TodayPlan = {
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
  bufferMinutes?: number;
  helperAvailable?: boolean;
};

const DEFAULT_AVAILABLE_MINUTES = 10 * 60;
const DEFAULT_BUFFER_MINUTES = 2 * 60;

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
  const bufferMinutes = Math.max(
    0,
    typeof input.bufferMinutes === "number"
      ? input.bufferMinutes
      : DEFAULT_BUFFER_MINUTES
  );
  const schedulableMinutes = Math.max(0, availableMinutes - bufferMinutes);
  const helperAvailable = input.helperAvailable ?? true;
  const taskMap = new Map(input.tasks.map((task) => [task.id, task]));

  const primaryCandidates = input.tasks.filter(
    (task) =>
      !isCompletedOrCancelled(task) &&
      !task.helperRequired &&
      !task.canRunConcurrent
  );

  const recommended = getRecommendedNextTasks(primaryCandidates, {
    today,
    availableMinutes: schedulableMinutes,
    helperAvailable,
    passiveWaitActive: false
  });

  const scheduledTasks: TodayPlanTask[] = [];
  const scheduledTaskIds = new Set<string>();
  let remainingCapacity = schedulableMinutes;

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
    if (scheduledTaskIds.has(task.id) || isCompletedOrCancelled(task)) {
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

  const plannedMinutes = startFirst.concat(doNext).reduce((sum, item) => {
    return sum + (item.durationMinutes ?? 0);
  }, 0);

  return {
    startFirst,
    doNext,
    prepWhileWaiting,
    helperWork,
    blockedOrNotToday,
    capacity: {
      availableMinutes,
      bufferMinutes,
      schedulableMinutes,
      plannedMinutes,
      remainingMinutes: Math.max(0, schedulableMinutes - plannedMinutes)
    }
  };
}
