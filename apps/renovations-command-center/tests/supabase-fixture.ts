import type { StorageClient } from "@supabase/storage-js";
export function fakePrivateStorage() {
  const objects = new Map<string,{bytes:Buffer;contentType:string;version:string}>();
  let nextVersion=0;
  const client={
    getBucket:async()=>({data:{public:false}}),
    from:()=>({
      upload:async(path:string,bytes:Buffer,options:{contentType:string;upsert:boolean})=>{
        if(options.upsert)throw new Error("Overwrite forbidden");
        if(objects.has(path))return {error:{statusCode:"409",message:"exists"}};
        objects.set(path,{bytes:Buffer.from(bytes),contentType:options.contentType,version:`version${++nextVersion}`});return {data:{id:"file"}};
      },
      info:async(path:string)=>{const o=objects.get(path);return o?{data:{id:"file",version:o.version,size:o.bytes.length,contentType:o.contentType}}:{error:{statusCode:"404",message:"missing"}};},
      download:async(path:string)=>({data:new Blob([new Uint8Array(objects.get(path)!.bytes)])}),
      remove:async(paths:string[])=>{for(const path of paths)objects.delete(path);return {data:[]};},
    }),
  };
  return {client:client as unknown as StorageClient,objects};
}
