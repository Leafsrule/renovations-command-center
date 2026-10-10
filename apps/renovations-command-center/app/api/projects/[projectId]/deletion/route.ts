import { adminServices } from "@/lib/server/firebase-admin";
import {
  deletionOptions,
  deleteOpenRecord,
} from "@/lib/server/record-deletion";
import { CommandError } from "@/lib/task-command";
import type { DeletableKind } from "@/lib/deletion-policy";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
type Context = { params: Promise<{ projectId: string }> };
async function access(request: Request, context: Context) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) throw new CommandError(401, "Sign in before deleting records.");
  const { db, auth } = adminServices();
  const user = await auth.verifyIdToken(token, true).catch(() => {
    throw new CommandError(401, "Sign in again before deleting records.");
  });
  const { projectId } = await context.params;
  return { db, owner: user.uid, projectId };
}
const failure = (e: unknown) =>
  Response.json(
    {
      error:
        e instanceof CommandError
          ? e.message
          : "Deletion could not be verified. No change was saved.",
    },
    { status: e instanceof CommandError ? e.status : 503, headers },
  );
export async function GET(request: Request, context: Context) {
  try {
    const a = await access(request, context);
    return Response.json(await deletionOptions(a.db, a.projectId, a.owner), {
      headers,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    const a = await access(request, context);
    if (Number(request.headers.get("content-length") ?? 0) > 2048)
      throw new CommandError(400, "Invalid deletion request.");
    const body = await request.text();
    if (body.length > 2048)
      throw new CommandError(400, "Invalid deletion request.");
    let input;
    try {
      input = JSON.parse(body);
    } catch {
      throw new CommandError(400, "Invalid deletion request.");
    }
    if (!input || typeof input !== "object")
      throw new CommandError(400, "Invalid deletion request.");
    return Response.json(
      await deleteOpenRecord(
        a.db,
        a.projectId,
        a.owner,
        input.kind as DeletableKind,
        input.id,
        input.revision,
      ),
      { headers },
    );
  } catch (e) {
    return failure(e);
  }
}
