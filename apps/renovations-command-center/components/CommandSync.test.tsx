// @vitest-environment jsdom
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { writeQueuedCommand, type QueuedCommand } from "@/lib/command-queue";
const mocks = vi.hoisted(() => ({ retry: vi.fn(), user: { uid: "owner" } }));
vi.mock("./AuthProvider", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/lib/task-command-client", () => ({
  retryTaskCommand: mocks.retry,
  notifyCommands: () => window.dispatchEvent(new Event("rcc-commands-change")),
}));
import { CommandSync } from "./CommandSync";
const row: QueuedCommand = {
  ownerId: "owner",
  projectId: "project",
  taskId: "task",
  command: {
    kind: "action",
    commandId: "one",
    action: "start",
    expectedRevision: "none",
    helperAvailable: false,
  },
  queuedDate: "2026-10-08",
  state: "pending",
  error: "",
};
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mocks.retry.mockResolvedValue({ allowed: true });
});
afterEach(cleanup);
it("resumes persisted pending changes on mount and reconnect; conflicts are not auto-replayed", async () => {
  writeQueuedCommand(localStorage, row);
  writeQueuedCommand(localStorage, {
    ...row,
    command: { ...row.command, commandId: "conflict" },
    state: "conflicting",
    error: "Task changed",
  });
  render(<CommandSync />);
  await waitFor(() => expect(mocks.retry).toHaveBeenCalledTimes(1));
  expect(screen.getByText("Task changed")).toBeTruthy();
  expect(
    screen.getByText(/Stored on this device; awaiting server confirmation/i),
  ).toBeTruthy();
  await act(async () => window.dispatchEvent(new Event("online")));
  expect(mocks.retry).toHaveBeenCalledTimes(2);
});
it("shows acknowledged changes and permits dismissal without replaying", () => {
  writeQueuedCommand(localStorage, { ...row, state: "saved" });
  render(<CommandSync />);
  expect(screen.getByText(/Server confirmed/)).toBeTruthy();
  expect(mocks.retry).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("Dismiss confirmation"));
  expect(localStorage.length).toBe(0);
});
