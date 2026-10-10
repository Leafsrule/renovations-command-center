import { beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ send: vi.fn(), getDoc: vi.fn() }));
vi.mock("./task-command-client", () => ({ sendTaskCommand: mocks.send }));
vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...p: string[]) => p.join("/"),
  collection: vi.fn(),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(),
  getDoc: mocks.getDoc,
}));
const { executeProjectTaskAction, toTask } = await import("./tasks");
const task = toTask("task", {
  status: "ready",
  updatedAt: { seconds: 123, nanoseconds: 456 },
});
describe("server-backed task execution", () => {
  beforeEach(() => vi.clearAllMocks());
  it("sends the original revision and owner helper assertion, without a client task universe", async () => {
    mocks.send.mockResolvedValue({
      allowed: true,
      updates: { status: "in_progress" },
    });
    mocks.getDoc.mockResolvedValue({
      exists: () => true,
      id: "task",
      data: () => ({ status: "in_progress" }),
    });
    const result = await executeProjectTaskAction("project", task, "start", {
      tasks: [task],
      today: "1999-01-01",
      helperAvailable: true,
    });
    expect(mocks.send).toHaveBeenCalledWith("project", "task", {
      kind: "action",
      action: "start",
      expectedRevision: "123:456",
      helperAvailable: true,
      blocker: undefined,
    });
    expect(result.task.status).toBe("in_progress");
  });
  it("does not refresh or claim success after rejected or locally queued commands", async () => {
    mocks.send.mockRejectedValue(new Error("CONFLICT: Task changed"));
    await expect(
      executeProjectTaskAction("project", task, "start", { tasks: [task] }),
    ).rejects.toThrow(/CONFLICT/);
    expect(mocks.getDoc).not.toHaveBeenCalled();
  });
});
