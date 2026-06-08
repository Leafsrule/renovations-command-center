import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type PersonRoleType =
  | "owner"
  | "champion"
  | "helper"
  | "contractor"
  | "viewer"
  | "other";

export type RenovationPerson = {
  id: string;
  name: string;
  roleType: PersonRoleType;
  contact: {
    email: string;
    phone: string;
  };
  skillTags: string[];
  availabilityNotes: string;
  active: boolean;
  linkedUserId: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type PersonFormInput = {
  name: string;
  roleType: PersonRoleType;
  email: string;
  phone: string;
  skillTagsText: string;
  availabilityNotes: string;
  active: boolean;
};

export type PeopleCount = {
  total: number;
  active: number;
};

function requireDb() {
  if (!db) {
    throw new Error(
      "Firestore is not configured yet. Check your Firebase values in .env.local."
    );
  }

  return db;
}

function peopleCollection(projectId: string) {
  return collection(requireDb(), "projects", projectId, "people");
}

function personDocument(projectId: string, personId: string) {
  return doc(requireDb(), "projects", projectId, "people", personId);
}

export function parseSkillTags(value: string) {
  return value
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
}

function roleTypeFromValue(value: unknown): PersonRoleType {
  const roleType = String(value || "helper");

  if (
    roleType === "owner" ||
    roleType === "champion" ||
    roleType === "helper" ||
    roleType === "contractor" ||
    roleType === "viewer" ||
    roleType === "other"
  ) {
    return roleType;
  }

  return "helper";
}

function toPerson(id: string, data: Record<string, unknown>): RenovationPerson {
  const contact =
    data.contact && typeof data.contact === "object"
      ? (data.contact as Record<string, unknown>)
      : {};

  return {
    id,
    name: String(data.name || ""),
    roleType: roleTypeFromValue(data.roleType),
    contact: {
      email: String(contact.email || ""),
      phone: String(contact.phone || "")
    },
    skillTags: Array.isArray(data.skillTags)
      ? data.skillTags.map(String)
      : [],
    availabilityNotes: String(data.availabilityNotes || ""),
    active: typeof data.active === "boolean" ? data.active : true,
    linkedUserId:
      typeof data.linkedUserId === "string" ? data.linkedUserId : null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
}

export async function listProjectPeople(projectId: string) {
  const snapshot = await getDocs(peopleCollection(projectId));
  const people = snapshot.docs.map((personDoc) =>
    toPerson(personDoc.id, personDoc.data())
  );

  return people.sort((a, b) => a.name.localeCompare(b.name));
}

export async function countProjectPeople(
  projectId: string
): Promise<PeopleCount> {
  const people = await listProjectPeople(projectId);

  return {
    total: people.length,
    active: people.filter((person) => person.active).length
  };
}

export async function createProjectPerson(
  projectId: string,
  input: PersonFormInput
) {
  await addDoc(peopleCollection(projectId), {
    name: input.name.trim(),
    roleType: input.roleType || "helper",
    contact: {
      email: input.email.trim(),
      phone: input.phone.trim()
    },
    skillTags: parseSkillTags(input.skillTagsText),
    availabilityNotes: input.availabilityNotes.trim(),
    active: true,
    linkedUserId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateProjectPerson(
  projectId: string,
  personId: string,
  input: PersonFormInput
) {
  await updateDoc(personDocument(projectId, personId), {
    name: input.name.trim(),
    roleType: input.roleType,
    contact: {
      email: input.email.trim(),
      phone: input.phone.trim()
    },
    skillTags: parseSkillTags(input.skillTagsText),
    availabilityNotes: input.availabilityNotes.trim(),
    active: input.active,
    updatedAt: serverTimestamp()
  });
}
