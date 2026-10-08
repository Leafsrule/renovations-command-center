// @vitest-environment jsdom
import { beforeEach,it,expect,vi } from "vitest";
import { webcrypto } from "node:crypto";
const mocks=vi.hoisted(()=>({currentUser:{uid:"owner",getIdToken:async()=>"demo-token"} as {uid:string;getIdToken:()=>Promise<string>}|null}));
vi.mock("@/lib/firebase",()=>({db:{},auth:mocks}));
import { createOwnerProject } from "./projects";
const input={name:"Ensuite",type:"bathroom_ensuite" as const,scope:"Tile",startDate:"",targetFinishDate:""};
beforeEach(()=>{localStorage.clear();vi.stubGlobal("crypto",webcrypto);mocks.currentUser={uid:"owner",getIdToken:async()=>"demo-token"};});
it("reuses the original destination after an interrupted response and keeps atomic creation on the server",async()=>{
  const fetcher=vi.fn().mockRejectedValueOnce(new Error("Response lost")).mockImplementationOnce(async(_url:string,options:{body:string})=>({ok:true,json:async()=>({projectId:JSON.parse(options.body).projectId})}));
  vi.stubGlobal("fetch",fetcher);
  await expect(createOwnerProject("owner",input)).rejects.toThrow(/unconfirmed/);
  await createOwnerProject("owner",input);
  expect(JSON.parse(fetcher.mock.calls[0][1].body).projectId).toBe(JSON.parse(fetcher.mock.calls[1][1].body).projectId);
  expect(localStorage.getItem("rcc:project-create:owner")).toBeNull();
});
it("rejects changed pending input and wrong account without dispatch",async()=>{
  const fetcher=vi.fn().mockRejectedValue(new Error("offline"));vi.stubGlobal("fetch",fetcher);
  await expect(createOwnerProject("owner",input)).rejects.toThrow();
  await expect(createOwnerProject("owner",{...input,name:"Changed"})).rejects.toThrow(/previous/);
  mocks.currentUser={uid:"other",getIdToken:async()=>"other"};
  await expect(createOwnerProject("owner",input)).rejects.toThrow(/Sign in/);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
