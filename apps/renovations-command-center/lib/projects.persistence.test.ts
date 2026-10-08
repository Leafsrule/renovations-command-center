import { beforeEach, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  current: { ownerUserId: "owner", updatedAt: { seconds: 1, nanoseconds: 0 } },
  update: vi.fn(),
}));
vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  serverTimestamp: () => "now",
  writeBatch: vi.fn(),
  runTransaction: async (_db: unknown, fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      get: async () => ({ exists: () => true, data: () => mocks.current }),
      update: mocks.update,
    }),
}));
import { updateOwnerProject } from "./projects";
const input = {
  name: "Ensuite",
  type: "custom" as const,
  status: "archived" as const,
  scope: "Tile",
  startDate: "2026-10-08",
  targetFinishDate: "2026-10-20",
};
beforeEach(() => {
  mocks.current = {
    ownerUserId: "owner",
    updatedAt: { seconds: 1, nanoseconds: 0 },
  };
  vi.clearAllMocks();
});
it("rejects stale project edits without changing the current project", async () => {
  await expect(
    updateOwnerProject("project", "owner", input, "0:0"),
  ).rejects.toThrow(/CONFLICT/);
  expect(mocks.update).not.toHaveBeenCalled();
});
it("rechecks ownership transactionally", async () => {
  mocks.current.ownerUserId = "other";
  await expect(
    updateOwnerProject("project", "owner", input, "1:0"),
  ).rejects.toThrow(/unavailable/);
  expect(mocks.update).not.toHaveBeenCalled();
});
it("archives using targeted fields, preserving unrelated settings/history", async () => {
  await updateOwnerProject("project", "owner", input, "1:0");
  expect(mocks.update.mock.calls[0][1]).toMatchObject({ status: "archived" });
  expect(mocks.update.mock.calls[0][1]).not.toHaveProperty("ownerUserId");
  expect(mocks.update.mock.calls[0][1]).not.toHaveProperty("activeProject");
});
