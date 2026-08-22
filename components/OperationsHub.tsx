"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Ban,
  Camera,
  ChevronRight,
  ClipboardCheck,
  MapPinned,
  PackageCheck,
  Ruler,
  Users,
  Warehouse
} from "lucide-react";

const modules = [
  {
    path: "materials",
    title: "Materials",
    description: "Readiness, required dates, and linked task restrictions.",
    status: "Live",
    icon: PackageCheck
  },
  {
    path: "photos",
    title: "Photos & files",
    description: "Evidence requirements, categories, and future Drive routing.",
    status: "Foundation",
    icon: Camera
  },
  {
    path: "measurements",
    title: "Measurements",
    description: "Feet/inches entry, tolerance checks, and recheck queues.",
    status: "Foundation",
    icon: Ruler
  },
  {
    path: "decisions",
    title: "Decisions & approvals",
    description: "Revision history, sign-off, and superseded decisions.",
    status: "Foundation",
    icon: ClipboardCheck
  },
  {
    path: "coordinates",
    title: "Coordinates & validation",
    description: "Control points, dimensions, discrepancies, and pass/fail checks.",
    status: "Foundation",
    icon: MapPinned
  },
  {
    path: "rooms",
    title: "Rooms & areas",
    description: "Whole-home zones, dimensions, priorities, and task groupings.",
    status: "Live",
    icon: Warehouse
  },
  {
    path: "people",
    title: "People",
    description: "Champions, helpers, skills, and availability.",
    status: "Live",
    icon: Users
  },
  {
    path: "blackouts",
    title: "Blackout dates",
    description: "Days and time ranges where work cannot be scheduled.",
    status: "Live",
    icon: Ban
  }
] as const;

export function OperationsHub() {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <div className="space-y-3">
      {modules.map((module) => {
        const Icon = module.icon;
        return (
          <Link
            key={module.path}
            href={`/projects/${projectId}/${module.path}`}
            className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-panel text-brand">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="font-semibold text-ink">{module.title}</span>
                <span className="rounded-md bg-panel px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {module.status}
                </span>
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted">
                {module.description}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
          </Link>
        );
      })}
    </div>
  );
}
