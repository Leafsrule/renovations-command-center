// @vitest-environment jsdom
import { beforeEach, describe, it, expect } from "vitest";
import {
  emptyFieldRecord,
  validateFieldRecord,
  readPending,
  storePending,
  type PendingFieldChange,
} from "./field-records";
describe("field records and durable drafts", () => {
  beforeEach(() => localStorage.clear());
  it("does not mark unknown measurements verified", () => {
    const record = {
      ...emptyFieldRecord(),
      name: "Door width",
      taskId: "door",
      status: "to_verify",
    };
    expect(() => validateFieldRecord("measurements", record)).not.toThrow();
    expect(record.status).toBe("to_verify");
    expect(() =>
      validateFieldRecord("measurements", { ...record, status: "verified" }),
    ).toThrow(/how/);
  });
  it("rejects invalid feet/inches and material quantity", () => {
    const record = {
      ...emptyFieldRecord(),
      name: "Width",
      taskId: "door",
      inches: 12,
    };
    expect(() => validateFieldRecord("measurements", record)).toThrow();
    expect(() =>
      validateFieldRecord("materials", { ...record, quantity: 0 }),
    ).toThrow();
  });
  it("recovers pending edits with their base version and idempotency key after reload", () => {
    const change: PendingFieldChange = {
      kind: "materials",
      record: {
        ...emptyFieldRecord(),
        name: "Thinset",
        taskId: "tile",
        version: 3,
      },
      ownerId: "owner",
      projectId: "ensuite",
      state: "pending",
      error: "",
      changeId: "operation-1",
    };
    storePending(change);
    const recovered = readPending("owner", "ensuite", "materials");
    expect(recovered).toEqual(change);
    expect(recovered?.record.version).toBe(3);
  });
  it("does not leak drafts across accounts, projects or modules", () => {
    storePending({
      kind: "decisions",
      record: emptyFieldRecord(),
      ownerId: "one",
      projectId: "ensuite",
      state: "draft",
      error: "",
      changeId: "operation-1",
    });
    expect(readPending("two", "ensuite", "decisions")).toBeNull();
    expect(readPending("one", "garage", "decisions")).toBeNull();
    expect(readPending("one", "ensuite", "materials")).toBeNull();
  });
});
