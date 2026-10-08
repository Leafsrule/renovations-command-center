import { validId } from "./task-command";
export type QueuedPhoto = {id:string;ownerId:string;projectId:string;taskId:string;file:Blob|null;name:string;caption:string;category:string;uploaded:boolean;state:"pending"|"failed"|"conflicting"|"saved";error:string};
const databaseName="rcc-private-photo-outbox-v1";
export const photoEvent="rcc-photos-change";
async function database() {
  return new Promise<IDBDatabase>((resolve,reject)=>{
    const request=indexedDB.open(databaseName,1);
    request.onupgradeneeded=()=>request.result.createObjectStore("photos",{keyPath:"id"});
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(new Error("Photo device storage is unavailable. Keep the original photo."));
    request.onblocked=()=>reject(new Error("Close older app tabs and retry photo storage."));
  });
}
async function transaction<T>(mode:IDBTransactionMode, operation:(store:IDBObjectStore)=>IDBRequest<T>) {
  const db=await database();
  try {return await new Promise<T>((resolve,reject)=>{
    const tx=db.transaction("photos",mode), request=operation(tx.objectStore("photos"));
    let result:T;
    request.onsuccess=()=>{result=request.result;};
    tx.oncomplete=()=>resolve(result);
    tx.onerror=tx.onabort=()=>reject(new Error("Photo was not retained on this device. Keep the original file and retry."));
  });} finally {db.close();}
}
export async function saveQueuedPhoto(row:QueuedPhoto) {
  if (![row.id,row.ownerId,row.projectId,row.taskId].every(validId) || (row.state!=="saved" && !row.file)) throw new Error("Invalid queued photo.");
  await transaction("readwrite",store=>store.put(row));
  if (typeof window!=="undefined") window.dispatchEvent(new Event(photoEvent));
}
export async function listQueuedPhotos(ownerId:string) {
  const rows=await transaction<QueuedPhoto[]>("readonly",store=>store.getAll());
  return rows.filter(row=>row.ownerId===ownerId);
}
export async function removeQueuedPhoto(ownerId:string,id:string) {
  const rows=await listQueuedPhotos(ownerId);
  if (!rows.some(row=>row.id===id)) throw new Error("Photo is unavailable for this account.");
  await transaction("readwrite",store=>store.delete(id));
  if (typeof window!=="undefined") window.dispatchEvent(new Event(photoEvent));
}
