// @vitest-environment jsdom
import { beforeEach, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: { uid: "owner", getIdToken: vi.fn() },
  getDocs: vi.fn(),
}));
vi.mock("./firebase", () => ({ auth: { currentUser: mocks.user }, db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...parts: string[]) => parts.join("/"),
  collection: (_db: unknown, ...parts: string[]) => parts.join("/"),
  getDoc: async () => ({
    exists: () => true,
    data: () => ({ ownerUserId: "owner", name: "Ensuite" }),
  }),
  getDocs: mocks.getDocs,
}));
import { restoreProjectBackup } from "./project-backup";
const row = { id: "tile", data: { status: "complete", dependencyTaskIds: [] } };
const backup = {
  application: "Renovations Command Center",
  schemaVersion: 1,
  projectId: "source",
  createdAt: "2026-10-08",
  project: { ownerUserId: "owner", name: "Ensuite" },
  collections: { tasks: [row] },
};
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.user.getIdToken.mockResolvedValue("token");
  vi.stubGlobal("crypto", {
    randomUUID: vi.fn().mockReturnValue("restore-destination"),
    subtle: {
      digest: vi.fn().mockResolvedValue(new Uint8Array([1, 2]).buffer),
    },
  });
  mocks.getDocs.mockImplementation(async (path: string) => ({
    docs: path.endsWith("/tasks") ? [{ id: row.id, data: () => row.data }] : [],
  }));
});
it("reuses the persisted restore destination after a lost response and verifies readback", async () => {
  const fetcher = vi
    .fn()
    .mockRejectedValueOnce(new Error("Lost response"))
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ projectId: "restore-destination" }),
    });
  vi.stubGlobal("fetch", fetcher);
  await expect(restoreProjectBackup(backup)).rejects.toThrow(/Lost/);
  expect(localStorage.length).toBe(1);
  expect(await restoreProjectBackup(backup)).toBe("restore-destination");
  expect(JSON.parse(fetcher.mock.calls[0][1].body).projectId).toBe(
    JSON.parse(fetcher.mock.calls[1][1].body).projectId,
  );
  expect(localStorage.length).toBe(0);
});
it("does not start restoration when its recovery ID cannot be persisted", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Quota exceeded");
  });
  await expect(restoreProjectBackup(backup)).rejects.toThrow(/Quota/);
  expect(fetcher).not.toHaveBeenCalled();
  spy.mockRestore();
});
