import { describe, expect, it } from "vitest";
import {
  activeProjectAlias,
  getActiveProjectId,
  getProjectIdFromPathname,
  resolveProjectRouteId
} from "./project-routes";

describe("project route resolution", () => {
  it("extracts a real project ID from project routes", () => {
    expect(getProjectIdFromPathname("/projects/project-123/today")).toBe(
      "project-123"
    );
  });

  it("resolves the active alias to the actual active project ID", () => {
    const activeProjectId = getActiveProjectId([
      { id: "project-old", activeProject: false },
      { id: "project-current", activeProject: true }
    ]);

    expect(resolveProjectRouteId(activeProjectAlias, activeProjectId)).toBe(
      "project-current"
    );
    expect(resolveProjectRouteId(activeProjectAlias, activeProjectId)).not.toBe(
      activeProjectAlias
    );
  });

  it("preserves a real route project ID", () => {
    expect(resolveProjectRouteId("project-123", "project-current")).toBe(
      "project-123"
    );
  });

  it("returns no project when an alias has no active project", () => {
    expect(resolveProjectRouteId(activeProjectAlias, null)).toBeNull();
  });
});
