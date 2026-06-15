export const activeProjectAlias = "active";

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
