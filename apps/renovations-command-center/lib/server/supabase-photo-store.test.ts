import { beforeEach, expect, it, vi } from "vitest";
import type { Firestore } from "firebase-admin/firestore";
import type { StorageClient } from "@supabase/storage-js";
import { supabasePhotoStore, FREE_PHOTO_CAPACITY } from "./supabase-photo-store";
import { photoHash } from "./photo-store";
let records: Map<string, Record<string, unknown>>, objects: Map<string, { bytes: Buffer; type: string; version: string }>;
let store: ReturnType<typeof supabasePhotoStore>;
let publicBucket = false, interrupt = false, failDelete = false;
const path="projects/project/evidence-staging/photo", metadata={uploadedBy:"owner",taskId:"tile"};
const bytes=Buffer.from("private-image");
const upload=vi.fn();
beforeEach(()=>{
  records=new Map();objects=new Map();publicBucket=false;interrupt=false;failDelete=false;upload.mockReset();
  const ref=(key:string)=>({key,get:async()=>({exists:records.has(key),data:()=>records.get(key)})});
  const db={doc:ref,runTransaction:async(fn:(tx:unknown)=>unknown)=>fn({get:(r:ReturnType<typeof ref>)=>r.get(),set:(r:ReturnType<typeof ref>,v:Record<string,unknown>)=>records.set(r.key,v),create:(r:ReturnType<typeof ref>,v:Record<string,unknown>)=>records.set(r.key,v),update:(r:ReturnType<typeof ref>,v:Record<string,unknown>)=>records.set(r.key,{...records.get(r.key),...v}),delete:(r:ReturnType<typeof ref>)=>records.delete(r.key)})};
  upload.mockImplementation(async(p:string,b:Buffer,o:{contentType:string;upsert:boolean})=>{
    expect(o.upsert).toBe(false);
    if(objects.has(p))return {error:{statusCode:"409",message:"exists"}};
    objects.set(p,{bytes:Buffer.from(b),type:o.contentType,version:"version1"});
    return interrupt ? {error:{statusCode:"503",message:"lost response"}} : {data:{id:"object1"}};
  });
  const client={getBucket:async()=>({data:{public:publicBucket}}),from:()=>({upload,info:async(p:string)=>{const o=objects.get(p);return o?{data:{id:"object1",version:o.version,size:o.bytes.length,contentType:o.type}}:{error:{statusCode:"404",message:"missing"}};},download:async(p:string)=>({data:new Blob([new Uint8Array(objects.get(p)!.bytes)])}),remove:async(paths:string[])=>{for(const p of paths)objects.delete(p);return failDelete?{error:{statusCode:"503",message:"lost delete response"}}:{data:[]};}})};
  store=supabasePhotoStore(db as unknown as Firestore,client as unknown as StorageClient,"private-photos");
});
it("creates immutable private bytes and retries identical uploads without reserving twice",async()=>{
  await store.create(path,bytes,"image/png",metadata);await store.create(path,bytes,"image/png",metadata);
  expect(records.get("photoStorage/capacity")?.reservedBytes).toBe(bytes.length);
  const info=await store.info(path);expect(info.version).toBe("supabase:object1:version1");
  expect(await store.read(path,info.version)).toEqual(bytes);
  await expect(store.create(path,Buffer.from("different"),"image/png",metadata)).rejects.toMatchObject({status:409});
  expect(objects.get(path)?.bytes).toEqual(bytes);
});
it("recovers a lost provider upload response using the same reservation and bytes",async()=>{
  interrupt=true;await expect(store.create(path,bytes,"image/png",metadata)).rejects.toMatchObject({status:503});
  expect(records.get("photoStorage/capacity")?.reservedBytes).toBe(bytes.length);
  await expect(store.info(path)).rejects.toMatchObject({code:404});
  interrupt=false;await store.create(path,bytes,"image/png",metadata);
  expect(records.get("photoStorage/capacity")?.reservedBytes).toBe(bytes.length);
  expect((await store.info(path)).metadata.sha256).toBe(photoHash(bytes));
});
it("rejects public buckets and quota exhaustion before creating provider objects",async()=>{
  publicBucket=true;await expect(store.create(path,bytes,"image/png",metadata)).rejects.toMatchObject({status:503});expect(upload).not.toHaveBeenCalled();
  publicBucket=false;records.set("photoStorage/capacity",{reservedBytes:FREE_PHOTO_CAPACITY});
  await expect(store.create(path,bytes,"image/png",metadata)).rejects.toMatchObject({status:507});expect(upload).not.toHaveBeenCalled();
});
it("rejects modified versions and modified same-sized bytes on authenticated readback",async()=>{
  await store.create(path,bytes,"image/png",metadata);const info=await store.info(path);
  objects.get(path)!.version="changed";await expect(store.read(path,info.version)).rejects.toMatchObject({status:409});
  objects.get(path)!.version="version1";objects.get(path)!.bytes=Buffer.alloc(bytes.length,1);
  await expect(store.read(path,info.version)).rejects.toMatchObject({status:409});
});
it("retains capacity after uncertain cleanup, blocks recreation and resumes cleanup exactly once",async()=>{
  await store.create(path,bytes,"image/png",metadata);failDelete=true;
  await expect(store.removeStaging(path)).rejects.toMatchObject({status:503});
  expect(records.get("photoStorage/capacity")?.reservedBytes).toBe(bytes.length);
  await expect(store.create(path,bytes,"image/png",metadata)).rejects.toMatchObject({status:409});
  failDelete=false;await store.removeStaging(path);await store.removeStaging(path);
  expect(records.get("photoStorage/capacity")?.reservedBytes).toBe(0);
  await expect(store.removeStaging("projects/project/evidence/photo")).rejects.toMatchObject({status:400});
});
it("rejects traversal and invalid image declarations without reserving storage",async()=>{
  await expect(store.create("projects/project/evidence/../photo",bytes,"image/png",metadata)).rejects.toMatchObject({status:400});
  await expect(store.create(path,bytes,"text/html",metadata)).rejects.toMatchObject({status:400});
  expect(records.size).toBe(0);
});
