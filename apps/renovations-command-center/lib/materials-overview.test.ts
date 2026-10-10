import { describe, expect, it } from "vitest";
import type { RenovationTask } from "./tasks";
import { buildMaterialOverview, getMaterialOverviewSummary } from "./materials-overview";

function task(id: string, partial: Partial<RenovationTask>): RenovationTask {
  return {
    id,
    name: partial.name ?? id,
    roomId: null,
    phase: "prep",
    description: "",
    status: "ready",
    priority: "medium",
    championPersonId: null,
    helperPersonIds: [],
    dependencyTaskIds: [],
    helperRequired: false,
    estimatedDurationMinutes: 60,
    actualDurationMinutes: null,
    earliestStartDate: null,
    dueDate: null,
    scheduledStart: null,
    scheduledEnd: null,
    readinessState: "ready",
    readinessReasons: [],
    blockerType: "none",
    blockerNotes: "",
    blockedUntilDate: null,
    materialStatus: partial.materialStatus ?? "ready",
    materialItems: partial.materialItems ?? [],
    materialNotes: partial.materialNotes ?? "",
    materialNeededByDate: partial.materialNeededByDate ?? null,
    materialBlockerNotes: partial.materialBlockerNotes ?? "",
    criticalPathRisk: "none",
    photosRequired: false,
    canRunConcurrent: false,
    notes: ""
  };
}

describe("material overview", () => {
  it("groups duplicate material names and keeps the most restrictive status", () => {
    const items = buildMaterialOverview([
      task("one", { name: "Tile", materialItems: ["Thinset"], materialStatus: "ordered" }),
      task("two", { name: "Shower", materialItems: ["thinset"], materialStatus: "blocked" })
    ]);

    expect(items).toHaveLength(1);
    expect(items[0].status).toBe("blocked");
    expect(items[0].taskIds).toEqual(["one", "two"]);
  });

  it("surfaces missing material details when a task is material restricted", () => {
    const items = buildMaterialOverview([
      task("one", { materialItems: [], materialStatus: "needed" })
    ]);

    expect(items[0].name).toBe("Material details missing");
  });

  it("summarizes readiness states", () => {
    const items = buildMaterialOverview([
      task("one", { materialItems: ["A"], materialStatus: "blocked" }),
      task("two", { materialItems: ["B"], materialStatus: "ready" })
    ]);

    expect(getMaterialOverviewSummary(items)).toEqual({
      total: 2,
      blocked: 1,
      needed: 0,
      ordered: 0,
      ready: 1
    });
  });
});
