import { readJsonRequest } from "@/lib/server/request-body";
import { adminServices } from "@/lib/server/firebase-admin";
import { restoreProject } from "@/lib/server/project-restore";
import { CommandError } from "@/lib/task-command";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const token = request.headers
      .get("authorization")
      ?.match(/^Bearer (\S+)$/)?.[1];
    if (!token) throw new CommandError(401, "Sign in before restoring.");
    const value = await readJsonRequest(request, 5_000_000);
    if (!value || typeof value !== "object")
      throw new CommandError(400, "Invalid backup request.");
    const body = value as { projectId: string; backup: unknown };
    const { db, auth } = adminServices();
    const user = await auth.verifyIdToken(token, true).catch(() => {
      throw new CommandError(401, "Sign in again before restoring.");
    });
    const projectId = await restoreProject(
      db,
      user.uid,
      body.projectId,
      body.backup,
    );
    return Response.json(
      { projectId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof CommandError
            ? e.message
            : "Restore failed. Keep the backup and retry.",
      },
      {
        status: e instanceof CommandError ? e.status : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
