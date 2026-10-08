import { auth } from "./firebase";
import type { TaskCommand } from "./task-command";
import type { TaskTransitionResult } from "./task-execution";
import { getTodayDateString } from "./scheduling";
import {
  readQueuedCommands,
  writeQueuedCommand,
  type QueuedCommand,
} from "./command-queue";
const running = new Map<string, Promise<TaskTransitionResult>>();
export function notifyCommands() {
  window.dispatchEvent(new Event("rcc-commands-change"));
}
export async function retryTaskCommand(
  row: QueuedCommand,
): Promise<TaskTransitionResult> {
  const existing = running.get(row.command.commandId);
  if (existing) return existing;
  const attempt = async () => {
    const user = auth?.currentUser;
    if (!user || user.uid !== row.ownerId)
      throw new Error("Sign in with the original account to sync this change.");
    try {
      if (
        row.command.kind === "action" &&
        ["start", "resume"].includes(row.command.action) &&
        row.queuedDate !== getTodayDateString()
      ) {
        row = {
          ...row,
          state: "conflicting",
          error:
            "Work was queued on a different day. Review today's availability before starting.",
        };
        throw new Error(row.error);
      }
      if (!navigator.onLine)
        throw new Error("Queued on this device. Reconnect to sync.");
      const token = await user.getIdToken();
      if (auth?.currentUser?.uid !== row.ownerId)
        throw new Error("Account changed before saving.");
      const response = await fetch(
        `/api/projects/${encodeURIComponent(row.projectId)}/tasks/${encodeURIComponent(row.taskId)}/commands`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(row.command),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        row = {
          ...row,
          state:
            response.status === 409
              ? "conflicting"
              : response.status >= 500
                ? "pending"
                : "failed",
          error: data.error || "Save failed.",
        };
        throw new Error(row.error);
      }
      writeQueuedCommand(localStorage, { ...row, state: "saved", error: "" });
      notifyCommands();
      return data.result;
    } catch (e) {
      const error = e instanceof Error ? e.message : "Save was not confirmed.";
      writeQueuedCommand(localStorage, { ...row, error });
      notifyCommands();
      throw new Error(
        row.state === "pending"
          ? `Queued on this device; not saved to the project yet. ${error}`
          : error,
      );
    }
  };
  const promise = attempt();
  running.set(row.command.commandId, promise);
  try {
    return await promise;
  } finally {
    running.delete(row.command.commandId);
  }
}
export async function sendTaskCommand(
  projectId: string,
  taskId: string,
  input:
    | Omit<Extract<TaskCommand, { kind: "action" }>, "commandId">
    | Omit<Extract<TaskCommand, { kind: "quality" }>, "commandId">
    | Omit<Extract<TaskCommand, { kind: "evidence" }>, "commandId">,
  commandId = crypto.randomUUID(),
): Promise<TaskTransitionResult> {
  const user = auth?.currentUser;
  if (!user) throw new Error("Sign in before saving.");
  const commands = readQueuedCommands(localStorage, user.uid);
  if (
    commands.some(
      (row) =>
        row.projectId === projectId &&
        row.taskId === taskId &&
        row.state !== "saved" &&
        row.command.commandId !== commandId,
    )
  )
    throw new Error(
      "This task has a pending change. Sync or review it before adding another.",
    );
  const row: QueuedCommand = {
    ownerId: user.uid,
    projectId,
    taskId,
    command: { ...input, commandId },
    queuedDate: getTodayDateString(),
    state: "pending",
    error: "",
  };
  // Persist first; storage failure prevents claiming a durable queue or issuing a write.
  writeQueuedCommand(localStorage, row);
  notifyCommands();
  return retryTaskCommand(row);
}
