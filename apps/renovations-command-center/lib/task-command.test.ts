import { describe, it, expect } from "vitest";
import { parseTaskCommand, taskRevision } from "./task-command";
describe("trusted command input", () => {
  it("rejects unknown operations, forged IDs, negative work and unzoned cures", () => {
    const input = {
      items: [],
      required: false,
      cureUntil: null,
      overrideReason: "",
      workMinutes: 0,
      workNote: "",
      rework: false,
    };
    for (const c of [
      { commandId: "../fake", kind: "action" },
      { commandId: "valid", kind: "write-anything", expectedRevision: "none" },
      {
        commandId: "valid",
        kind: "quality",
        expectedRevision: "none",
        input: { ...input, workMinutes: -5 },
      },
      {
        commandId: "valid",
        kind: "quality",
        expectedRevision: "none",
        input: { ...input, cureUntil: "2026-10-09T10:00:00" },
      },
    ])
      expect(() => parseTaskCommand(c)).toThrow();
  });
  it("preserves exact revision precision across browser and Admin timestamps", () => {
    expect(taskRevision({ seconds: 123, nanoseconds: 456 })).toBe("123:456");
    expect(taskRevision(null)).toBe("none");
  });
});
