import {
  collection,
  getDocs,
} from "firebase/firestore";
import { getBlob, ref, uploadBytes } from "firebase/storage";
import { sendTaskCommand } from "./task-command-client";
import { auth, db, storage } from "./firebase";
export type Evidence = {
  id: string;
  taskId: string;
  caption: string;
  category: string;
  path: string;
};
export async function listEvidence(projectId: string): Promise<Evidence[]> {
  if (!db) throw new Error("Firestore is not configured.");
  const result = await getDocs(
    collection(db, "projects", projectId, "evidence"),
  );
  return result.docs.map((d) => ({ id: d.id, ...d.data() }) as Evidence);
}
export async function evidenceBlob(path: string) {
  if (!storage) throw new Error("Storage is not configured.");
  return getBlob(ref(storage, path));
}
export async function uploadEvidence(
  projectId: string,
  taskId: string,
  file: File,
  caption: string,
  category: string,
) {
  if (!db || !storage || !auth?.currentUser)
    throw new Error("Sign in to the configured project before uploading.");
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size >= 10 * 1024 * 1024
  )
    throw new Error("Choose a JPG, PNG or WebP smaller than 10 MB.");
  const uid = auth.currentUser.uid,
    id = crypto.randomUUID(),
    path = `projects/${projectId}/evidence-staging/${id}`;
  const object = ref(storage, path);
  await uploadBytes(object, file, { contentType: file.type, customMetadata:{taskId, uploadedBy:uid} });
  try {
    await sendTaskCommand(projectId, taskId, {kind:"evidence", evidenceId:id, caption, category}, id);
  } catch (error) {
    // Keep the uploaded object until the durable command confirms or is reviewed.
    // Deleting after an uncertain response would destroy evidence needed by replay.
    throw error;
  }
}
