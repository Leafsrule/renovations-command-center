import { getTodayDateString } from "./scheduling";
export type WorkEvent = {
  id: string;
  taskId: string;
  taskName?: string;
  action: string;
  reason?: string;
  workNote?: string;
  workMinutes?: number;
  createdAt?: unknown;
};
export function dailyWorkReport(
  events: WorkEvent[],
  date: string,
  names: Record<string, string>,
) {
  const rows = events
    .filter((event) => {
      const value = event.createdAt as { seconds?: number } | undefined;
      return (
        typeof value?.seconds === "number" &&
        getTodayDateString(new Date(value.seconds * 1000)) === date
      );
    })
    .map((event) => ({
      ...event,
      name:
        event.taskName ||
        names[event.taskId] ||
        `Unavailable task (${event.taskId})`,
      minutes:
        Number.isFinite(event.workMinutes) && Number(event.workMinutes) > 0
          ? Number(event.workMinutes)
          : 0,
      note: event.workNote || event.reason || "",
    }));
  return {
    rows,
    totalMinutes: rows.reduce((total, row) => total + row.minutes, 0),
  };
}
