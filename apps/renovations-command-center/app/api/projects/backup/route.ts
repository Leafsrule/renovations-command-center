import { readJsonRequest } from "@/lib/server/request-body";
import { adminServices } from "@/lib/server/firebase-admin";
import { exportProjectArchive } from "@/lib/server/project-archive";
import { CommandError } from "@/lib/task-command";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];
    if (!token) throw new CommandError(401, "Sign in before exporting.");
    const { db, auth, bucket } = adminServices();
    const user = await auth.verifyIdToken(token, true).catch(() => { throw new CommandError(401, "Sign in again before exporting."); });
    const body = await readJsonRequest(request, 2000) as { projectId?: unknown };
    if (!body || typeof body.projectId !== "string") throw new CommandError(400, "Invalid project ID.");
    const backup = await exportProjectArchive(db, bucket, user.uid, body.projectId);
    return Response.json(backup, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof CommandError ? error.message : "Backup failed. No complete backup was exported; retry online." },
      { status: error instanceof CommandError ? error.status : 503, headers: { "Cache-Control": "no-store" } });
  }
}
