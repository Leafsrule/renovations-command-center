import { sendTaskCommand } from "./task-command-client";
import type { QualityInput } from "./task-command";
export type { QualityItem } from "./task-command";
export async function saveTaskQuality(projectId: string, taskId: string, input: QualityInput, expectedRevision: string) {
  return sendTaskCommand(projectId, taskId, {kind:"quality", input, expectedRevision});
}
