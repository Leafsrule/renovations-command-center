// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { File as NodeFile } from "node:buffer";
import { beforeEach,it,expect,vi } from "vitest";
const mocks=vi.hoisted(()=>({auth:{currentUser:{uid:"owner"}},metadata:vi.fn(),upload:vi.fn(),send:vi.fn()}));
vi.mock("./firebase",()=>({auth:mocks.auth,db:{},storage:{}}));
vi.mock("firebase/storage",()=>({getBlob:vi.fn(),getMetadata:mocks.metadata,ref:(_storage:unknown,path:string)=>path,uploadBytes:mocks.upload}));
vi.mock("./task-command-client",()=>({sendTaskCommand:mocks.send}));
import { uploadEvidence,retryQueuedPhoto } from "./evidence";
import { listQueuedPhotos, removeQueuedPhoto } from "./photo-outbox";
const file=()=>new NodeFile(["real-device-photo-bytes"],"tile.png",{type:"image/png"}) as unknown as File;
beforeEach(async()=>{
  for(const row of await listQueuedPhotos("owner"))await removeQueuedPhoto("owner",row.id);
  vi.clearAllMocks();localStorage.clear();mocks.auth.currentUser={uid:"owner"};
  vi.spyOn(navigator,"onLine","get").mockReturnValue(true);
  mocks.metadata.mockRejectedValue({code:"storage/object-not-found"});mocks.upload.mockResolvedValue({});mocks.send.mockResolvedValue({});
});
it("retains bytes offline without uploading or claiming a project save",async()=>{
  vi.spyOn(navigator,"onLine","get").mockReturnValue(false);
  expect(await uploadEvidence("ensuite","tile",file(),"Before tile","Before")).toBe(false);
  const [row]=await listQueuedPhotos("owner");
  expect(await row.file!.text()).toBe("real-device-photo-bytes");
  expect(row.state).toBe("pending");expect(row.uploaded).toBe(false);
  expect(mocks.upload).not.toHaveBeenCalled();expect(mocks.send).not.toHaveBeenCalled();
});
it("replays an interrupted confirmation with the same evidence ID and without another upload",async()=>{
  mocks.send.mockRejectedValueOnce(new Error("Acknowledgement lost"));
  expect(await uploadEvidence("ensuite","tile",file(),"Tile","During")).toBe(false);
  const [row]=await listQueuedPhotos("owner");expect(row.uploaded).toBe(true);
  await retryQueuedPhoto(row);
  expect(mocks.upload).toHaveBeenCalledTimes(1);expect(mocks.send).toHaveBeenCalledTimes(2);
  expect(mocks.send.mock.calls[0][3]).toBe(mocks.send.mock.calls[1][3]);
  expect((await listQueuedPhotos("owner"))[0]).toMatchObject({state:"saved",file:null});
});
it("does not confirm a staged file after an account change",async()=>{
  mocks.upload.mockImplementationOnce(async()=>{mocks.auth.currentUser={uid:"other"};});
  expect(await uploadEvidence("ensuite","tile",file(),"Tile","During")).toBe(false);
  expect(mocks.send).not.toHaveBeenCalled();
  const [row]=await listQueuedPhotos("owner");expect(row.state).toBe("pending");expect(row.file).not.toBeNull();
  expect(await listQueuedPhotos("other")).toEqual([]);
});
