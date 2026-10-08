import {
  addDoc,
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
import { db } from "@/lib/firebase";

export type ProjectType = "custom" | "bathroom_ensuite";
export type ProjectStatus =
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
  const existingProjects = await listOwnerProjects(ownerUserId);
  const activeProject = existingProjects.length === 0;

  const projectRef = await addDoc(collection(requireDb(), "projects"), {
    name: input.name.trim(),
    type: input.type,
    status: "planning",
    scope: input.scope.trim(),
    startDate: input.startDate,
    targetFinishDate: input.targetFinishDate,
    activeProject,
    ownerUserId,
    currentPhase: "setup",
    criticalPathWarning: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  if (input.type === "bathroom_ensuite") {
    const stages = [
      ["Confirm scope, measurements and required inspections", "setup"],
      ["Plan protection, safe demolition and waste removal", "demolition"],
      ["Prepare substrate and confirm rough-in work", "prep"],
      ["Verify waterproofing requirements and inspection", "waterproofing"],
      ["Plan tile installation and manufacturer curing periods", "tile"],
      ["Fit fixtures, check workmanship and clean up", "fixtures"]
    ];
    const refs = stages.map(() => doc(collection(requireDb(),"projects",projectRef.id,"tasks")));
    const templateBatch = writeBatch(requireDb());
    stages.forEach(([name,phase],index)=>templateBatch.set(refs[index],{name,phase,status:"draft",priority:"medium",dependencyTaskIds:index?[refs[index-1].id]:[],helperPersonIds:[],helperRequired:false,estimatedDurationMinutes:null,readinessState:"not_ready",materialStatus:"needed",photosRequired:false,notes:"Template planning item: verify scope, measurements, estimates, materials and inspection requirements before work.",createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
    await templateBatch.commit();
  }
  return projectRef.id;
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

export async function updateOwnerProject(projectId: string, ownerUserId: string, input: CreateProjectInput & {status: ProjectStatus}, expectedRevision: string) {
  if (!input.name.trim()) throw new Error("Project name is required.");
  if (input.startDate && input.targetFinishDate && input.targetFinishDate < input.startDate) throw new Error("Target finish must not precede project start.");
  if ([input.startDate,input.targetFinishDate].some(date=>date && !validDate(date))) throw new Error("Choose valid project dates.");
  const ref=doc(requireDb(),"projects",projectId);
  await runTransaction(requireDb(),async tx=>{
    const current=await tx.get(ref);
    if (!current.exists() || current.data().ownerUserId !== ownerUserId) throw new Error("Project is unavailable.");
    if (taskRevision(current.data().updatedAt) !== expectedRevision) throw new Error("CONFLICT: Project changed on another device. Reload and compare your draft before saving.");
    tx.update(ref,{name:input.name.trim(),scope:input.scope.trim(),type:input.type,startDate:input.startDate,targetFinishDate:input.targetFinishDate,status:input.status,updatedAt:serverTimestamp()});
  });
}
