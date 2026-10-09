import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  runTransaction,
  writeBatch
} from "firebase/firestore";
import { taskRevision } from "./task-command";
import { validDate } from "./calendar";
import { auth, db } from "@/lib/firebase";

export type ProjectType = "custom" | "bathroom_ensuite";
export type ProjectStatus =
  | "design"
  | "planning"
  | "active"
  | "blocked"
  | "behind_schedule"
  | "on_hold"
  | "complete"
  | "archived";

export type RenovationProject = {
  id: string;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  scope: string;
  startDate: string;
  targetFinishDate: string;
  activeProject: boolean;
  ownerUserId: string;
  currentPhase: string;
  criticalPathWarning: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type CreateProjectInput = {
  name: string;
  type: ProjectType;
  scope: string;
  startDate: string;
  targetFinishDate: string;
};

function requireDb() {
  if (!db) {
    throw new Error(
      "Firestore is not configured yet. Check your Firebase values in .env.local."
    );
  }

  return db;
}

function toProject(id: string, data: Record<string, unknown>): RenovationProject {
  return {
    id,
    name: String(data.name || ""),
    type: data.type === "bathroom_ensuite" ? "bathroom_ensuite" : "custom",
    status: String(data.status || "planning") as ProjectStatus,
    scope: String(data.scope || ""),
    startDate: String(data.startDate || ""),
    targetFinishDate: String(data.targetFinishDate || ""),
    activeProject: Boolean(data.activeProject),
    ownerUserId: String(data.ownerUserId || ""),
    currentPhase: String(data.currentPhase || "setup"),
    criticalPathWarning: Boolean(data.criticalPathWarning),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
}

export async function listOwnerProjects(ownerUserId: string) {
  const projectsQuery = query(
    collection(requireDb(), "projects"),
    where("ownerUserId", "==", ownerUserId)
  );
  const snapshot = await getDocs(projectsQuery);
  const projects = snapshot.docs.map((projectDoc) =>
    toProject(projectDoc.id, projectDoc.data())
  );

  return projects.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getOwnerProject(projectId: string, ownerUserId: string) {
  const projectDoc = await getDoc(doc(requireDb(), "projects", projectId));

  if (!projectDoc.exists()) {
    return null;
  }

  const project = toProject(projectDoc.id, projectDoc.data());

  if (project.ownerUserId !== ownerUserId) {
    return null;
  }

  return project;
}

export async function createOwnerProject(
  ownerUserId: string,
  input: CreateProjectInput
) {
  if (!auth?.currentUser || auth.currentUser.uid !== ownerUserId) throw new Error("Sign in before creating a project.");
  if (!input.name.trim() || !["custom","bathroom_ensuite"].includes(input.type)) throw new Error("Choose a project name and type.");
  if ([input.startDate,input.targetFinishDate].some(date=>date && !validDate(date)) || (input.startDate && input.targetFinishDate && input.targetFinishDate<input.startDate)) throw new Error("Choose valid project dates in order.");
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(input))))).map(n=>n.toString(16).padStart(2,"0")).join("");
  const key=`rcc:project-create:${ownerUserId}`;
  let pending: {id:string;digest:string;input:CreateProjectInput};
  try {
    const raw=localStorage.getItem(key);
    pending=raw ? JSON.parse(raw) : {id:crypto.randomUUID(),digest,input};
    if (pending.digest !== digest) throw new Error("A previous project creation is unconfirmed. Retry its original draft before changing it.");
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(pending.id)) throw new Error("Stored project request is invalid.");
    localStorage.setItem(key,JSON.stringify(pending));
  } catch (error) {
    throw new Error(error instanceof Error && /previous|invalid/.test(error.message) ? error.message : "Device storage failed. No project was submitted.");
  }
  const token=await auth.currentUser.getIdToken();
  if (auth?.currentUser?.uid !== ownerUserId) throw new Error("Account changed. Project was not submitted.");
  let response: Response;
  try { response=await fetch("/api/projects/create",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({projectId:pending.id,input})}); }
  catch { throw new Error("Project creation is unconfirmed. Draft and request ID are kept on this device; retry online."); }
  const result=await response.json();
  if (!response.ok || result.projectId!==pending.id) throw new Error(result.error || "Project creation is unconfirmed. Retry the retained draft.");
  try { localStorage.removeItem(key); } catch { /* The acknowledged destination remains safely retryable. */ }
  return pending.id;
}

export function recoverProjectCreationInput(ownerUserId:string):CreateProjectInput | null {
  try {const row=JSON.parse(localStorage.getItem(`rcc:project-create:${ownerUserId}`) ?? "null");return row?.input ?? null;} catch {return null;}
}

export async function setActiveOwnerProject(
  ownerUserId: string,
  projectId: string
) {
  const projects = await listOwnerProjects(ownerUserId);
  if (!projects.some(project => project.id === projectId)) throw new Error("Choose an available project owned by your account.");
  const batch = writeBatch(requireDb());

  projects.forEach((project) => {
    batch.update(doc(requireDb(), "projects", project.id), {
      activeProject: project.id === projectId,
      updatedAt: serverTimestamp()
    });
  });

  await batch.commit();
}

export async function updateOwnerProject(projectId: string, ownerUserId: string, input: CreateProjectInput & {status: ProjectStatus; currentPhase?: string}, expectedRevision: string) {
  if (!input.name.trim()) throw new Error("Project name is required.");
  if (input.startDate && input.targetFinishDate && input.targetFinishDate < input.startDate) throw new Error("Target finish must not precede project start.");
  if ([input.startDate,input.targetFinishDate].some(date=>date && !validDate(date))) throw new Error("Choose valid project dates.");
  const ref=doc(requireDb(),"projects",projectId);
  await runTransaction(requireDb(),async tx=>{
    const current=await tx.get(ref);
    if (!current.exists() || current.data().ownerUserId !== ownerUserId) throw new Error("Project is unavailable.");
    if (taskRevision(current.data().updatedAt) !== expectedRevision) throw new Error("CONFLICT: Project changed on another device. Reload and compare your draft before saving.");
    tx.update(ref,{name:input.name.trim(),scope:input.scope.trim(),type:input.type,startDate:input.startDate,targetFinishDate:input.targetFinishDate,status:input.status,...(input.currentPhase ? {currentPhase:input.currentPhase} : {}),updatedAt:serverTimestamp()});
  });
}
