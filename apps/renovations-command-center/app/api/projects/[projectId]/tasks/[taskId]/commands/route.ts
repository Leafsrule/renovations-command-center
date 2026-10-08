import { readJsonRequest } from "@/lib/server/request-body";
import { adminServices } from "@/lib/server/firebase-admin";
import { runTaskCommand } from "@/lib/server/task-commands";
import { CommandError } from "@/lib/task-command";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; taskId: string }> },
) {
  try {
    const token = request.headers
      .get("authorization")
      ?.match(/^Bearer (\S+)$/)?.[1];
    if (!token) throw new CommandError(401, "Sign in before saving.");
    const command = await readJsonRequest(request, 64_000);
    const { db, auth, bucket } = adminServices();
    const user = await auth.verifyIdToken(token, true).catch(() => {
      throw new CommandError(401, "Sign in again before saving.");
    });
    const { projectId, taskId } = await params;
    const result = await runTaskCommand(
      db,
      bucket,
      user.uid,
      projectId,
      taskId,
      command,
    );
    return Response.json(
      { result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof CommandError
            ? error.message
            : "Secure save failed. Retry without discarding your draft.",
      },
      {
        status: error instanceof CommandError ? error.status : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
