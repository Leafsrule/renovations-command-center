import { beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  run: vi.fn(),
  services: vi.fn(),
}));
vi.mock("@/lib/server/firebase-admin", () => ({
  adminServices: mocks.services,
}));
vi.mock("@/lib/server/task-commands", () => ({ runTaskCommand: mocks.run }));
import { POST } from "./[projectId]/tasks/[taskId]/commands/route";
const params = Promise.resolve({ projectId: "project", taskId: "task" });
describe("authenticated command endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.services.mockReturnValue({
      db: {},
      bucket: {},
      auth: { verifyIdToken: mocks.verify },
    });
  });
  it("rejects missing identity without initializing privileged services", async () => {
    expect(
      (
        await POST(
          new Request("https://app.test/api", { method: "POST", body: "{}" }),
          { params },
        )
      ).status,
    ).toBe(401);
    expect(mocks.services).not.toHaveBeenCalled();
  });
  it("checks revocation and rejects invalid/expired identity without executing", async () => {
    mocks.verify.mockRejectedValue(new Error("Revoked"));
    const r = await POST(
      new Request("https://app.test/api", {
        method: "POST",
        headers: { authorization: "Bearer invalid" },
        body: "{}",
      }),
      { params },
    );
    expect(r.status).toBe(401);
    expect(mocks.verify).toHaveBeenCalledWith("invalid", true);
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it("uses the verified actor, never a supplied owner, and returns no private error details", async () => {
    mocks.verify.mockResolvedValue({ uid: "real-owner" });
    mocks.run.mockRejectedValue(new Error("PRIVATE CREDENTIAL DETAILS"));
    const r = await POST(
      new Request("https://app.test/api", {
        method: "POST",
        headers: { authorization: "Bearer valid" },
        body: JSON.stringify({ owner: "forged" }),
      }),
      { params },
    );
    expect(mocks.run.mock.calls[0][2]).toBe("real-owner");
    expect(r.status).toBe(503);
    expect(await r.text()).not.toContain("PRIVATE");
    expect(r.headers.get("cache-control")).toBe("no-store");
  });
});
