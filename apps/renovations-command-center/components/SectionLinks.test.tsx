// @vitest-environment jsdom
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, it, expect, vi } from "vitest";
const mocks=vi.hoisted(()=>({tasks:vi.fn(),rooms:vi.fn(),people:vi.fn()}));
vi.mock("next/navigation",()=>({useParams:()=>({projectId:"project"}),useRouter:()=>({push:vi.fn()})}));
vi.mock("@/lib/firebase",()=>({auth:{currentUser:{uid:"owner"}},db:null}));
vi.mock("./AuthProvider",()=>({useAuth:()=>({user:{uid:"owner"}})}));
vi.mock("@/lib/tasks",async original=>({...await original<object>(),listProjectTasks:mocks.tasks}));
vi.mock("@/lib/rooms",async original=>({...await original<object>(),listProjectRooms:mocks.rooms}));
vi.mock("@/lib/people",async original=>({...await original<object>(),listProjectPeople:mocks.people}));
import { TaskManager } from "./TaskManager";
import { ProjectEditor } from "./ProjectEditor";
import { toTask } from "@/lib/task-model";
import type { RenovationProject } from "@/lib/projects";
import { focusLinkedSection } from "@/lib/section-navigation";
beforeEach(()=>{localStorage.clear();window.history.replaceState(null,"","/projects/project/tasks");mocks.tasks.mockResolvedValue([toTask("tile",{name:"Tile shower",status:"draft",phase:"tile",materialStatus:"needed"})]);mocks.rooms.mockResolvedValue([]);mocks.people.mockResolvedValue([]);});
afterEach(cleanup);
it("links status and summary badges to the associated task form and filtered schedule",async()=>{
 render(<TaskManager/>);await screen.findByText("Tile shower");
 expect(screen.getByRole("link",{name:"Draft"}).getAttribute("href")).toBe("/projects/project/tasks?edit=tile#task-status");
 expect(screen.getByRole("link",{name:/Waiting on materials:/}).getAttribute("href")).toBe("/projects/project/schedule?filter=waiting_on_materials#schedule-tasks");
});
it("opens the specific task editor after asynchronous loading and focuses its linked section",async()=>{
 window.history.replaceState(null,"","/projects/project/tasks?edit=tile#task-materials");render(<TaskManager/>);await screen.findByText("Edit Task");
 await waitFor(()=>expect(document.activeElement?.closest("#task-materials")).toBeTruthy());
 expect((document.activeElement as HTMLSelectElement).value).toBe("needed");
});
it("opens a collapsed project editor at the phase field; invalid fragments do not crash",async()=>{
 window.history.replaceState(null,"","/projects/project#project-phase");render(<ProjectEditor project={{id:"project",name:"Ensuite",scope:"",startDate:"",targetFinishDate:"",status:"planning",currentPhase:"design",type:"custom"} as RenovationProject} onSaved={()=>{}}/>);
 await waitFor(()=>expect(screen.getByText("Edit / archive / reopen project").closest("details")?.open).toBe(true));
 expect(document.activeElement?.closest("#project-phase")).toBeTruthy();
 window.history.replaceState(null,"","/projects/project#%");expect(()=>focusLinkedSection()).not.toThrow();
});

vi.mock("./FieldRecordsWorkspace",()=>({FieldRecordsWorkspace:()=>null}));
import { ScheduleBoard } from "./ScheduleBoard";
import { MaterialsWorkspace } from "./MaterialsWorkspace";
it("schedule summary tiles and view tabs are direct links to filtered records",async()=>{
 mocks.tasks.mockResolvedValue([toTask("done",{name:"Finished painting",status:"complete",materialStatus:"not_required"}),toTask("open",{name:"Draft tile",status:"draft",materialStatus:"needed"})]);
 window.history.replaceState(null,"","/projects/project/schedule?filter=completed#schedule-tasks");render(<ScheduleBoard/>);
 await screen.findByText("Finished painting");expect(screen.queryByText("Draft tile")).toBeNull();
 expect(screen.getByRole("link",{name:/^1\/2 Complete$/}).getAttribute("href")).toBe("/projects/project/schedule?filter=completed#schedule-tasks");
 expect(screen.getByRole("link",{name:"Day"}).getAttribute("href")).toBe("/projects/project/schedule?view=day#schedule-tasks");
});
it("material summary tiles open matching materials while keeping other records out of the filtered list",async()=>{
 mocks.tasks.mockResolvedValue([toTask("need",{name:"Tile",materialStatus:"needed",materialItems:["Tiles"]}),toTask("stock",{name:"Paint",materialStatus:"stock",materialItems:["Paint"]})]);
 window.history.replaceState(null,"","/projects/project/materials?filter=needed#material-overview");render(<MaterialsWorkspace/>);
 await screen.findByRole("heading",{name:"Tiles"});expect(screen.queryByRole("heading",{name:"Paint"})).toBeNull();
 expect(screen.getByRole("link",{name:/^1 Needed$/}).getAttribute("href")).toBe("/projects/project/materials?filter=needed#material-overview");
});
it("Add task links open the actual form rather than an intermediate placeholder",async()=>{
 window.history.replaceState(null,"","/projects/project/tasks?new=1#task-form");render(<TaskManager/>);await screen.findByRole("heading",{name:"Add Task"});
 expect(document.getElementById("task-form")).toBeTruthy();expect(document.activeElement?.closest("#task-form")).toBeTruthy();
});
