// @vitest-environment jsdom

import type { User } from "firebase/auth";
import type { ReactNode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MobileBottomNav } from "./MobileBottomNav";
import { activeProjectChangedEvent } from "@/lib/project-routes";
import type { RenovationProject } from "@/lib/projects";

const routeMocks = vi.hoisted(() => ({
  pathname: "/projects/project-a/today"
}));

const authMocks = vi.hoisted(() => ({
  user: { uid: "user-1" } as User | null
}));

const projectMocks = vi.hoisted(() => ({
  listOwnerProjects: vi.fn()
}));

vi.mock("next/navigation", () => ({
  usePathname: () => routeMocks.pathname
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a className={className} href={href}>
      {children}
    </a>
  )
}));

vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({
    user: authMocks.user,
    loading: false,
    firebaseReady: true,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn()
  })
}));

vi.mock("@/lib/projects", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/projects")>()),
  listOwnerProjects: projectMocks.listOwnerProjects
}));

function project(partial: Partial<RenovationProject>): RenovationProject {
  return {
    id: partial.id ?? "project-a",
    name: partial.name ?? "Project",
    type: partial.type ?? "custom",
    status: partial.status ?? "active",
    scope: partial.scope ?? "",
    startDate: partial.startDate ?? "2026-06-01",
    targetFinishDate: partial.targetFinishDate ?? "2026-06-30",
    activeProject: partial.activeProject ?? false,
    ownerUserId: partial.ownerUserId ?? "user-1",
    currentPhase: partial.currentPhase ?? "setup",
    criticalPathWarning: partial.criticalPathWarning ?? false,
    createdAt: undefined,
    updatedAt: undefined
  };
}

const projectA = project({ id: "project-a", name: "Project A", activeProject: true });
const projectB = project({ id: "project-b", name: "Project B", activeProject: true });

function hrefFor(label: string) {
  return screen.getByText(label).closest("a")?.getAttribute("href") ?? "";
}

function allNavHrefs() {
  return ["Today", "Tasks", "Schedule", "Materials", "Photos"].map(hrefFor);
}

async function renderNav(projects: RenovationProject[] = [projectA]) {
  projectMocks.listOwnerProjects.mockResolvedValue(projects);
  render(<MobileBottomNav />);
  await waitFor(() => expect(hrefFor("Today")).toContain(projects[0]?.activeProject ? projects[0].id : "/projects"));
}

describe("MobileBottomNav mounted behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.pathname = "/projects/project-a/today";
    authMocks.user = { uid: "user-1" } as User;
  });

  afterEach(() => {
    cleanup();
  });

  it("uses project A for initial project-specific links", async () => {
    await renderNav([projectA]);

    expect(hrefFor("Today")).toBe("/projects/project-a/today");
    expect(allNavHrefs().every((href) => href.includes("/projects/project-a/"))).toBe(true);
  });

  it("refreshes links to project B without reload after the active-project event", async () => {
    await renderNav([projectA]);
    projectMocks.listOwnerProjects.mockResolvedValue([project({ ...projectA, activeProject: false }), projectB]);

    window.dispatchEvent(new Event(activeProjectChangedEvent));

    await waitFor(() => expect(hrefFor("Today")).toBe("/projects/project-b/today"));
    expect(allNavHrefs().some((href) => href.includes("/projects/project-a/"))).toBe(false);
  });

  it("refreshes links on browser focus using the current active project", async () => {
    await renderNav([projectA]);
    projectMocks.listOwnerProjects.mockResolvedValue([project({ ...projectA, activeProject: false }), projectB]);

    window.dispatchEvent(new Event("focus"));

    await waitFor(() => expect(hrefFor("Tasks")).toBe("/projects/project-b/tasks"));
  });

  it("uses the active project for each project section", async () => {
    await renderNav([projectB]);

    expect(hrefFor("Today")).toBe("/projects/project-b/today");
    expect(hrefFor("Tasks")).toBe("/projects/project-b/tasks");
    expect(hrefFor("Schedule")).toBe("/projects/project-b/schedule");
    expect(hrefFor("Materials")).toBe("/projects/project-b/materials");
    expect(hrefFor("Photos")).toBe("/projects/project-b/photos");
  });

  it("keeps no-active-project navigation safe", async () => {
    await renderNav([]);

    expect(allNavHrefs()).toEqual(["/projects", "/projects", "/projects", "/projects", "/projects"]);
  });

  it("does not create active-project alias redirect loops", async () => {
    routeMocks.pathname = "/projects/active/today";
    await renderNav([projectA]);

    expect(allNavHrefs().every((href) => !href.includes("/projects/active/"))).toBe(true);
    expect(hrefFor("Today")).toBe("/projects/project-a/today");
  });

  it("clears project-specific navigation when authentication is lost", async () => {
    projectMocks.listOwnerProjects.mockResolvedValue([projectA]);
    const { rerender } = render(<MobileBottomNav />);
    await waitFor(() => expect(hrefFor("Today")).toBe("/projects/project-a/today"));

    authMocks.user = null;
    rerender(<MobileBottomNav />);

    await waitFor(() => expect(hrefFor("Today")).toBe("/projects"));
    expect(allNavHrefs().some((href) => href.includes("project-a"))).toBe(false);
  });

  it("does not preserve unsafe stale links after project-list failures", async () => {
    await renderNav([projectA]);
    projectMocks.listOwnerProjects.mockRejectedValue(new Error("Project load failed."));

    window.dispatchEvent(new Event(activeProjectChangedEvent));

    await waitFor(() => expect(hrefFor("Today")).toBe("/projects"));
    expect(allNavHrefs().some((href) => href.includes("project-a"))).toBe(false);
  });
});
