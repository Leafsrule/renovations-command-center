import { beforeEach, describe, it, expect, vi } from "vitest";
import type { RenovationTask } from "./tasks";
const mocks = vi.hoisted(() => ({
  records: new Map<string, Record<string, unknown>>(),
  updates: vi.fn(),
  runTransaction: vi.fn(),
  getDoc: vi.fn(),
  doc: vi.fn((_db: unknown, ...path: string[]) => path.join("/")),
  serverTimestamp: vi.fn(() => "server-time"),
}));
vi.mock("firebase/firestore", () => ({
  doc: mocks.doc,
  serverTimestamp: mocks.serverTimestamp,
  runTransaction: mocks.runTransaction,
  getDoc: mocks.getDoc,
  collection: vi.fn(),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
}));
vi.mock("@/lib/firebase", () => ({
  db: {},
  auth: { currentUser: { uid: "owner" } },
}));
const { executeProjectTaskAction, toTask } = await import("./tasks");
const path = "projects/project/tasks/task";
const base = {
  name: "Task",
  status: "ready",
  estimatedDurationMinutes: 60,
  readinessState: "ready",
  materialStatus: "not_required",
  blockerType: "none",
  dependencyTaskIds: [],
  notes: "Preserve this note",
};
function snapshot(ref: string) {
  const data = mocks.records.get(ref);
  return {
    exists: () => Boolean(data),
    id: ref.split("/").at(-1),
    data: () => data,
  };
}
describe("transactional task execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.records.clear();
    mocks.records.set(path, { ...base });
    mocks.getDoc.mockImplementation(async (ref: string) => snapshot(ref));
    mocks.updates.mockImplementation(
      (ref: string, update: Record<string, unknown>) =>
        mocks.records.set(ref, { ...mocks.records.get(ref), ...update }),
    );
    mocks.runTransaction.mockImplementation(
      async (_db: unknown, fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          get: async (ref: string) => snapshot(ref),
          update: mocks.updates,
          set: vi.fn(),
        }),
    );
  });
  it.each([
    ["start", "ready", {}, "in_progress"],
    ["resume", "waiting_curing", {}, "in_progress"],
    ["mark_waiting", "in_progress", {}, "waiting_curing"],
    ["complete", "in_progress", {}, "complete"],
    [
      "block",
      "ready",
      { blocker: { blockerType: "material", blockerNotes: "Not delivered" } },
      "blocked",
    ],
    ["clear_blocker", "blocked", {}, "ready"],
  ] as const)(
    "uses targeted transaction writes for %s",
    async (action, status, context, expected) => {
      const data = { ...base, status };
      mocks.records.set(path, data);
      const task = toTask("task", data);
      const result = await executeProjectTaskAction("project", task, action, {
        tasks: [task],
        ...context,
      });
      expect(result.task.status).toBe(expected);
      expect(mocks.updates.mock.calls[0][1]).not.toHaveProperty("notes");
      expect(mocks.records.get(path)?.notes).toBe(base.notes);
    },
  );
  it("rejects a stale start after another device blocks the task", async () => {
    const stale = toTask("task", base);
    mocks.records.set(path, {
      ...base,
      status: "blocked",
      blockerType: "material",
    });
    await expect(
      executeProjectTaskAction("project", stale, "start", { tasks: [stale] }),
    ).rejects.toThrow();
    expect(mocks.updates).not.toHaveBeenCalled();
  });
  it("reads new dependencies at the persistence boundary", async () => {
    const stale = toTask("task", base);
    mocks.records.set(path, { ...base, dependencyTaskIds: ["new-dependency"] });
    mocks.records.set("projects/project/tasks/new-dependency", {
      ...base,
      status: "ready",
    });
    await expect(
      executeProjectTaskAction("project", stale, "start", { tasks: [stale] }),
    ).rejects.toThrow(/incomplete/);
    expect(mocks.updates).not.toHaveBeenCalled();
  });
  it("does not complete when freshly stored evidence is missing", async () => {
    const stale = toTask("task", {
      ...base,
      status: "in_progress",
      photosRequired: false,
    });
    mocks.records.set(path, {
      ...base,
      status: "in_progress",
      photosRequired: true,
      evidenceCount: 0,
    });
    await expect(
      executeProjectTaskAction("project", stale, "complete", {
        tasks: [stale],
      }),
    ).rejects.toThrow(/evidence/);
    expect(mocks.updates).not.toHaveBeenCalled();
  });
  it("does not report success or refresh after a rejected transaction", async () => {
    mocks.runTransaction.mockRejectedValueOnce(new Error("Permission denied"));
    const task = toTask("task", base) as RenovationTask;
    await expect(
      executeProjectTaskAction("project", task, "start", { tasks: [task] }),
    ).rejects.toThrow("Permission denied");
    expect(mocks.getDoc).not.toHaveBeenCalled();
  });
});
