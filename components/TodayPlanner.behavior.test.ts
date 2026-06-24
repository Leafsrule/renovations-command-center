import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("components/TodayPlanner.tsx", "utf8");

describe("TodayPlanner interaction contracts", () => {
  it("keeps blocker validation state separate from page-level fatal errors", () => {
    expect(source).toContain("const [error, setError] = useState(\"\");");
    expect(source).toContain(
      "const [blockerError, setBlockerError] = useState(\"\");"
    );
    expect(source).toContain("setBlockerError(result.reason);");
    expect(source).toContain("{blockerError ? (");
    expect(source).toContain("setError(");
  });

  it("clears blocker modal validation when the form is corrected or closed", () => {
    expect(source).toContain("setBlockerError(\"\");");
    expect(source).toContain("setBlockerType(event.target.value as TaskBlockerType)");
    expect(source).toContain("setBlockerNotes(event.target.value)");
    expect(source).toContain("setBlockedUntilDate(event.target.value)");
    expect(source).toContain("onClick={closeBlockerForm}");
  });

  it("keeps blocker cancel as a local close action without writing", () => {
    expect(source).toContain("function closeBlockerForm()");
    expect(source).toContain("onClick={closeBlockerForm}");
    expect(source).not.toContain('onClick={() => applyTaskAction(task, "block"');
  });

  it("hides Start for tasks that do not fit remaining capacity", () => {
    expect(source).toContain("const isOverCapacity = reasons.some");
    expect(source).toContain("!isOverCapacity &&");
    expect(source).toContain("Does not fit today's remaining capacity.");
  });
});
