import "fake-indexeddb/auto";
import { it, expect } from "vitest";
import { listQueuedPhotos, saveQueuedPhoto, removeQueuedPhoto, type QueuedPhoto } from "./photo-outbox";
const photo:QueuedPhoto={id:"queued-photo",ownerId:"owner",projectId:"ensuite",taskId:"tile",file:new Blob(["retained-photo-bytes"],{type:"image/png"}),name:"tile.png",caption:"During work",category:"During",uploaded:false,state:"pending",error:""};
it("retains actual bytes across reopened IndexedDB connections and scopes them to the original account",async()=>{
  await saveQueuedPhoto(photo);
  expect(await listQueuedPhotos("other")).toEqual([]);
  const [read]=await listQueuedPhotos("owner");
  expect(await read.file!.text()).toBe("retained-photo-bytes");
  await expect(removeQueuedPhoto("other",photo.id)).rejects.toThrow(/account/);
  expect(await listQueuedPhotos("owner")).toHaveLength(1);
  await saveQueuedPhoto({...read,uploaded:true});
  expect((await listQueuedPhotos("owner"))[0].uploaded).toBe(true);
  await saveQueuedPhoto({...read,state:"saved",file:null});
  expect((await listQueuedPhotos("owner"))[0].file).toBeNull();
  await removeQueuedPhoto("owner",photo.id);
  expect(await listQueuedPhotos("owner")).toEqual([]);
});
it("does not acknowledge a pending photo without retained bytes",async()=>{
  await expect(saveQueuedPhoto({...photo,id:"missing-bytes",file:null})).rejects.toThrow(/Invalid/);
  expect(await listQueuedPhotos("owner")).toEqual([]);
});
