import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RenovationTask } from "./tasks";

const firestoreMocks = vi.hoisted(() => ({
  updateDoc: vi.fn(),
  getDoc: vi.fn(),
  doc: vi.fn((_db: unknown, ...path: string[]) => path.join("/")),
  serverTimestamp: vi.fn(() => "__server_timestamp__"),
  addDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn()
}));

vi.mock("firebase/firestore", () => firestoreMocks);
vi.mock("@/lib/firebase", () => ({ db: {} }));

const { executeProjectTaskAction } = await import("./tasks");

function createTask(partial: Partial<RenovationTask> = {}): RenovationTask {
  return {
    id: partial.id ?? "task-1",
    name: partial.name ?? "Install vanity",
    roomId: partial.roomId ?? null,
    phase: partial.phase ?? "fixtures",
    description: partial.description ?? "",
    status: partial.status ?? "ready",
    priority: partial.priority ?? "medium",
    championPersonId: partial.championPersonId ?? null,
    helperPersonIds: partial.helperPersonIds ?? [],
    dependencyTaskIds: partial.dependencyTaskIds ?? [],
    helperRequired: partial.helperRequired ?? false,
    estimatedDurationMinutes: partial.estimatedDurationMinutes ?? 90,
    actualDurationMinutes: partial.actualDurationMinutes ?? null,
    earliestStartDate: partial.earliestStartDate ?? null,
    dueDate: partial.dueDate ?? null,
    scheduledStart: partial.scheduledStart ?? null,
    scheduledEnd: partial.scheduledEnd ?? null,
    readinessState: partial.readinessState ?? "ready",
    readinessReasons: partial.readinessReasons ?? [],
    blockerType: partial.blockerType ?? "none",
    blockerNotes: partial.blockerNotes ?? "",
    blockedUntilDate: partial.blockedUntilDate ?? null,
    materialStatus: partial.materialStatus ?? "ready",
    materialItems: partial.materialItems ?? [],
    materialNotes: partial.materialNotes ?? "",
    materialNeededByDate: partial.materialNeededByDate ?? null,
    materialBlockerNotes: partial.materialBlockerNotes ?? "",
    criticalPathRisk: partial.criticalPathRisk ?? "none",
    photosRequired: partial.photosRequired ?? false,
    canRunConcurrent: partial.canRunConcurrent ?? false,
    notes: partial.notes ?? "",
    createdAt: undefined,
    updatedAt: undefined
  };
}

function mockRefreshedTask(task: RenovationTask) {
  firestoreMocks.getDoc.mockResolvedValue({
    exists: () => true,
    id: task.id,
    data: () => task
  });
}

describe("task action persistence boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMocks.doc.mockImplementation((_db: unknown, ...path: string[]) =>
      path.join("/")
    );
    firestoreMocks.serverTimestamp.mockReturnValue("__server_timestamp__");
  });

  it("persists only targeted transition fields for start", async () => {
    const task = createTask({
      id: "task-1",
      name: "Original name",
      dependencyTaskIds: ["dep"],
      notes: "Do not overwrite"
    });
    const dependency = createTask({ id: "dep", status: "complete" });
    mockRefreshedTask({
      ...task,
      name: "Name edited elsewhere",
      dependencyTaskIds: ["dep", "newer-dep"],
      notes: "New note",
      status: "in_progress"
    });

    await executeProjectTaskAction("project-1", task, "start", {
      tasks: [task, dependency],
      today: "2026-06-24"
    });

    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      "projects/project-1/tasks/task-1",
      {
        status: "in_progress",
        readinessState: "ready",
        readinessReasons: [],
        updatedAt: "__server_timestamp__"
      }
    );
  });

  it("does not overwrite independently changed fields from a stale snapshot", async () => {
    const staleTask = createTask({
      id: "task-1",
      name: "Stale name",
      dependencyTaskIds: [],
      materialStatus: "ready",
      notes: "Stale note",
      dueDate: "2026-06-25",
      status: "in_progress"
    });
    mockRefreshedTask({
      ...staleTask,
      name: "Fresh name",
      dependencyTaskIds: ["new-dep"],
      materialStatus: "ordered",
      notes: "Fresh note",
      dueDate: "2026-06-26",
      status: "waiting_curing"
    });

    await executeProjectTaskAction("project-1", staleTask, "mark_waiting", {
      tasks: [staleTask],
      today: "2026-06-24"
    });

    const payload = firestoreMocks.updateDoc.mock.calls[0][1];
    expect(payload).toEqual({
      status: "waiting_curing",
      readinessState: "ready",
      readinessReasons: [],
      updatedAt: "__server_timestamp__"
    });
    expect(payload).not.toHaveProperty("name");
    expect(payload).not.toHaveProperty("dependencyTaskIds");
    expect(payload).not.toHaveProperty("materialStatus");
    expect(payload).not.toHaveProperty("notes");
    expect(payload).not.toHaveProperty("dueDate");
  });

  it("surfaces permission-denied writes and does not refresh after failure", async () => {
    const task = createTask();
    firestoreMocks.updateDoc.mockRejectedValue(
      Object.assign(new Error("Missing or insufficient permissions."), {
        code: "permission-denied"
      })
    );

    await expect(
      executeProjectTaskAction("project-1", task, "start", {
        tasks: [task],
        today: "2026-06-24"
      })
    ).rejects.toThrow("Missing or insufficient permissions.");

    expect(firestoreMocks.getDoc).not.toHaveBeenCalled();
  });
});
