import { it, expect } from "vitest";
import { dailyWorkReport } from "./work-report";
const event = (id: string, date: string, minutes?: number) => ({
  id,
  taskId: "task",
  action: "quality_and_work_record",
  workMinutes: minutes,
  createdAt: { seconds: Date.parse(date) / 1000 },
});
it("groups midnight and DST work by Toronto day without invented hours", () => {
  const report = dailyWorkReport(
    [
      event("late", "2026-10-09T02:00:00Z", 45),
      event("next", "2026-10-09T05:00:00Z", 60),
      event("action", "2026-10-08T15:00:00Z"),
      {
        ...event("no-date", "2026-10-08T15:00:00Z", 100),
        createdAt: undefined,
      },
    ],
    "2026-10-08",
    { task: "Tile" },
  );
  expect(report.rows.map((row) => row.id)).toEqual(["late", "action"]);
  expect(report.totalMinutes).toBe(45);
  const dst = dailyWorkReport(
    [
      event("first", "2026-11-01T05:30:00Z", 30),
      event("second", "2026-11-01T06:30:00Z", 30),
    ],
    "2026-11-01",
    {},
  );
  expect(dst.totalMinutes).toBe(60);
});
it("preserves the recorded task name and reason when a task is unavailable", () => {
  const report = dailyWorkReport(
    [
      {
        ...event("saved", "2026-10-08T15:00:00Z", 20),
        taskName: "Original vanity",
        workNote: "Fitted base",
      },
    ],
    "2026-10-08",
    { task: "Renamed" },
  );
  expect(report.rows[0]).toMatchObject({
    name: "Original vanity",
    note: "Fitted base",
  });
});
