import {
  collection,
  getDocs,
} from "firebase/firestore";
import { getBlob, getMetadata, ref, uploadBytes } from "firebase/storage";
import { sendTaskCommand } from "./task-command-client";
import { auth, db, storage } from "./firebase";
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
      if (!auth?.currentUser || auth.currentUser.uid!==row.ownerId || !storage) throw new Error("Use the original account to sync this photo.");
      const command=readQueuedCommands(localStorage,row.ownerId).find(item=>item.command.commandId===row.id && item.projectId===row.projectId && item.taskId===row.taskId);
      if (command?.state!=="saved") {
        if (!navigator.onLine) throw new Error("Offline. Photo is retained on this device; project save is pending.");
        if (!row.uploaded) {
          const object=ref(storage,`projects/${row.projectId}/evidence-staging/${row.id}`);
          let staged=false;
          try {const metadata=await getMetadata(object);staged=metadata.customMetadata?.taskId===row.taskId && metadata.customMetadata?.uploadedBy===row.ownerId;if(!staged)throw new Error("Staged photo identity does not match.");}
          catch(error) {if ((error as {code?:string}).code!=="storage/object-not-found")throw error;}
          if (!staged) {
            if (!row.file) throw new Error("Original photo is missing from device storage.");
            await uploadBytes(object,row.file,{contentType:row.file.type,customMetadata:{taskId:row.taskId,uploadedBy:row.ownerId}});
          }
          row={...row,uploaded:true};
          await saveQueuedPhoto(row);
        }
        if (auth.currentUser?.uid!==row.ownerId) throw new Error("Account changed before confirming the photo.");
        await sendTaskCommand(row.projectId,row.taskId,{kind:"evidence",evidenceId:row.id,caption:row.caption,category:row.category},row.id);
      }
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
