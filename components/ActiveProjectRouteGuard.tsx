"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  activeProjectAlias,
  getActiveProjectId
} from "@/lib/project-routes";
import { listOwnerProjects } from "@/lib/projects";

export function ActiveProjectRouteGuard({ children }: { children: ReactNode }) {
  const params = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState("");
  const isActiveAlias = params.projectId === activeProjectAlias;

  useEffect(() => {
    let cancelled = false;

    async function resolveActiveProject() {
      if (!isActiveAlias || authLoading) {
        return;
      }

      if (!user) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      setError("");

      try {
        const projects = await listOwnerProjects(user.uid);
        const activeProjectId = getActiveProjectId(projects);

        if (cancelled) {
          return;
        }

        if (!activeProjectId) {
          router.replace("/projects");
          return;
        }

        const suffix = pathname.slice("/projects/active".length);
        router.replace(`/projects/${activeProjectId}${suffix}`);
      } catch (routeError) {
        if (!cancelled) {
          setError(
            routeError instanceof Error
              ? routeError.message
              : "The active project could not be opened."
          );
        }
      }
    }

    resolveActiveProject();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isActiveAlias, pathname, router, user]);

  if (!isActiveAlias) {
    return children;
  }

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-panel px-4">
        <p className="rounded-md border border-danger bg-white p-4 text-sm text-danger">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-panel px-4 text-sm text-muted">
      Opening active project...
    </div>
  );
}
