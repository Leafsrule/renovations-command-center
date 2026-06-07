"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { CriticalPathRiskBadge } from "@/components/CriticalPathRiskBadge";
import { StatusBadge } from "@/components/StatusBadge";
import {
  listOwnerProjects,
  setActiveOwnerProject,
  type RenovationProject
} from "@/lib/projects";

function projectTypeLabel(type: RenovationProject["type"]) {
  return type === "bathroom_ensuite" ? "Bathroom / Ensuite" : "Custom";
}

function formatDate(date: string) {
  return date || "Not set";
}

function friendlyProjectError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Projects could not be loaded. Please try again.";
}

export function ProjectDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<RenovationProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeChangingId, setActiveChangingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      if (!user) {
        return;
      }

      setLoading(true);
      setError("");

      try {
        const ownerProjects = await listOwnerProjects(user.uid);

        if (!cancelled) {
          setProjects(ownerProjects);
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

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleSetActive(projectId: string) {
    if (!user) {
      return;
    }

    setActiveChangingId(projectId);
    setError("");

    try {
      await setActiveOwnerProject(user.uid, projectId);
      setProjects((currentProjects) =>
        currentProjects.map((project) => ({
          ...project,
          activeProject: project.id === projectId
        }))
      );
    } catch (projectError) {
      setError(friendlyProjectError(projectError));
    } finally {
      setActiveChangingId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading projects...</p>;
  }

  return (
    <section className="space-y-4">
      {error ? (
        <div className="rounded-md border border-[#e4bbbb] bg-[#fae8e8] p-3 text-sm leading-6 text-danger">
          {error}
        </div>
      ) : null}

      {projects.length === 0 ? (
        <div className="rounded-md border border-line bg-panel p-4">
          <h2 className="text-lg font-semibold text-ink">No projects yet</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Create your first renovation project to start organizing the work.
          </p>
          <Link
            className="touch-target mt-4 flex items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white"
            href="/projects/new"
          >
            Set up project
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <article
              className="rounded-md border border-line bg-white p-4 shadow-soft"
              key={project.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-ink">
                    {project.name}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {projectTypeLabel(project.type)}
                  </p>
                </div>
                {project.activeProject ? (
                  <StatusBadge label="Active" tone="ready" />
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge label={project.status.replace("_", " ")} />
                <StatusBadge label={`Phase: ${project.currentPhase}`} />
                {project.criticalPathWarning ? (
                  <CriticalPathRiskBadge risk="high" />
                ) : null}
              </div>

              <dl className="mt-3 grid grid-cols-1 gap-2 text-sm text-muted">
                <div>
                  <dt className="font-semibold text-ink">Start date</dt>
                  <dd>{formatDate(project.startDate)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink">Target finish</dt>
                  <dd>{formatDate(project.targetFinishDate)}</dd>
                </div>
              </dl>

              <div className="mt-4 grid grid-cols-1 gap-2">
                <Link
                  className="touch-target flex items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white"
                  href={`/projects/${project.id}`}
                >
                  Open project
                </Link>
                {!project.activeProject ? (
                  <button
                    className="touch-target rounded-md border border-line px-4 text-sm font-semibold text-ink disabled:opacity-60"
                    disabled={activeChangingId === project.id}
                    onClick={() => handleSetActive(project.id)}
                    type="button"
                  >
                    {activeChangingId === project.id
                      ? "Setting active..."
                      : "Make active"}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
          <Link
            className="touch-target flex items-center justify-center rounded-md border border-line px-4 text-sm font-semibold text-ink"
            href="/projects/new"
          >
            Add another project
          </Link>
        </div>
      )}
    </section>
  );
}
