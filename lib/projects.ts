import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch
} from "firebase/firestore";
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

  return projectRef.id;
}

export async function setActiveOwnerProject(
  ownerUserId: string,
  projectId: string
) {
  const projects = await listOwnerProjects(ownerUserId);
  const batch = writeBatch(requireDb());

  projects.forEach((project) => {
    batch.update(doc(requireDb(), "projects", project.id), {
      activeProject: project.id === projectId,
      updatedAt: serverTimestamp()
    });
  });

  await batch.commit();
}
