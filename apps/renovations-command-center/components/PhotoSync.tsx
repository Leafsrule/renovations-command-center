"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { listQueuedPhotos, removeQueuedPhoto, photoEvent, type QueuedPhoto } from "@/lib/photo-outbox";
import { isPhotoSyncing, retryQueuedPhoto } from "@/lib/evidence";
export function PhotoSync() {
  const {user}=useAuth();
  const [photos,setPhotos]=useState<QueuedPhoto[]>([]),[error,setError]=useState("");
  useEffect(()=>{
    if (!user) return;
    let live=true;
    const load=async()=>{try {const rows=await listQueuedPhotos(user.uid);if(live)setPhotos(rows);}catch(e){if(live)setError(e instanceof Error?e.message:"Photo device storage failed.");}};
    const replay=async()=>{try {for (const row of await listQueuedPhotos(user.uid)) if(row.state==="pending") await retryQueuedPhoto(row).catch(()=>{});}catch(e){if(live)setError(e instanceof Error?e.message:"Photo sync is unavailable.");}finally {await load();}};
    void replay();
    window.addEventListener(photoEvent,load);window.addEventListener("online",replay);
    return()=>{live=false;window.removeEventListener(photoEvent,load);window.removeEventListener("online",replay);};
  },[user]);
  if (!user) return null;
  const owned=photos.filter(p=>p.ownerId===user.uid);
  if (!owned.length && !error) return null;
  return <aside id="photo-sync" className="space-y-2 rounded border bg-white p-3 print:hidden" aria-label="Photo sync">
    <h2 className="font-semibold">Photos on this device</h2><p role="status">{error}</p>
    {owned.map(row=><div key={row.id} className="rounded border p-2"><p>{row.name}: {row.caption} — {row.state==="saved"?"Saved to project":"Not saved to project"}</p><p>{row.error}</p><Link href={`/projects/${row.projectId}/photos`}>Open project photos</Link>{row.state!=="saved"&&<button type="button" className="touch-target mx-2 rounded border px-3" onClick={()=>void retryQueuedPhoto(row).catch(()=>{})}>Retry photo</button>}<button type="button" className="touch-target rounded border px-3" onClick={()=>{if(isPhotoSyncing(row.id)){setError("Photo sync is in progress. Wait before discarding.");return;}if(row.state==="saved" || window.confirm("Discard the local photo and its pending upload? Project media already saved is preserved."))void removeQueuedPhoto(user.uid,row.id).catch(e=>setError(e.message));}}>{row.state==="saved"?"Dismiss receipt":"Discard local photo"}</button></div>)}
  </aside>;
}
