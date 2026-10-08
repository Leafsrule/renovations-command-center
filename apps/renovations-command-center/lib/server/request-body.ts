import { CommandError } from "../task-command";
export async function readJsonRequest(
  request: Request,
  limit: number,
): Promise<unknown> {
  if (Number(request.headers.get("content-length") ?? 0) > limit)
    throw new CommandError(413, "Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new CommandError(400, "Request JSON is required.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new CommandError(413, "Request is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const data = new Uint8Array(length);
  let cursor = 0;
  for (const chunk of chunks) {
    data.set(chunk, cursor);
    cursor += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(data));
  } catch {
    throw new CommandError(400, "Invalid request JSON.");
  }
}
