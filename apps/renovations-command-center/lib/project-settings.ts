import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  DEFAULT_CALENDAR,
  validateCalendar,
  type WorkCalendar,
} from "./calendar";

export type ProjectSettings = { calendar: WorkCalendar; version: number };
export async function getProjectSettings(
  projectId: string,
): Promise<ProjectSettings> {
  if (!db) throw new Error("Firestore is not configured.");
  const snapshot = await getDoc(
    doc(db, "projects", projectId, "settings", "planning"),
  );
  const data = snapshot.data();
  return {
    calendar: data?.calendar
      ? validateCalendar(data.calendar as WorkCalendar)
      : DEFAULT_CALENDAR,
    version: Number(data?.version || 0),
  };
}
export async function saveProjectSettings(
  projectId: string,
  settings: ProjectSettings,
) {
  if (!db) throw new Error("Firestore is not configured.");
  const calendar = validateCalendar(settings.calendar);
  const ref = doc(db, "projects", projectId, "settings", "planning");
  await runTransaction(db, async (tx) => {
    const current = await tx.get(ref);
    if (Number(current.data()?.version || 0) !== settings.version)
      throw new Error(
        "Settings changed on another device. Reload before saving.",
      );
    tx.set(ref, {
      calendar,
      version: settings.version + 1,
      updatedAt: serverTimestamp(),
    });
  });
}
