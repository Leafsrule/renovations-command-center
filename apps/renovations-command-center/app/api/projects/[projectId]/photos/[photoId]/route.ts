import { adminServices } from "@/lib/server/firebase-admin";
import { privatePhotoStore, PHOTO_LIMIT, PHOTO_TYPES } from "@/lib/server/photo-store";
import { CommandError, validId } from "@/lib/task-command";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
type Context = { params: Promise<{ projectId: string; photoId: string }> };
async function access(request: Request, context: Context) {
  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) throw new CommandError(401, "Sign in before accessing photos.");
  const { projectId, photoId } = await context.params;
  if (!validId(projectId) || !validId(photoId)) throw new CommandError(400, "Invalid photo link.");
  const { db, auth, bucket } = adminServices();
  const user = await auth.verifyIdToken(token, true).catch(() => { throw new CommandError(401, "Sign in again before accessing photos."); });
  const project = db.doc(`projects/${projectId}`);
  if ((await project.get()).data()?.ownerUserId !== user.uid) throw new CommandError(403, "Project is unavailable.");
  return { project, photoId, projectId, owner: user.uid, photos: privatePhotoStore(bucket) };
}
function failure(error: unknown) {
  return Response.json({ error: error instanceof CommandError ? error.message : "Photo save or download failed. Keep the device copy and retry." }, { status: error instanceof CommandError ? error.status : 503, headers });
}
export async function POST(request: Request, context: Context) {
  try {
    const { project, photoId, projectId, owner, photos } = await access(request, context);
    const taskId = request.headers.get("x-task-id");
    const contentType = request.headers.get("content-type") ?? "";
    if (!validId(taskId) || !PHOTO_TYPES.includes(contentType)) throw new CommandError(400, "Choose a valid task and JPG, PNG or WebP image.");
    if (!(await project.collection("tasks").doc(taskId).get()).exists) throw new CommandError(404, "Task is unavailable.");
    if (Number(request.headers.get("content-length") ?? 0) >= PHOTO_LIMIT) throw new CommandError(413, "Choose an image smaller than 10 MB.");
    const reader = request.body?.getReader();
    if (!reader) throw new CommandError(400, "Photo bytes are required.");
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        size += value.length;
        if (size >= PHOTO_LIMIT) { await reader.cancel(); throw new CommandError(413, "Choose an image smaller than 10 MB."); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    if (!size) throw new CommandError(400, "Photo is empty.");
    const bytes = Buffer.concat(chunks);
    const linked = (await project.collection("evidence").doc(photoId).get()).data();
    if (linked) {
      const finalPath = `projects/${projectId}/evidence/${photoId}`;
      const final = await photos.info(finalPath);
      if (linked.path !== finalPath || linked.taskId !== taskId || linked.generation !== final.version || final.metadata.uploadedBy !== owner || final.metadata.taskId !== taskId || final.contentType !== contentType || !(await photos.read(finalPath,final.version)).equals(bytes)) throw new CommandError(409,"Photo ID belongs to another saved upload.");
      return Response.json({saved:true},{headers});
    }
    const path = `projects/${projectId}/evidence-staging/${photoId}`;
    // Create-only staged files; existing retries must have identical bytes and identity.
    try { await photos.create(path, bytes, contentType, { uploadedBy: owner, taskId }); }
    catch (error) { if ((error as { code?: number }).code !== 412) throw error; }
    const info = await photos.info(path);
    const readback = await photos.read(path, info.version);
    if (info.metadata.uploadedBy !== owner || info.metadata.taskId !== taskId || info.contentType !== contentType || !readback.equals(bytes)) throw new CommandError(409, "Photo ID belongs to another upload. Original copy retained.");
    return Response.json({ saved: true }, { headers });
  } catch (error) { return failure(error); }
}
export async function GET(request: Request, context: Context) {
  try {
    const { project, photoId, projectId, owner, photos } = await access(request, context);
    const record = (await project.collection("evidence").doc(photoId).get()).data();
    const path = `projects/${projectId}/evidence/${photoId}`;
    if (!record || record.path !== path) throw new CommandError(404, "Photo is not linked to this project.");
    const info = await photos.info(path);
    if (info.metadata.uploadedBy !== owner || info.metadata.taskId !== record.taskId || info.version !== record.generation || !PHOTO_TYPES.includes(info.contentType)) throw new CommandError(409, "Photo identity needs review.");
    const bytes = await photos.read(path, info.version);
    return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Type": info.contentType } });
  } catch (error) { return failure(error); }
}
