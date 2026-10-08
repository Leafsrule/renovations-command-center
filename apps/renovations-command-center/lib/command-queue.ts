import { parseTaskCommand, validId, type TaskCommand } from "./task-command";
export type QueuedCommand = {
  ownerId: string;
  projectId: string;
  taskId: string;
  command: TaskCommand;
  queuedDate: string;
  state: "pending" | "conflicting" | "failed" | "saved";
  error: string;
};
const prefix = (ownerId: string) => `rcc:commands:${ownerId}:`;
export function writeQueuedCommand(storage: Storage, change: QueuedCommand) {
  if (
    !validId(change.ownerId) ||
    !validId(change.projectId) ||
    !validId(change.taskId)
  )
    throw new Error("Invalid queued change.");
  parseTaskCommand(change.command);
  storage.setItem(
    `${prefix(change.ownerId)}${change.command.commandId}`,
    JSON.stringify(change),
  );
}
export function readQueuedCommands(
  storage: Storage,
  ownerId: string,
): QueuedCommand[] {
  const result: QueuedCommand[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key?.startsWith(prefix(ownerId))) continue;
    const row = JSON.parse(storage.getItem(key)!) as QueuedCommand;
    if (
      row.ownerId !== ownerId ||
      !validId(row.projectId) ||
      !validId(row.taskId) ||
      !["pending", "conflicting", "failed", "saved"].includes(row.state)
    )
      throw new Error(
        "Stored changes need review. Do not clear browser storage.",
      );
    parseTaskCommand(row.command);
    result.push(row);
  }
  return result;
}
export function discardQueuedCommand(storage: Storage, row: QueuedCommand) {
  storage.removeItem(`${prefix(row.ownerId)}${row.command.commandId}`);
}
