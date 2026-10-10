import {
  collection,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { calculateCalendarPlan } from "./calendar";
import { getProjectSettings } from "./project-settings";
import { toTask } from "./tasks";
import { getTodayDateString } from "./scheduling";
import type { AvailablePerson } from "./person-availability";
/** Optimistic whole-plan write: changes to settings or task documents abort the recalculation. */
export async function recalculateSchedule(projectId: string) {
  if (!db) throw new Error("Firestore is not configured.");
  const [settings, raw, rawPeople] = await Promise.all([
    getProjectSettings(projectId),
    getDocs(collection(db, "projects", projectId, "tasks")),
    getDocs(collection(db, "projects", projectId, "people")),
  ]);
  const tasks = raw.docs.map((d) => toTask(d.id, d.data()));
  if (tasks.length > 400)
    throw new Error(
      "This project exceeds the safe single-transaction limit. No dates were changed.",
    );
  const original = new Map(
    raw.docs.map((d) => [d.id, JSON.stringify(d.data())]),
  );
  // Re-read the same task documents atomically before writing planned dates.
  const plan = calculateCalendarPlan(
    tasks,
    settings.calendar,
    getTodayDateString(),
    rawPeople.docs.map(d=>({id:d.id,...d.data()}) as AvailablePerson),
  );
  await runTransaction(db, async (tx) => {
    const settingsRef = doc(db!, "projects", projectId, "settings", "planning");
    const currentSettings = await tx.get(settingsRef);
    if (Number(currentSettings.data()?.version || 0) !== settings.version)
      throw new Error("Calendar changed. Reload and recalculate.");
    const snapshots = await Promise.all(
      tasks.map((t) => tx.get(doc(db!, "projects", projectId, "tasks", t.id))),
    );
    const currentPeople = await Promise.all(rawPeople.docs.map(d=>tx.get(doc(db!,"projects",projectId,"people",d.id))));
    for (let i=0;i<currentPeople.length;i++) if (!currentPeople[i].exists() || JSON.stringify(currentPeople[i].data()) !== JSON.stringify(rawPeople.docs[i].data())) throw new Error("Person availability changed. Reload and recalculate.");
    for (const snapshot of snapshots) {
      if (
        !snapshot.exists() ||
        JSON.stringify(snapshot.data()) !== original.get(snapshot.id)
      )
        throw new Error(
          "Tasks changed on another device. Reload and recalculate.",
        );
    }
    for (const date of plan.dates)
      tx.update(doc(db!, "projects", projectId, "tasks", date.taskId), {
        scheduledStart: date.start,
        scheduledEnd: date.end,
        updatedAt: serverTimestamp(),
      });
    // A blocked task must not retain stale dates from a previously valid plan.
    for (const blocked of plan.blocked)
      tx.update(doc(db!, "projects", projectId, "tasks", blocked.taskId), {
        scheduledStart: null,
        scheduledEnd: null,
        updatedAt: serverTimestamp(),
      });
    tx.set(doc(collection(db!, "projects", projectId, "scheduleRuns")), {
      createdAt: serverTimestamp(),
      settingsVersion: settings.version,
      taskCount: tasks.length,
      blocked: plan.blocked,
      dates: plan.dates,
    });
  });
  return plan;
}
