import { expect, it } from "vitest";
import { deletionEligibility } from "./deletion-policy";
it("allows unused planning records and retains closed or posted entries", () => {
  expect(deletionEligibility("rooms", { id: "room" }, {}).allowed).toBe(true);
  expect(
    deletionEligibility("tasks", { id: "task", status: "design" }, {}).allowed,
  ).toBe(true);
  for (const status of [
    "complete",
    "cancelled",
    "approved",
    "used",
    "verified",
  ])
    expect(
      deletionEligibility("materials", { id: "item", status }, {}).allowed,
    ).toBe(false);
  expect(
    deletionEligibility(
      "tasks",
      { id: "task", status: "ready" },
      { taskHistory: [{ id: "h", taskId: "task", action: "start" }] },
    ).allowed,
  ).toBe(false);
});
it("protects room and people links including helpers and historical closure", () => {
  const data = {
    tasks: [
      {
        id: "task",
        status: "ready",
        roomId: "room",
        championPersonId: "champion",
        helperPersonIds: ["helper"],
      },
    ],
    taskHistory: [{ id: "h", taskId: "task", toStatus: "complete" }],
  };
  for (const [kind, id] of [
    ["rooms", "room"],
    ["people", "champion"],
    ["people", "helper"],
  ] as const)
    expect(deletionEligibility(kind, { id }, data).reason).toMatch(/Closed/);
  expect(
    deletionEligibility("rooms", { id: "room" }, { tasks: data.tasks }).reason,
  ).toMatch(/Reassign/);
});
it("protects media, dependent work, closed record history and populated projects", () => {
  expect(
    deletionEligibility(
      "tasks",
      { id: "task", status: "draft" },
      { evidence: [{ id: "photo", taskId: "task" }] },
    ).allowed,
  ).toBe(false);
  expect(
    deletionEligibility(
      "tasks",
      { id: "task", status: "draft" },
      { tasks: [{ id: "next", dependencyTaskIds: ["task"] }] },
    ).allowed,
  ).toBe(false);
  expect(
    deletionEligibility(
      "decisions",
      { id: "record", status: "design" },
      {
        recordHistory: [
          {
            id: "h",
            kind: "decisions",
            recordId: "record",
            before: { status: "approved" },
          },
        ],
      },
    ).allowed,
  ).toBe(false);
  expect(
    deletionEligibility("project", { id: "p" }, { rooms: [{ id: "room" }] })
      .allowed,
  ).toBe(false);
  expect(deletionEligibility("project", { id: "p" }, {}).allowed).toBe(true);
});
