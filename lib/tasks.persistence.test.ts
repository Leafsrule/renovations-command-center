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

function latestPayload() {
  return firestoreMocks.updateDoc.mock.calls.at(-1)?.[1] as Record<
    string,
    unknown
  >;
}

function expectUnrelatedFieldsAbsent(payload: Record<string, unknown>) {
  for (const field of [
    "name",
    "notes",
    "dependencyTaskIds",
    "materialStatus",
    "materialItems",
    "materialNotes",
    "materialNeededByDate",
    "materialBlockerNotes",
    "earliestStartDate",
    "dueDate",
    "scheduledStart",
    "scheduledEnd",
    "estimatedDurationMinutes",
    "actualDurationMinutes",
    "roomId",
    "priority"
  ]) {
    expect(payload).not.toHaveProperty(field);
  }
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
    expectUnrelatedFieldsAbsent(latestPayload());
  });

  it("persists only targeted transition fields for resume", async () => {
    const task = createTask({
      id: "task-1",
      status: "waiting_curing",
      name: "Stale task name",
      notes: "Do not overwrite",
      scheduledStart: "2026-06-24T09:00:00.000Z",
      scheduledEnd: "2026-06-24T10:00:00.000Z"
    });
    mockRefreshedTask({ ...task, status: "in_progress" });

    await executeProjectTaskAction("project-1", task, "resume", {
      tasks: [task],
      today: "2026-06-24"
    });

    const payload = latestPayload();
    expect(payload).toEqual({
      status: "in_progress",
      readinessState: "ready",
      readinessReasons: [],
      updatedAt: "__server_timestamp__"
    });
    expectUnrelatedFieldsAbsent(payload);
  });

  it("persists only targeted transition fields for complete", async () => {
    const task = createTask({
      id: "task-1",
      status: "in_progress",
      name: "Stale task name",
      priority: "urgent",
      estimatedDurationMinutes: 240,
      dueDate: "2026-06-30"
    });
    mockRefreshedTask({ ...task, status: "complete" });

    await executeProjectTaskAction("project-1", task, "complete", {
      tasks: [task],
      today: "2026-06-24"
    });

    const payload = latestPayload();
    expect(payload).toEqual({
      status: "complete",
      readinessState: "ready",
      readinessReasons: [],
      updatedAt: "__server_timestamp__"
    });
    expectUnrelatedFieldsAbsent(payload);
  });

  it("persists only targeted transition fields for block", async () => {
    const task = createTask({
      id: "task-1",
      notes: "Original note",
      materialStatus: "ordered",
      materialItems: ["vanity"],
      roomId: "room-1"
    });
    mockRefreshedTask({ ...task, status: "blocked" });

    await executeProjectTaskAction("project-1", task, "block", {
      tasks: [task],
      today: "2026-06-24",
      blocker: {
        blockerType: "material",
        blockerNotes: "Vanity has not arrived.",
        blockedUntilDate: "2026-06-30"
      }
    });

    const payload = latestPayload();
    expect(payload).toEqual({
      status: "blocked",
      readinessState: "blocked",
      blockerType: "material",
      blockerNotes: "Vanity has not arrived.",
      blockedUntilDate: "2026-06-30",
      updatedAt: "__server_timestamp__"
    });
    expectUnrelatedFieldsAbsent(payload);
  });

  it("persists only targeted transition fields for clear blocker", async () => {
    const task = createTask({
      id: "task-1",
      status: "blocked",
      readinessState: "blocked",
      blockerType: "material",
      blockerNotes: "Vanity has not arrived.",
      blockedUntilDate: "2026-06-30",
      notes: "Do not overwrite",
      dependencyTaskIds: []
    });
    mockRefreshedTask({
      ...task,
      status: "ready",
      readinessState: "ready",
      blockerType: "none",
      blockerNotes: "",
      blockedUntilDate: null
    });

    await executeProjectTaskAction("project-1", task, "clear_blocker", {
      tasks: [task],
      today: "2026-06-24"
    });

    const payload = latestPayload();
    expect(payload).toEqual({
      status: "ready",
      readinessState: "ready",
      readinessReasons: [],
      blockerType: "none",
      blockerNotes: "",
      blockedUntilDate: null,
      updatedAt: "__server_timestamp__"
    });
    expectUnrelatedFieldsAbsent(payload);
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
    expectUnrelatedFieldsAbsent(payload);
  });

  it.each([
    ["start", createTask({ status: "ready" }), {}],
    ["resume", createTask({ status: "waiting_curing" }), {}],
    ["complete", createTask({ status: "in_progress" }), {}],
    [
      "block",
      createTask({ status: "ready" }),
      {
        blocker: {
          blockerType: "material",
          blockerNotes: "Vanity has not arrived.",
          blockedUntilDate: null
        }
      }
    ],
    [
      "clear_blocker",
      createTask({
        status: "blocked",
        readinessState: "blocked",
        blockerType: "material",
        blockerNotes: "Vanity has not arrived."
      }),
      {}
    ]
  ] as const)(
    "surfaces permission-denied %s writes and does not refresh after failure",
    async (action, task, extraContext) => {
    firestoreMocks.updateDoc.mockRejectedValue(
      Object.assign(new Error("Missing or insufficient permissions."), {
        code: "permission-denied"
      })
    );

    await expect(
      executeProjectTaskAction("project-1", task, action, {
        tasks: [task],
        today: "2026-06-24",
        ...extraContext
      })
    ).rejects.toThrow("Missing or insufficient permissions.");

    expect(firestoreMocks.getDoc).not.toHaveBeenCalled();
    }
  );

  it("remains callable after a rejected write", async () => {
    const task = createTask();
    firestoreMocks.updateDoc
      .mockRejectedValueOnce(new Error("Transient write failure."))
      .mockResolvedValueOnce(undefined);
    mockRefreshedTask({ ...task, status: "in_progress" });

    await expect(
      executeProjectTaskAction("project-1", task, "start", {
        tasks: [task],
        today: "2026-06-24"
      })
    ).rejects.toThrow("Transient write failure.");

    await expect(
      executeProjectTaskAction("project-1", task, "start", {
        tasks: [task],
        today: "2026-06-24"
      })
    ).resolves.toMatchObject({
      task: expect.objectContaining({ status: "in_progress" })
    });
  });
});
