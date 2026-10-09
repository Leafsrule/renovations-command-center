// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { webcrypto } from "node:crypto";
import { Blob as NodeBlob, File as NodeFile } from "node:buffer";
import { beforeEach,it,expect,vi } from "vitest";
const mocks=vi.hoisted(()=>({auth:{currentUser:{uid:"owner",getIdToken:async()=>"test-token"}},request:vi.fn(),send:vi.fn()}));
vi.mock("./firebase",()=>({auth:mocks.auth,db:{},storage:{}}));
vi.mock("./task-command-client",()=>({sendTaskCommand:mocks.send}));
import { uploadEvidence,retryQueuedPhoto } from "./evidence";
import { listQueuedPhotos, removeQueuedPhoto } from "./photo-outbox";
const file=()=>new NodeFile(["real-device-photo-bytes"],"tile.png",{type:"image/png"}) as unknown as File;
beforeEach(async()=>{
  for(const row of await listQueuedPhotos("owner"))await removeQueuedPhoto("owner",row.id);
  vi.clearAllMocks();localStorage.clear();mocks.auth.currentUser={uid:"owner",getIdToken:async()=>"test-token"};
  vi.stubGlobal("crypto",webcrypto);vi.stubGlobal("fetch",mocks.request);
  vi.spyOn(navigator,"onLine","get").mockReturnValue(true);
  mocks.request.mockImplementation(async(_url:string,options:{method?:string})=>({ok:true,blob:async()=>new NodeBlob(["real-device-photo-bytes"],{type:"image/png"}),json:async()=>({saved:true}),method:options.method}));mocks.send.mockResolvedValue({});
});
it("retains bytes offline without uploading or claiming a project save",async()=>{
  vi.spyOn(navigator,"onLine","get").mockReturnValue(false);
  expect(await uploadEvidence("ensuite","tile",file(),"Before tile","Before")).toBe(false);
  const [row]=await listQueuedPhotos("owner");
  expect(await row.file!.text()).toBe("real-device-photo-bytes");
  expect(row.state).toBe("pending");expect(row.uploaded).toBe(false);
  expect(mocks.request).not.toHaveBeenCalled();expect(mocks.send).not.toHaveBeenCalled();
});
it("replays an interrupted confirmation with the same evidence ID and without another upload",async()=>{
  mocks.send.mockRejectedValueOnce(new Error("Acknowledgement lost"));
  expect(await uploadEvidence("ensuite","tile",file(),"Tile","During")).toBe(false);
  const [row]=await listQueuedPhotos("owner");expect(row.uploaded).toBe(true);
  await retryQueuedPhoto(row);
  expect(mocks.request.mock.calls.filter(([,options])=>options.method==="POST")).toHaveLength(1);expect(mocks.send).toHaveBeenCalledTimes(2);
  expect(mocks.send.mock.calls[0][3]).toBe(mocks.send.mock.calls[1][3]);
  expect((await listQueuedPhotos("owner"))[0]).toMatchObject({state:"saved",file:null});
});
it("does not confirm a staged file after an account change",async()=>{
  mocks.request.mockImplementationOnce(async()=>{mocks.auth.currentUser={uid:"other",getIdToken:async()=>"other-token"};return {ok:true};});
  expect(await uploadEvidence("ensuite","tile",file(),"Tile","During")).toBe(false);
  expect(mocks.send).not.toHaveBeenCalled();
  const [row]=await listQueuedPhotos("owner");expect(row.state).toBe("pending");expect(row.file).not.toBeNull();
  expect(await listQueuedPhotos("other")).toEqual([]);
});

it("keeps original bytes after successful command acknowledgment until matching private readback",async()=>{
  mocks.request.mockImplementation(async(_url:string,options:{method?:string})=>({ok:true,blob:async()=>new NodeBlob([options.method==="POST"?"real-device-photo-bytes":"changed-private-bytes"])}));
  expect(await uploadEvidence("ensuite","tile",file(),"Tile","During")).toBe(false);
  const [row]=await listQueuedPhotos("owner");expect(row.file).not.toBeNull();expect(row.state).toBe("pending");
  expect(row.error).toContain("readback");
});
