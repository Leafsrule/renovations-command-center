import {
  collection,
  getDocs,
} from "firebase/firestore";
import { sendTaskCommand } from "./task-command-client";
import { auth, db } from "./firebase";
import { saveQueuedPhoto, type QueuedPhoto } from "./photo-outbox";
import { readQueuedCommands } from "./command-queue";
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
async function photoRequest(projectId: string, photoId: string, options: RequestInit = {}) {
  const user = auth?.currentUser;
  if (!user) throw new Error("Sign in before accessing photos.");
  const token = await user.getIdToken();
  if (auth?.currentUser?.uid !== user.uid) throw new Error("Account changed before accessing photos.");
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/photos/${encodeURIComponent(photoId)}`, { ...options, cache: "no-store", headers: { ...options.headers, Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Photo access failed. Keep the device copy.");
  }
  if (auth?.currentUser?.uid !== user.uid) throw new Error("Account changed while accessing photos.");
  return response;
}
export async function evidenceBlob(path: string) {
  const match = /^projects\/([^/]+)\/evidence\/([^/]+)$/.exec(path);
  if (!match) throw new Error("Invalid photo path.");
  return (await photoRequest(match[1], match[2])).blob();
}
export async function uploadEvidence(
  projectId: string,
  taskId: string,
  file: File,
  caption: string,
  category: string,
) {
  if (!db || !auth?.currentUser)
    throw new Error("Sign in to the configured project before uploading.");
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size <= 0 || file.size >= 10 * 1024 * 1024
  )
    throw new Error("Choose a JPG, PNG or WebP smaller than 10 MB.");
  const row:QueuedPhoto={id:crypto.randomUUID(),ownerId:auth.currentUser.uid,projectId,taskId,file,name:file.name,caption,category,uploaded:false,state:"pending",error:""};
  await saveQueuedPhoto(row);
  // Capture succeeds only after the IndexedDB transaction commits.
  try {await retryQueuedPhoto(row);return true;} catch { return false; /* The visible durable outbox reports unsaved/error state. */ }
}
const runningPhotos=new Map<string,Promise<void>>();
export function isPhotoSyncing(id:string) {return runningPhotos.has(id);}
export async function retryQueuedPhoto(original:QueuedPhoto) {
  const running=runningPhotos.get(original.id);
  if (running) return running;
  const attempt=async()=>{
    let row={...original};
    try {
      if (!auth?.currentUser || auth.currentUser.uid!==row.ownerId) throw new Error("Use the original account to sync this photo.");
      const command=readQueuedCommands(localStorage,row.ownerId).find(item=>item.command.commandId===row.id && item.projectId===row.projectId && item.taskId===row.taskId);
      if (command?.state!=="saved") {
        if (!navigator.onLine) throw new Error("Offline. Photo is retained on this device; project save is pending.");
        if (!row.uploaded) {
          if (!row.file) throw new Error("Original photo is missing from device storage.");
          await photoRequest(row.projectId,row.id,{method:"POST", headers:{"Content-Type":row.file.type,"x-task-id":row.taskId},body:row.file});
          row={...row,uploaded:true};
          await saveQueuedPhoto(row);
        }
        if (auth.currentUser?.uid!==row.ownerId) throw new Error("Account changed before confirming the photo.");
        await sendTaskCommand(row.projectId,row.taskId,{kind:"evidence",evidenceId:row.id,caption:row.caption,category:row.category},row.id);
      }
      const final = await evidenceBlob(`projects/${row.projectId}/evidence/${row.id}`);
      if (row.file) {
        const originalBytes = await row.file.arrayBuffer(), finalBytes = await final.arrayBuffer();
        const hash = async (bytes: ArrayBuffer) => new Uint8Array(await crypto.subtle.digest("SHA-256",bytes));
        const [a,b] = await Promise.all([hash(originalBytes),hash(finalBytes)]);
        if (a.some((value,index)=>value!==b[index])) throw new Error("Photo readback failed. Original stays on this device.");
      }
      if (auth?.currentUser?.uid!==row.ownerId) throw new Error("Account changed before confirming the photo.");
      await saveQueuedPhoto({...row,file:null,state:"saved",error:""});
    } catch(error) {
      const command=readQueuedCommands(localStorage,row.ownerId).find(item=>item.command.commandId===row.id);
      await saveQueuedPhoto({...row,state:command?.state==="conflicting"?"conflicting":command?.state==="failed"?"failed":"pending",error:error instanceof Error?error.message:"Photo save is unconfirmed."});
      throw error;
    }
  };
  const promise=attempt();runningPhotos.set(original.id,promise);
  try {await promise;} finally {runningPhotos.delete(original.id);}
}
