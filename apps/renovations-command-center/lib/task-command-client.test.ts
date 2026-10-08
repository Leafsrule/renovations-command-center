// @vitest-environment jsdom
import { beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: { uid: "owner", getIdToken: vi.fn() },
  auth: { currentUser: null as unknown },
}));
vi.mock("./firebase", () => ({ auth: mocks.auth }));
import { sendTaskCommand, retryTaskCommand } from "./task-command-client";
import { readQueuedCommands } from "./command-queue";
const input = {
  kind: "quality" as const,
  expectedRevision: "1:0",
  input: {
    items: [],
    required: false,
    cureUntil: null,
    overrideReason: "",
    workMinutes: 30,
    workNote: "Vanity assembly",
    rework: false,
  },
};
describe("durable authenticated commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.auth.currentUser = mocks.user;
    mocks.user.getIdToken.mockResolvedValue("token");
    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
    });
  });
  it("persists before dispatch and survives an uncertain response with the same retry ID", async () => {
    const fetcher = vi
      .fn()
      .mockImplementationOnce(() => {
        expect(readQueuedCommands(localStorage, "owner")[0].state).toBe(
          "pending",
        );
        throw new TypeError("Connection lost");
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { allowed: true } }),
      });
    vi.stubGlobal("fetch", fetcher);
    await expect(
      sendTaskCommand("project", "task", input, "work-once"),
    ).rejects.toThrow(/Queued/);
    const reloaded = JSON.parse(
      JSON.stringify(readQueuedCommands(localStorage, "owner")[0]),
    );
    await retryTaskCommand(reloaded);
    expect(JSON.parse(fetcher.mock.calls[0][1].body).commandId).toBe(
      JSON.parse(fetcher.mock.calls[1][1].body).commandId,
    );
    expect(readQueuedCommands(localStorage, "owner")[0].state).toBe("saved");
  });
  it("storage failure prevents a network write and durable-queue claim", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("Quota exceeded");
      });
    await expect(
      sendTaskCommand("project", "task", input, "storage-failure"),
    ).rejects.toThrow(/Quota/);
    expect(fetcher).not.toHaveBeenCalled();
    spy.mockRestore();
  });
  it("offline submission is pending, never saved; another account cannot replay it", async () => {
    vi.stubGlobal("fetch", vi.fn());
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
    });
    await expect(
      sendTaskCommand("project", "task", input, "offline-work"),
    ).rejects.toThrow(/not saved/);
    const row = readQueuedCommands(localStorage, "owner")[0];
    mocks.auth.currentUser = { ...mocks.user, uid: "other" };
    await expect(retryTaskCommand(row)).rejects.toThrow(/original account/);
    expect(readQueuedCommands(localStorage, "other")).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("conflicts remain visible and prevent a second work submission", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          status: 409,
          json: async () => ({ error: "CONFLICT: changed" }),
        }),
    );
    await expect(
      sendTaskCommand("project", "task", input, "stale-work"),
    ).rejects.toThrow(/CONFLICT/);
    expect(readQueuedCommands(localStorage, "owner")[0].state).toBe(
      "conflicting",
    );
    await expect(
      sendTaskCommand("project", "task", input, "duplicate-work"),
    ).rejects.toThrow(/pending change/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("past-day work cannot replay old availability assumptions", async () => {
    const row = {
      ownerId: "owner",
      projectId: "project",
      taskId: "task",
      command: {
        kind: "action" as const,
        commandId: "past-day",
        action: "start" as const,
        expectedRevision: "1:0",
        helperAvailable: true,
      },
      queuedDate: "1999-01-01",
      state: "pending" as const,
      error: "",
    };
    vi.stubGlobal("fetch", vi.fn());
    await expect(retryTaskCommand(row)).rejects.toThrow(/different day/);
    expect(readQueuedCommands(localStorage, "owner")[0].state).toBe(
      "conflicting",
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
