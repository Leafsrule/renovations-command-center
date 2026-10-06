import {
  collection,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { deleteObject, getBlob, ref, uploadBytes } from "firebase/storage";
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
    path = `projects/${projectId}/evidence/${id}`;
  const object = ref(storage, path);
  await uploadBytes(object, file, { contentType: file.type });
  try {
    await runTransaction(db, async (tx) => {
      const taskRef = doc(db!, "projects", projectId, "tasks", taskId);
      const task = await tx.get(taskRef);
      if (!task.exists()) throw new Error("The linked task no longer exists.");
      if (auth?.currentUser?.uid !== uid)
        throw new Error("Account changed during upload. Please try again.");
      tx.set(doc(db!, "projects", projectId, "evidence", id), {
        taskId,
        caption: caption.trim(),
        category,
        path,
        uploadedBy: uid,
        createdAt: serverTimestamp(),
      });
      tx.update(taskRef, {
        evidenceCount: Number(task.data().evidenceCount || 0) + 1,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    await deleteObject(object).catch(() => undefined);
    throw error;
  }
}
