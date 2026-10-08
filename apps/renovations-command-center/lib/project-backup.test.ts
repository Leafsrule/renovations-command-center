import { describe, it, expect } from "vitest";
import { validateProjectBackup, type ProjectBackup } from "./project-backup";
const backup = (): ProjectBackup => ({
  application: "Renovations Command Center",
  schemaVersion: 1,
  projectId: "ensuite",
  createdAt: "2026-10-06",
  project: { ownerUserId: "owner", name: "Ensuite" },
  collections: {
    tasks: [
      { id: "tile", data: { dependencyTaskIds: [], status: "complete" } },
    ],
  },
});
describe("app-scoped backup validation", () => {
  it("preserves IDs and historical statuses", () => {
    const value = validateProjectBackup(backup(), "owner");
    expect(value.collections.tasks[0]).toEqual({
      id: "tile",
      data: { dependencyTaskIds: [], status: "complete" },
    });
  });
  it("rejects tracker backups and different account ownership", () => {
    expect(() =>
      validateProjectBackup(
        { ...backup(), application: "Site Control" },
        "owner",
      ),
    ).toThrow();
    expect(() => validateProjectBackup(backup(), "someone-else")).toThrow();
  });
  it("rejects duplicate IDs and orphaned dependencies", () => {
    const value = backup();
    value.collections.tasks.push(value.collections.tasks[0]);
    expect(() => validateProjectBackup(value, "owner")).toThrow(/duplicate/);
    const orphan = backup();
    orphan.collections.tasks[0].data.dependencyTaskIds = ["missing"];
    expect(() => validateProjectBackup(orphan, "owner")).toThrow(/orphaned/);
  });
  it("refuses oversized atomic restores before any write", () => {
    const value = backup();
    value.collections.rooms = Array.from({ length: 450 }, (_, i) => ({
      id: String(i),
      data: { name: String(i) },
    }));
    expect(() => validateProjectBackup(value, "owner")).toThrow(/limit/);
  });
  it("rejects circular dependencies before a restore begins",()=>{
    const value=backup();value.collections.tasks[0].data.dependencyTaskIds=["tile"];
    expect(()=>validateProjectBackup(value,"owner")).toThrow(/circular/);
  });
});
