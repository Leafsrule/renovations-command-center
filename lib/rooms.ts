import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type FloorLevel =
  | "basement"
  | "main_floor"
  | "second_floor"
  | "exterior"
  | "garage"
  | "other";

export type RoomStatus =
  | "not_started"
  | "planning"
  | "active"
  | "blocked"
  | "complete";

export type RoomPriority = "low" | "medium" | "high";

export type RenovationRoom = {
  id: string;
  name: string;
  floorLevel: FloorLevel;
  dimensions: string;
  status: RoomStatus;
  priority: RoomPriority;
  notes: string;
  tradeCategories: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type RoomFormInput = {
  name: string;
  floorLevel: FloorLevel;
  dimensions: string;
  priority: RoomPriority;
  notes: string;
};

function requireDb() {
  if (!db) {
    throw new Error(
      "Firestore is not configured yet. Check your Firebase values in .env.local."
    );
  }

  return db;
}

function roomsCollection(projectId: string) {
  return collection(requireDb(), "projects", projectId, "rooms");
}

function roomDocument(projectId: string, roomId: string) {
  return doc(requireDb(), "projects", projectId, "rooms", roomId);
}

function toRoom(id: string, data: Record<string, unknown>): RenovationRoom {
  return {
    id,
    name: String(data.name || ""),
    floorLevel: String(data.floorLevel || "other") as FloorLevel,
    dimensions: String(data.dimensions || ""),
    status: String(data.status || "planning") as RoomStatus,
    priority: String(data.priority || "medium") as RoomPriority,
    notes: String(data.notes || ""),
    tradeCategories: Array.isArray(data.tradeCategories)
      ? data.tradeCategories.map(String)
      : [],
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
}

export async function listProjectRooms(projectId: string) {
  const snapshot = await getDocs(roomsCollection(projectId));
  const rooms = snapshot.docs.map((roomDoc) =>
    toRoom(roomDoc.id, roomDoc.data())
  );

  return rooms.sort((a, b) => a.name.localeCompare(b.name));
}

export async function countProjectRooms(projectId: string) {
  const rooms = await listProjectRooms(projectId);

  return rooms.length;
}

export async function createProjectRoom(projectId: string, input: RoomFormInput) {
  await addDoc(roomsCollection(projectId), {
    name: input.name.trim(),
    floorLevel: input.floorLevel,
    dimensions: input.dimensions.trim(),
    status: "planning",
    priority: input.priority,
    notes: input.notes.trim(),
    tradeCategories: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateProjectRoom(
  projectId: string,
  roomId: string,
  input: RoomFormInput
) {
  await updateDoc(roomDocument(projectId, roomId), {
    name: input.name.trim(),
    floorLevel: input.floorLevel,
    dimensions: input.dimensions.trim(),
    priority: input.priority,
    notes: input.notes.trim(),
    updatedAt: serverTimestamp()
  });
}
