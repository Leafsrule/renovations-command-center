import { describe, it, expect } from "vitest";
import { validateTaskEdit } from "./task-integrity";
import type { TaskFormInput, RenovationTask } from "./tasks";
const input = {
  name: "Install door",
  status: "ready",
  dependencyTaskIds: [],
  helperRequired: false,
  helperPersonIds: [],
} as unknown as TaskFormInput;
describe("metadata editor execution integrity", () => {
  it("rejects creating already completed work", () =>
    expect(() =>
      validateTaskEdit({ ...input, status: "complete" }, []),
    ).toThrow(/Today/));
  it("rejects completing work through metadata editing", () =>
    expect(() =>
      validateTaskEdit({ ...input, status: "complete" }, [], {
        id: "door",
        status: "in_progress",
      } as RenovationTask),
    ).toThrow());
  it("rejects circular and missing prerequisite references", () => {
    const tasks = [
      { id: "first", dependencyTaskIds: ["door"] },
    ] as RenovationTask[];
    expect(() =>
      validateTaskEdit({ ...input, dependencyTaskIds: ["first"] }, tasks, {
        id: "door",
        status: "ready",
      } as RenovationTask),
    ).toThrow(/Circular/);
    expect(() =>
      validateTaskEdit({ ...input, dependencyTaskIds: ["missing"] }, []),
    ).toThrow(/no longer exists/);
  });
  it("requires assigned helpers for ready work", () =>
    expect(() =>
      validateTaskEdit({ ...input, helperRequired: true }, []),
    ).toThrow(/helper/));
});

it("allows Design planning edits but cannot reset execution into Design", () => {
  expect(() => validateTaskEdit({...input,status:"design"},[])).not.toThrow();
  expect(() => validateTaskEdit({...input,status:"ready"},[],{id:"door",status:"design"} as RenovationTask)).not.toThrow();
  expect(() => validateTaskEdit({...input,status:"design"},[],{id:"door",status:"in_progress"} as RenovationTask)).toThrow(/guarded/);
});
