import { describe, expect, it } from "vitest";
import {
  activeProjectAlias,
  getActiveProjectId,
  getNavigationProjectId,
  getProjectSectionHref,
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

  it.each(["schedule", "materials", "photos"])(
    "builds the %s route with the real project ID",
    (section) => {
      const href = getProjectSectionHref("project-current", section);

      expect(href).toBe(`/projects/project-current/${section}`);
      expect(href).not.toContain("/projects/active/");
    }
  );

  it("refreshes navigation to the active project after active project changes", () => {
    expect(getNavigationProjectId("project-old", "project-new")).toBe(
      "project-new"
    );
    expect(getProjectSectionHref("project-new", "today")).toBe(
      "/projects/project-new/today"
    );
  });

  it("uses the active-project alias safely without producing alias links", () => {
    const projectId = getNavigationProjectId(activeProjectAlias, "project-new");

    expect(projectId).toBe("project-new");
    expect(getProjectSectionHref(projectId, "tasks")).toBe(
      "/projects/project-new/tasks"
    );
    expect(getProjectSectionHref(projectId, "tasks")).not.toContain(
      "/projects/active/"
    );
  });

  it("falls back safely when no active project is available", () => {
    expect(getNavigationProjectId(activeProjectAlias, null)).toBeNull();
    expect(getProjectSectionHref(null, "schedule")).toBe("/projects");
  });
});
