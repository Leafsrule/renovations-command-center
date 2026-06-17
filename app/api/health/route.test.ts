import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("health route", () => {
  it("returns a minimal healthy response without environment details", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
