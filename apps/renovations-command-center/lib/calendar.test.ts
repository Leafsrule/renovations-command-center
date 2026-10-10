import { describe, it, expect } from "vitest";
import {
  DEFAULT_CALENDAR,
  calculateCalendarPlan,
  calendarMinutes,
  validateCalendar,
  validDate,
} from "./calendar";
import { getTodayDateString } from "./scheduling";
import type { RenovationTask } from "./tasks";
const task = (id: string, partial: Partial<RenovationTask> = {}) =>
  ({
    id,
    name: id,
    status: "ready",
    priority: "medium",
    dependencyTaskIds: [],
    helperRequired: false,
    helperPersonIds: [],
    materialStatus: "not_required",
    blockerType: "none",
    estimatedDurationMinutes: 60,
    ...partial,
  }) as RenovationTask;
describe("Toronto work calendar", () => {
  it("uses Toronto date around midnight and both DST transitions", () => {
    expect(getTodayDateString(new Date("2026-10-07T02:00:00Z"))).toBe(
      "2026-10-06",
    );
    expect(getTodayDateString(new Date("2026-03-08T07:00:00Z"))).toBe(
      "2026-03-08",
    );
    expect(getTodayDateString(new Date("2026-11-01T06:00:00Z"))).toBe(
      "2026-11-01",
    );
  });
  it("excludes weekends and blackouts and reserves the buffer", () => {
    expect(calendarMinutes("2026-10-10", DEFAULT_CALENDAR)).toBe(0);
    expect(
      calendarMinutes("2026-10-06", {
        ...DEFAULT_CALENDAR,
        blackouts: ["2026-10-06"],
      }),
    ).toBe(0);
    expect(calendarMinutes("2026-10-06", DEFAULT_CALENDAR)).toBe(384);
  });
  it("rejects impossible dates and calendars", () => {
    expect(validDate("2026-02-30")).toBe(false);
    expect(() =>
      validateCalendar({ ...DEFAULT_CALENDAR, workdays: [] }),
    ).toThrow();
    expect(() =>
      validateCalendar({ ...DEFAULT_CALENDAR, hoursPerDay: NaN }),
    ).toThrow();
  });
  it("serializes work and schedules hard successors after predecessors", () => {
    const plan = calculateCalendarPlan(
      [task("later", { dependencyTaskIds: ["first"] }), task("first")],
      DEFAULT_CALENDAR,
      "2026-10-09",
    );
    expect(plan.dates.find((t) => t.taskId === "first")?.start).toBe(
      "2026-10-09",
    );
    expect(plan.dates.find((t) => t.taskId === "later")?.start).toBe(
      "2026-10-12",
    );
  });
  it("retains cancelled, missing and cyclic dependency blocks", () => {
    const plan = calculateCalendarPlan(
      [
        task("cancelled", { status: "cancelled" }),
        task("blocked", { dependencyTaskIds: ["cancelled"] }),
        task("a", { dependencyTaskIds: ["b"] }),
        task("b", { dependencyTaskIds: ["a"] }),
        task("missing", { dependencyTaskIds: ["unknown"] }),
      ],
      DEFAULT_CALENDAR,
      "2026-10-06",
    );
    expect(plan.dates).toHaveLength(0);
    expect(plan.blocked).toHaveLength(4);
  });
  it("does not invent helper availability or release indefinite curing", () => {
    const plan = calculateCalendarPlan(
      [
        task("helper", { helperRequired: true }),
        task("cure", { status: "waiting_curing" }),
      ],
      DEFAULT_CALENDAR,
      "2026-10-06",
    );
    expect(plan.dates).toHaveLength(0);
    expect(plan.blocked).toHaveLength(2);
  });
});
