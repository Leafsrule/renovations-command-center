export const activeProjectAlias = "active";
export const activeProjectChangedEvent = "renovations:active-project-changed";

type ProjectRouteCandidate = {
  id: string;
  activeProject: boolean;
};

export function getProjectIdFromPathname(pathname: string) {
  return pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? null;
}

export function getActiveProjectId(projects: ProjectRouteCandidate[]) {
  return projects.find((project) => project.activeProject)?.id ?? null;
}

export function resolveProjectRouteId(
  routeProjectId: string | null,
  activeProjectId: string | null
) {
  if (!routeProjectId || routeProjectId === activeProjectAlias) {
    return activeProjectId;
  }

  return routeProjectId;
}

export function getNavigationProjectId(
  routeProjectId: string | null,
  activeProjectId: string | null
) {
  if (activeProjectId) {
    return activeProjectId;
  }

  return resolveProjectRouteId(routeProjectId, activeProjectId);
}

export function getProjectSectionHref(
  projectId: string | null,
  section: string
) {
  return projectId && projectId !== activeProjectAlias
    ? `/projects/${projectId}/${section}`
    : "/projects";
}
