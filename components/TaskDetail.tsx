"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { listProjectPeople, type RenovationPerson } from "@/lib/people";
import { listProjectRooms, type RenovationRoom } from "@/lib/rooms";
import {
  getProjectTask,
  type RenovationTask,
  type TaskPhase,
  type TaskPriority,
  type TaskStatus
} from "@/lib/tasks";

const phaseLabels: Record<TaskPhase, string> = {
  setup: "Setup",
  demolition: "Demolition",
  prep: "Prep",
  rough_in: "Rough-in",
  waterproofing: "Waterproofing",
  tile: "Tile",
  flooring: "Flooring",
  drywall: "Drywall",
  paint: "Paint",
  trim: "Trim",
  fixtures: "Fixtures",
  cleanup: "Cleanup",
  other: "Other"
};

const statusLabels: Record<TaskStatus, string> = {
  draft: "Draft",
  not_ready: "Not ready",
  ready: "Ready",
  in_progress: "In progress",
  blocked: "Blocked",
  waiting_curing: "Waiting / curing",
  qc_review: "QC review",
  complete: "Complete",
  rework_required: "Rework required",
  cancelled: "Cancelled"
};

const priorityLabels: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent"
};

function friendlyTaskError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Task details could not be loaded. Please try again.";
}

export function TaskDetail() {
  const params = useParams<{ projectId: string; taskId: string }>();
  const router = useRouter();
  const { projectId, taskId } = params;
  const [task, setTask] = useState<RenovationTask | null>(null);
  const [rooms, setRooms] = useState<RenovationRoom[]>([]);
  const [people, setPeople] = useState<RenovationPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const roomNameById = useMemo(
    () => new Map(rooms.map((room) => [room.id, room.name])),
    [rooms]
  );
  const personNameById = useMemo(
    () => new Map(people.map((person) => [person.id, person.name])),
    [people]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadTask() {
      setLoading(true);
      setError("");

      try {
        const [projectTask, projectRooms, projectPeople] = await Promise.all([
          getProjectTask(projectId, taskId),
          listProjectRooms(projectId),
          listProjectPeople(projectId)
        ]);

        if (!cancelled) {
          setTask(projectTask);
          setRooms(projectRooms);
          setPeople(projectPeople);
        }
      } catch (taskError) {
        if (!cancelled) {
          setError(friendlyTaskError(taskError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTask();

    return () => {
      cancelled = true;
    };
  }, [projectId, taskId]);

  if (loading) {
    return <p className="text-sm text-muted">Loading task...</p>;
  }

  if (error) {
    return (
      <div className="rounded-md border border-danger bg-panel p-3 text-sm leading-6 text-danger">
        {error}
      </div>
    );
  }

  if (!task) {
    return (
      <div className="rounded-md border border-line bg-panel p-4">
        <h2 className="text-lg font-semibold text-ink">Task not found</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          This task either does not exist or is not available to your account.
        </p>
      </div>
    );
  }

  const helperNames = task.helperPersonIds
    .map((personId) => personNameById.get(personId))
    .filter((name): name is string => Boolean(name));

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          className="touch-target flex items-center rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink"
          href={`/projects/${projectId}/tasks`}
        >
          &larr; Back to Tasks
        </Link>
        <button
          className="touch-target rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink"
          onClick={() => router.push(`/projects/${projectId}`)}
          type="button"
        >
          Back to Project
        </button>
        <Link
          className="touch-target flex items-center rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink"
          href="/projects"
        >
          Projects
        </Link>
      </div>

      <article className="rounded-md border border-line bg-white p-4 shadow-soft">
        <h1 className="text-xl font-semibold text-ink">{task.name}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge label={statusLabels[task.status]} />
          <StatusBadge label={`Priority: ${priorityLabels[task.priority]}`} />
          <StatusBadge label={`Phase: ${phaseLabels[task.phase]}`} />
        </div>

        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="font-semibold text-ink">Room</dt>
            <dd className="mt-1 text-muted">
              {task.roomId
                ? roomNameById.get(task.roomId) || "Room unavailable"
                : "No room selected"}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Champion</dt>
            <dd className="mt-1 text-muted">
              {task.championPersonId
                ? personNameById.get(task.championPersonId) ||
                  "Champion unavailable"
                : "No champion selected"}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Helpers</dt>
            <dd className="mt-1 text-muted">
              {helperNames.length > 0 ? helperNames.join(", ") : "No helpers"}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Helper required</dt>
            <dd className="mt-1 text-muted">
              {task.helperRequired ? "Yes" : "No"}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Estimated duration</dt>
            <dd className="mt-1 text-muted">
              {task.estimatedDurationMinutes === null
                ? "Not set"
                : `${task.estimatedDurationMinutes} minutes`}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Due date</dt>
            <dd className="mt-1 text-muted">{task.dueDate || "Not set"}</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Description</dt>
            <dd className="mt-1 leading-6 text-muted">
              {task.description || "No description yet."}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Notes</dt>
            <dd className="mt-1 leading-6 text-muted">
              {task.notes || "No notes yet."}
            </dd>
          </div>
        </dl>
      </article>
    </section>
  );
}
