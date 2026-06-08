"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { CriticalPathRiskBadge } from "@/components/CriticalPathRiskBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { getOwnerProject, type RenovationProject } from "@/lib/projects";
import { countProjectPeople, type PeopleCount } from "@/lib/people";
import { countProjectRooms } from "@/lib/rooms";

function projectTypeLabel(type: RenovationProject["type"]) {
  return type === "bathroom_ensuite" ? "Bathroom / Ensuite" : "Custom";
}

function friendlyProjectError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Project details could not be loaded. Please try again.";
}

export function ProjectDetail() {
  const params = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const [project, setProject] = useState<RenovationProject | null>(null);
  const [roomCount, setRoomCount] = useState<number | null>(null);
  const [peopleCount, setPeopleCount] = useState<PeopleCount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProject() {
      if (!user || !params.projectId) {
        return;
      }

      setLoading(true);
      setError("");

      try {
        const ownerProject = await getOwnerProject(params.projectId, user.uid);
        const ownerRoomCount = ownerProject
          ? await countProjectRooms(params.projectId)
          : null;
        const ownerPeopleCount = ownerProject
          ? await countProjectPeople(params.projectId).catch(() => null)
          : null;

        if (!cancelled) {
          setProject(ownerProject);
          setRoomCount(ownerRoomCount);
          setPeopleCount(ownerPeopleCount);
        }
      } catch (projectError) {
        if (!cancelled) {
          setError(friendlyProjectError(projectError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProject();

    return () => {
      cancelled = true;
    };
  }, [params.projectId, user]);

  if (loading) {
    return <p className="text-sm text-muted">Loading project...</p>;
  }

  if (error) {
    return (
      <div className="rounded-md border border-[#e4bbbb] bg-[#fae8e8] p-3 text-sm leading-6 text-danger">
        {error}
      </div>
    );
  }

  if (!project) {
    return (
      <div className="rounded-md border border-line bg-panel p-4">
        <h2 className="text-lg font-semibold text-ink">Project not found</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          This project either does not exist or is not owned by your account.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <article className="rounded-md border border-line bg-white p-4 shadow-soft">
        <div className="flex flex-wrap gap-2">
          <StatusBadge label={project.status.replace("_", " ")} tone="ready" />
          <StatusBadge label={`Phase: ${project.currentPhase}`} />
          {project.activeProject ? <StatusBadge label="Active project" /> : null}
          {project.criticalPathWarning ? (
            <CriticalPathRiskBadge risk="high" />
          ) : null}
        </div>

        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="font-semibold text-ink">Project name</dt>
            <dd className="mt-1 text-muted">{project.name}</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Type</dt>
            <dd className="mt-1 text-muted">{projectTypeLabel(project.type)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Scope / notes</dt>
            <dd className="mt-1 text-muted">
              {project.scope || "No scope notes yet."}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Start date</dt>
            <dd className="mt-1 text-muted">
              {project.startDate || "Not set"}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Target finish date</dt>
            <dd className="mt-1 text-muted">
              {project.targetFinishDate || "Not set"}
            </dd>
          </div>
        </dl>
      </article>
      <article className="rounded-md border border-line bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Rooms / areas</h2>
            <p className="mt-1 text-sm text-muted">
              {roomCount === null
                ? "Room count unavailable"
                : `${roomCount} room${roomCount === 1 ? "" : "s"} added`}
            </p>
          </div>
          <Link
            className="touch-target flex items-center rounded-md bg-brand px-4 text-sm font-semibold text-white"
            href={`/projects/${project.id}/rooms`}
          >
            Manage Rooms / Areas
          </Link>
        </div>
      </article>
      <article className="rounded-md border border-line bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">People / team</h2>
            {peopleCount ? (
              <p className="mt-1 text-sm text-muted">
                {peopleCount.total} people ({peopleCount.active} active)
              </p>
            ) : null}
          </div>
          <Link
            className="touch-target flex items-center rounded-md bg-brand px-4 text-sm font-semibold text-white"
            href={`/projects/${project.id}/people`}
          >
            Manage People / Team
          </Link>
        </div>
      </article>
    </section>
  );
}
