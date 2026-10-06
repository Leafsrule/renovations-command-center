"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  activeProjectChangedEvent,
  getNavigationProjectId,
  getActiveProjectId,
  getProjectSectionHref,
  getProjectIdFromPathname,
} from "@/lib/project-routes";
import { listOwnerProjects } from "@/lib/projects";
import { bottomNavItems } from "@/lib/routes";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const routeProjectId = getProjectIdFromPathname(pathname);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const projectId = getNavigationProjectId(routeProjectId, activeProjectId);

  useEffect(() => {
    let cancelled = false;

    async function loadActiveProject() {
      if (!user) {
        setActiveProjectId(null);
        return;
      }

      try {
        const projects = await listOwnerProjects(user.uid);
        if (!cancelled) {
          setActiveProjectId(getActiveProjectId(projects));
        }
      } catch {
        if (!cancelled) {
          setActiveProjectId(null);
        }
      }
    }

    loadActiveProject();

    window.addEventListener(activeProjectChangedEvent, loadActiveProject);
    window.addEventListener("focus", loadActiveProject);

    return () => {
      cancelled = true;
      window.removeEventListener(activeProjectChangedEvent, loadActiveProject);
      window.removeEventListener("focus", loadActiveProject);
    };
  }, [user]);

  return (
    <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-line bg-white/95 px-2 pb-3 pt-2 backdrop-blur">
      <div className="grid grid-cols-5 gap-1">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const href = getProjectSectionHref(projectId, item.path);
          const isActive = pathname === href;

          return (
            <Link
              key={item.path}
              href={href}
              className={`touch-target flex flex-col items-center justify-center rounded-md px-1 py-1 text-[11px] font-medium ${
                isActive ? "bg-[#e3efed] text-brand" : "text-muted"
              }`}
            >
              <Icon aria-hidden="true" className="mb-1 h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
