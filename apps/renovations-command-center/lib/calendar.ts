import { addDaysToDateString } from "./scheduling";
import type { RenovationTask } from "./tasks";
import { assignedPeople, assignedWorkMinutes, personHasWorkdays, type AvailablePerson } from "./person-availability";
import { getTodayDateString } from "./scheduling";

export type WorkCalendar = {
  workdays: number[];
  hoursPerDay: number;
  bufferPercent: number;
  blackouts: string[];
};
export const DEFAULT_CALENDAR: WorkCalendar = {
  workdays: [1, 2, 3, 4, 5],
  hoursPerDay: 8,
  bufferPercent: 20,
  blackouts: [],
};
export function validateCalendar(value: WorkCalendar): WorkCalendar {
  if (
    !Array.isArray(value.workdays) ||
    value.workdays.length === 0 ||
    value.workdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
  )
    throw new Error("Choose at least one valid workday.");
  if (
    !Number.isFinite(value.hoursPerDay) ||
    value.hoursPerDay <= 0 ||
    value.hoursPerDay > 24
  )
    throw new Error(
      "Work hours must be greater than zero and no more than 24.",
    );
  if (
    !Number.isFinite(value.bufferPercent) ||
    value.bufferPercent < 0 ||
    value.bufferPercent >= 100
  )
    throw new Error("Buffer must be between 0 and 99 percent.");
  if (
    !Array.isArray(value.blackouts) ||
    value.blackouts.filter(Boolean).some((d) => !validDate(d))
  )
    throw new Error("Blackouts must be valid dates.");
  return {
    ...value,
    workdays: [...new Set(value.workdays)],
    blackouts: [...new Set(value.blackouts.filter(Boolean))].sort(),
  };
}
export function validDate(value: string): boolean {
  const date = new Date(`${value}T12:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}
export function calendarMinutes(date: string, calendar: WorkCalendar): number {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return calendar.workdays.includes(day) && !calendar.blackouts.includes(date)
    ? Math.floor(calendar.hoursPerDay * 60 * (1 - calendar.bufferPercent / 100))
    : 0;
}
export type CalendarPlan = {
  dates: { taskId: string; start: string; end: string }[];
  blocked: { taskId: string; reason: string }[];
};
/** Conservative one-worker plan. Never marks physical work complete. All assignments serialize. */
export function calculateCalendarPlan(
  tasks: RenovationTask[],
  calendar: WorkCalendar,
  startDate: string,
  people: AvailablePerson[] = [],
): CalendarPlan {
  validateCalendar(calendar);
  if (!validDate(startDate))
    throw new Error("Choose a valid schedule start date.");
  const map = new Map(tasks.map((t) => [t.id, t]));
  const pending = tasks
    .filter((t) => !["complete", "cancelled"].includes(t.status))
    .sort(
      (a, b) =>
        ({ urgent: 0, high: 1, medium: 2, low: 3 })[a.priority] -
          { urgent: 0, high: 1, medium: 2, low: 3 }[b.priority] ||
        a.id.localeCompare(b.id),
    );
  const plan: CalendarPlan = { dates: [], blocked: [] };
  const endById = new Map<string, string>();
  let cursor = startDate,
    used = 0;
  let changed = true;
  while (pending.length && changed) {
    changed = false;
    for (let i = 0; i < pending.length; i++) {
      const task = pending[i];
      if (
        task.dependencyTaskIds.some(
          (id) => map.get(id)?.status !== "complete" && !endById.has(id),
        )
      )
        continue;
      pending.splice(i--, 1);
      changed = true;
      const reason =
        task.status === "design" || task.readinessState === "design"
          ? "Task is in Design"
          : task.blockerType !== "none" || task.status === "blocked"
          ? "Active blocker"
          : task.helperRequired && task.helperPersonIds.length === 0
            ? "Required helper is unassigned"
            : assignedPeople(task).some(id=>!personHasWorkdays(people.find(person=>person.id===id),calendar))
              ? "Assigned person has no verified workdays in the project calendar"
            : task.requiredItemsReady === false ||
                !["not_required", "ready", "received", "stock"].includes(task.materialStatus)
              ? "Materials are unavailable"
              : !task.estimatedDurationMinutes ||
                  task.estimatedDurationMinutes <= 0
                ? "Positive work estimate required"
                : task.status === "waiting_curing" && !task.cureUntil
                  ? "Waiting period requires a release time"
                  : null;
      if (reason) {
        plan.blocked.push({ taskId: task.id, reason });
        continue;
      }
      const earliest = [
        cursor,
        task.earliestStartDate ?? cursor,
        task.blockedUntilDate ?? cursor,
        // Day-only plans conservatively reserve the full release day for a timed wait.
        task.cureUntil ? addDaysToDateString(getTodayDateString(new Date(task.cureUntil)),1) : cursor,
        ...task.dependencyTaskIds.map((id) => endById.get(id) ?? cursor),
      ]
        .sort()
        .at(-1)!;
      if (earliest > cursor) {
        cursor = earliest;
        used = 0;
      }
      let minutes = task.estimatedDurationMinutes!,
        start = "",
        attempts = 0;
      while (minutes > 0) {
        if (++attempts > 3660)
          throw new Error(
            "Schedule exceeds ten years. Review work calendar and estimates.",
          );
        const capacity = Math.min(calendarMinutes(cursor, calendar),assignedWorkMinutes(task,people,cursor,calendar)) - used;
        if (capacity <= 0) {
          cursor = addDaysToDateString(cursor, 1);
          used = 0;
          continue;
        }
        if (!start) start = cursor;
        const work = Math.min(capacity, minutes);
        used += work;
        minutes -= work;
      }
      plan.dates.push({ taskId: task.id, start, end: cursor });
      endById.set(task.id, cursor);
      // Hard finish-to-start: downstream work begins on the following workday.
      if (tasks.some((t) => t.dependencyTaskIds.includes(task.id)))
        endById.set(task.id, addDaysToDateString(cursor, 1));
    }
  }
  for (const task of pending)
    plan.blocked.push({
      taskId: task.id,
      reason: "Incomplete, cancelled, missing or cyclic prerequisite",
    });
  return plan;
}
