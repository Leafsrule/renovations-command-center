// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({upload:vi.fn(),list:vi.fn(),tasks:vi.fn()}));
vi.mock("next/navigation",()=>({useParams:()=>({projectId:"project"})}));
vi.mock("./AuthProvider",()=>({useAuth:()=>({user:{uid:"owner"}})}));
vi.mock("@/lib/photo-outbox",()=>({photoEvent:"rcc-photos-change",listQueuedPhotos:async()=>[]}));
vi.mock("@/lib/tasks",()=>({listProjectTasks:mocks.tasks}));
vi.mock("@/lib/evidence",()=>({listEvidence:mocks.list,uploadEvidence:mocks.upload,evidenceBlob:vi.fn()}));
import { EvidenceWorkspace } from "./EvidenceWorkspace";
beforeEach(()=>{vi.clearAllMocks();mocks.tasks.mockResolvedValue([{id:"tile",name:"Tile shower"}]);mocks.list.mockResolvedValue([]);mocks.upload.mockResolvedValue(true);});
afterEach(cleanup);
async function prepare(){render(<EvidenceWorkspace/>);await screen.findByRole("option",{name:"Tile shower"});fireEvent.change(screen.getByLabelText("Task"),{target:{value:"tile"}});const input=screen.getByLabelText("Photo or receipt image") as HTMLInputElement;const file=new File(["image bytes"],"tile.png",{type:"image/png"});fireEvent.change(input,{target:{files:[file]}});return {file,input};}
it("responds to Upload media with clear guidance instead of a silently disabled button",async()=>{
 render(<EvidenceWorkspace/>);await screen.findByRole("option",{name:"Tile shower"});
 const button=screen.getByRole("button",{name:"Upload media"}) as HTMLButtonElement;expect(button.disabled).toBe(false);fireEvent.click(button);
 expect(screen.getByRole("status").textContent).toMatch(/Choose the task/);expect(document.activeElement).toBe(screen.getByLabelText("Task"));
 fireEvent.change(screen.getByLabelText("Task"),{target:{value:"tile"}});fireEvent.click(button);
 expect(screen.getByRole("status").textContent).toMatch(/Choose a photo/);expect(mocks.upload).not.toHaveBeenCalled();
});
it("defines every type using plain labels while preserving stored values and alphabetical order",async()=>{
 render(<EvidenceWorkspace/>);const select=screen.getByLabelText("Photo / document type") as HTMLSelectElement;
 expect(Array.from(select.options).map(o=>o.text)).toEqual(["Before work","Finished work","Inspection record","Problem or damage","Purchase receipt","Work in progress"]);
 fireEvent.change(select,{target:{value:"Receipt"}});expect(screen.getByText(/proof of purchase/)).toBeTruthy();expect(select.value).toBe("Receipt");
});
it("submits the selected file/task and clears the native file field after confirmation",async()=>{
 const {file,input}=await prepare();fireEvent.click(screen.getByRole("button",{name:"Upload media"}));
 await waitFor(()=>expect(screen.getByRole("status").textContent).toMatch(/Saved to this project and linked/));
 expect(mocks.upload).toHaveBeenCalledWith("project","tile",file,"","During",expect.any(Function));expect(input.value).toBe("");
 fireEvent.click(screen.getByRole("button",{name:"Upload media"}));expect(mocks.upload).toHaveBeenCalledTimes(1);expect(screen.getByRole("status").textContent).toMatch(/Choose a photo/);
});
it("shows the actual pending error next to Upload and preserves a confirmed save when list refresh fails",async()=>{
 mocks.upload.mockImplementationOnce(async(...args:unknown[])=>{(args[5] as (s:string)=>void)("Offline. Reconnect to retry.");return false;});
 await prepare();fireEvent.click(screen.getByRole("button",{name:"Upload media"}));await waitFor(()=>expect(screen.getByRole("status").textContent).toMatch(/Offline.*retained on this device/));
 cleanup();await prepare();mocks.list.mockRejectedValueOnce(new Error("Refresh failed"));fireEvent.click(screen.getByRole("button",{name:"Upload media"}));
 await waitFor(()=>expect(screen.getByRole("status").textContent).toMatch(/Saved to this project.*could not refresh/));
});
