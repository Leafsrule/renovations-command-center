import {
  getTaskReadinessEvaluation,
  type RecommendationOptions
} from "./scheduling";
import type {
  RenovationTask,
  TaskBlockerType,
  TaskStatus
} from "./tasks";

export type TaskExecutionAction =
  | "start"
  | "resume"
  | "mark_waiting"
  | "complete"
  | "block"
  | "clear_blocker";

export type TaskBlockerInput = {
  blockerType: TaskBlockerType;
  blockerNotes: string;
  blockedUntilDate?: string | null;
};

export type TaskTransitionContext = RecommendationOptions & {
  tasks: RenovationTask[];
  blocker?: TaskBlockerInput;
};

export type TaskTransitionUpdates = Partial<
  Pick<
    RenovationTask,
    | "status"
    | "readinessState"
    | "readinessReasons"
    | "blockerType"
    | "blockerNotes"
    | "blockedUntilDate"
  >
>;

export type TaskTransitionResult =
  | {
      allowed: true;
      action: TaskExecutionAction;
      updates: TaskTransitionUpdates;
      reason: string;
    }
  | {
      allowed: false;
      action: TaskExecutionAction;
      updates: Record<string, never>;
      reason: string;
    };

function deny(action: TaskExecutionAction, reason: string): TaskTransitionResult {
  return { allowed: false, action, updates: {}, reason };
}

function allow(
  action: TaskExecutionAction,
  reason: string,
  updates: TaskTransitionUpdates
): TaskTransitionResult {
  return { allowed: true, action, updates, reason };
}

function readinessFor(
  task: RenovationTask,
  context: TaskTransitionContext
) {
  const taskMap = new Map(context.tasks.map((item) => [item.id, item]));

  return getTaskReadinessEvaluation(task, taskMap, {
    today: context.today,
    helperAvailable: context.helperAvailable
  });
}

function readinessDenialReason(
  task: RenovationTask,
  context: TaskTransitionContext
) {
  const readiness = readinessFor(task, context);

  return readiness.reasons.find((reason) => reason !== "Task is ready for work.") ||
      "Task is not ready for work.";
}

function statusPermits(status: TaskStatus, allowed: TaskStatus[]) {
  return allowed.includes(status);
}

function readyUpdates(readiness: ReturnType<typeof readinessFor>) {
  return {
    readinessState: "ready" as const,
    readinessReasons: readiness.reasons.filter(
      (reason) => reason !== "Task is ready for work."
    )
  };
}

export function evaluateTaskTransition(
  task: RenovationTask,
  action: TaskExecutionAction,
  context: TaskTransitionContext
): TaskTransitionResult {
  switch (action) {
    case "start": {
      if (!statusPermits(task.status, ["ready"])) {
        return deny(
          action,
          `A ${task.status.replaceAll("_", " ")} task cannot be started.`
        );
      }

      const readiness = readinessFor(task, context);
      if (readiness.state !== "ready") {
        return deny(action, readinessDenialReason(task, context));
      }

      return allow(action, "Task started.", {
        status: "in_progress",
        ...readyUpdates(readiness)
      });
    }

    case "resume": {
      if (task.status !== "waiting_curing") {
        return deny(action, "Only a waiting or curing task can be resumed.");
      }

      const readiness = readinessFor(task, context);
      if (readiness.state !== "ready") {
        return deny(action, readinessDenialReason(task, context));
      }

      return allow(action, "Task resumed.", {
        status: "in_progress",
        ...readyUpdates(readiness)
      });
    }

    case "mark_waiting": {
      if (task.status !== "in_progress") {
        return deny(action, "Only an in-progress task can enter waiting or curing.");
      }

      const readiness = readinessFor(task, context);

      return allow(action, "Task marked waiting or curing.", {
        status: "waiting_curing",
        readinessState: readiness.state === "ready" ? "ready" : "not_ready",
        readinessReasons: readiness.reasons.filter(
          (reason) => reason !== "Task is ready for work."
        )
      });
    }

    case "complete":
      if (task.status !== "in_progress") {
        return deny(action, "Only an in-progress task can be completed.");
      }

      return allow(action, "Task completed.", {
        status: "complete",
        readinessState: "ready",
        readinessReasons: []
      });

    case "block": {
      if (
        !statusPermits(task.status, ["ready", "in_progress", "waiting_curing"])
      ) {
        return deny(
          action,
          "This task is not in an actionable state that can be blocked."
        );
      }

      const blocker = context.blocker;
      if (!blocker || blocker.blockerType === "none") {
        return deny(action, "Choose a blocker type.");
      }

      const blockerNotes = blocker.blockerNotes.trim();
      if (!blockerNotes) {
        return deny(action, "Enter a meaningful blocker note.");
      }

      return allow(action, "Task blocked.", {
        status: "blocked",
        readinessState: "blocked",
        blockerType: blocker.blockerType,
        blockerNotes,
        blockedUntilDate: blocker.blockedUntilDate || null
      });
    }

    case "clear_blocker": {
      if (
        task.status !== "blocked" &&
        task.readinessState !== "blocked" &&
        task.blockerType === "none" &&
        !task.blockerNotes &&
        !task.blockedUntilDate
      ) {
        return deny(action, "This task does not have an active blocker to clear.");
      }

      const candidate: RenovationTask = {
        ...task,
        status: "ready",
        readinessState: "ready",
        blockerType: "none",
        blockerNotes: "",
        blockedUntilDate: null
      };
      const readiness = readinessFor(candidate, context);
      const isReady = readiness.state === "ready";

      return allow(
        action,
        isReady
          ? "Blocker cleared. Task is ready."
          : "Blocker cleared. Other restrictions still prevent work.",
        {
          status: isReady ? "ready" : "not_ready",
          readinessState: isReady ? "ready" : "not_ready",
          readinessReasons: readiness.reasons.filter(
            (reason) => reason !== "Task is ready for work."
          ),
          blockerType: "none",
          blockerNotes: "",
          blockedUntilDate: null
        }
      );
    }
  }
}
