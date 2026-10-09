import { beforeEach, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({services:vi.fn(),verify:vi.fn(),project:vi.fn(),task:vi.fn(),evidence:vi.fn(),info:vi.fn(),read:vi.fn(),create:vi.fn(),removeStaging:vi.fn()}));
vi.mock("@/lib/server/firebase-admin",()=>({adminServices:mocks.services}));
import { GET, POST } from "./[projectId]/photos/[photoId]/route";
const context={params:Promise.resolve({projectId:"project",photoId:"photo"})};
function request(method="GET",body?:string,headers:Record<string,string>={}) {return new Request("https://app.test/api",{method,headers:{Authorization:"Bearer valid","Content-Type":"image/png","x-task-id":"tile",...headers},body});}
beforeEach(()=>{
  vi.resetAllMocks();
  mocks.verify.mockResolvedValue({uid:"owner"});
  mocks.project.mockResolvedValue({data:()=>({ownerUserId:"owner"})});
  mocks.task.mockResolvedValue({exists:true});
  mocks.evidence.mockResolvedValue({data:()=>({path:"projects/project/evidence/photo",taskId:"tile",generation:"supabase:id:v1"})});
  mocks.info.mockResolvedValue({version:"supabase:id:v1",size:3,contentType:"image/png",metadata:{uploadedBy:"owner",taskId:"tile"}});
  mocks.read.mockResolvedValue(Buffer.from("abc"));
  mocks.services.mockReturnValue({auth:{verifyIdToken:mocks.verify},db:{doc:()=>({get:mocks.project,collection:(kind:string)=>({doc:()=>({get:kind==="tasks"?mocks.task:mocks.evidence})})})},bucket:{info:mocks.info,read:mocks.read,create:mocks.create,removeStaging:mocks.removeStaging}});
});
it("rejects missing/revoked identity and cross-owner access before any private file operation",async()=>{
  expect((await GET(request("GET",undefined,{Authorization:""}),context)).status).toBe(401);
  expect(mocks.services).not.toHaveBeenCalled();
  mocks.verify.mockRejectedValueOnce(new Error("revoked"));
  expect((await GET(request(),context)).status).toBe(401);
  expect(mocks.verify).toHaveBeenCalledWith("valid",true);
  mocks.project.mockResolvedValueOnce({data:()=>({ownerUserId:"another"})});
  expect((await POST(request("POST","abc"),context)).status).toBe(403);
  expect(mocks.info).not.toHaveBeenCalled();expect(mocks.create).not.toHaveBeenCalled();
});
it("serves only linked immutable private bytes without reusable download URLs or cache",async()=>{
  const response=await GET(request(),context);
  expect(response.status).toBe(200);expect(await response.text()).toBe("abc");
  expect(response.headers.get("cache-control")).toBe("private, no-store");expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  mocks.info.mockResolvedValueOnce({version:"changed",contentType:"image/png",metadata:{uploadedBy:"owner",taskId:"tile"}});
  expect((await GET(request(),context)).status).toBe(409);
});
it("stages image bytes only for an existing task and verifies exact readback",async()=>{
  mocks.evidence.mockResolvedValue({data:()=>undefined});
  expect((await POST(request("POST","abc"),context)).status).toBe(200);
  expect(mocks.create).toHaveBeenCalledWith("projects/project/evidence-staging/photo",Buffer.from("abc"),"image/png",{uploadedBy:"owner",taskId:"tile"});
  mocks.read.mockResolvedValueOnce(Buffer.from("xyz"));
  expect((await POST(request("POST","abc"),context)).status).toBe(409);
  mocks.task.mockResolvedValueOnce({exists:false});expect((await POST(request("POST","abc"),context)).status).toBe(404);
});
it("replays a saved upload without recreating staging and rejects different bytes",async()=>{
  expect((await POST(request("POST","abc"),context)).status).toBe(200);expect(mocks.create).not.toHaveBeenCalled();
  expect((await POST(request("POST","changed"),context)).status).toBe(409);
});
it("rejects invalid types, oversized actual streams and hides provider errors",async()=>{
  expect((await POST(request("POST","abc",{"Content-Type":"text/html"}),context)).status).toBe(400);
  expect((await POST(request("POST","x".repeat(10*1024*1024),{"Content-Length":"1"}),context)).status).toBe(413);
  expect(mocks.create).not.toHaveBeenCalled();
  mocks.info.mockRejectedValueOnce(new Error("SECRET PROVIDER KEY"));
  const response=await GET(request(),context);expect(response.status).toBe(503);expect(await response.text()).not.toContain("SECRET");
});
