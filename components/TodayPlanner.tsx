"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getTodayDateString, getTaskReadinessEvaluation } from "@/lib/scheduling";
import { getTodayPlan } from "@/lib/today";
import {
  listProjectTasks,
  updateProjectTask,
  type RenovationTask,
  type TaskFormInput
} from "@/lib/tasks";
import { listProjectRooms, type RenovationRoom } from "@/lib/rooms";
import { StatusBadge } from "@/components/StatusBadge";

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  if (hours > 0) {
    return `${hours}h${remaining.toString().padStart(2, "0")}m`;
  }

  return `${remaining}m`;
}

function taskToFormInput(task: RenovationTask): TaskFormInput {
  return {
    name: task.name,
    roomId: task.roomId || "",
    phase: task.phase,
    description: task.description,
    status: task.status,
    priority: task.priority,
    championPersonId: task.championPersonId || "",
    helperPersonIds: task.helperPersonIds,
    dependencyTaskIds: task.dependencyTaskIds,
    helperRequired: task.helperRequired,
    estimatedDurationMinutes:
      task.estimatedDurationMinutes === null
        ? ""
        : String(task.estimatedDurationMinutes),
    earliestStartDate: task.earliestStartDate || "",
    dueDate: task.dueDate || "",
    notes: task.notes,
    photosRequired: task.photosRequired,
    canRunConcurrent: task.canRunConcurrent,
    criticalPathRisk: task.criticalPathRisk,
    readinessState: task.readinessState,
    readinessReasons: task.readinessReasons,
    blockerType: task.blockerType,
    blockerNotes: task.blockerNotes,
    blockedUntilDate: task.blockedUntilDate || "",
    materialStatus: task.materialStatus,
    materialItemsText: task.materialItems.join("\n"),
    materialNotes: task.materialNotes,
    materialNeededByDate: task.materialNeededByDate || "",
    materialBlockerNotes: task.materialBlockerNotes
  };
}

function getStatusLabel(status: RenovationTask["status"]) {
  const labels: Record<RenovationTask["status"], string> = {
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

  return labels[status] ?? status;
}

function getTaskDetails(task: RenovationTask, rooms: RenovationRoom[]) {
  const room = task.roomId
    ? rooms.find((item) => item.id === task.roomId)?.name || "Unknown area"
    : "No area";

  return room;
}

export function TodayPlanner() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const [tasks, setTasks] = useState<RenovationTask[]>([]);
  const [rooms, setRooms] = useState<RenovationRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [availableHours, setAvailableHours] = useState(10);
  const [bufferHours, setBufferHours] = useState(2);
  const [helperAvailable, setHelperAvailable] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [projectTasks, projectRooms] = await Promise.all([
          listProjectTasks(projectId),
          listProjectRooms(projectId)
        ]);

        if (!cancelled) {
          setTasks(projectTasks);
          setRooms(projectRooms);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Tasks could not be loaded. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") {
      return;
    }

    const savedAvailable = window.localStorage.getItem(
      "today-available-hours"
    );
    const savedBuffer = window.localStorage.getItem("today-buffer-hours");
    const savedHelper = window.localStorage.getItem("today-helper-available");

    if (savedAvailable !== null) {
      const parsed = Number(savedAvailable);
      if (!Number.isNaN(parsed)) {
        setAvailableHours(parsed);
      }
    }

    if (savedBuffer !== null) {
      const parsed = Number(savedBuffer);
      if (!Number.isNaN(parsed)) {
        setBufferHours(parsed);
      }
    }

    if (savedHelper !== null) {
      setHelperAvailable(savedHelper === "true");
    }
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      "today-available-hours",
      String(availableHours)
    );
    window.localStorage.setItem("today-buffer-hours", String(bufferHours));
    window.localStorage.setItem(
      "today-helper-available",
      String(helperAvailable)
    );
  }, [availableHours, bufferHours, helperAvailable, mounted]);

  const today = useMemo(() => getTodayDateString(), []);

  const todayPlan = useMemo(
    () =>
      getTodayPlan({
        tasks,
        today,
        availableMinutes: Math.round(availableHours * 60),
        bufferMinutes: Math.round(bufferHours * 60),
        helperAvailable
      }),
    [tasks, today, availableHours, bufferHours, helperAvailable]
  );

  async function refreshTasks() {
    setLoading(true);

    try {
      const nextTasks = await listProjectTasks(projectId);
      setTasks(nextTasks);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Tasks could not be refreshed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function applyTaskAction(
    task: RenovationTask,
    action: "start" | "resume" | "complete" | "wait" | "block" | "unblock"
  ) {
    const targetTask = { ...task };

    switch (action) {
      case "start":
        targetTask.status = "in_progress";
        targetTask.readinessState = "ready";
        targetTask.blockerType = "none";
        break;
      case "resume":
        targetTask.status = "in_progress";
        targetTask.readinessState = "ready";
        break;
      case "complete":
        targetTask.status = "complete";
        targetTask.readinessState = "ready";
        break;
      case "wait":
        targetTask.status = "waiting_curing";
        targetTask.readinessState = "ready";
        break;
      case "block":
        targetTask.status = "blocked";
        targetTask.readinessState = "blocked";
        targetTask.blockerType = "other";
        targetTask.blockerNotes = "Blocked from Today view.";
        break;
      case "unblock":
        targetTask.status = "ready";
        targetTask.readinessState = "ready";
        targetTask.blockerType = "none";
        targetTask.blockerNotes = "";
        targetTask.blockedUntilDate = null;
        break;
      default:
        break;
    }

    setSaving(true);
    setError("");

    try {
      await updateProjectTask(projectId, targetTask.id, taskToFormInput(targetTask));
      await refreshTasks();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update task. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  function renderTaskCard(task: RenovationTask, reasons: string[]) {
    const readiness = getTaskReadinessEvaluation(task, new Map(tasks.map((item) => [item.id, item])), { today, helperAvailable });
    const canStart = task.status === "ready" && readiness.state === "ready";
    const canResume = task.status === "waiting_curing";
    const canComplete = task.status === "in_progress";
    const canWait = task.status === "in_progress";
    const canBlock = task.status === "ready" || task.status === "in_progress" || task.status === "waiting_curing";
    const canUnblock = task.status === "blocked" || task.status === "waiting_curing";
    const roomLabel = getTaskDetails(task, rooms);

    return (
      <li key={task.id} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-ink">{task.name}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>{roomLabel}</span>
              <span>•</span>
              <span>{formatMinutes(task.estimatedDurationMinutes ?? 0)}</span>
              {task.helperRequired ? <span>• Helper needed</span> : null}
            </div>
          </div>
          <StatusBadge label={getStatusLabel(task.status)} />
        </div>

        <div className="my-3 space-y-2 text-sm text-muted">
          {reasons.slice(0, 3).map((reason) => (
            <p key={reason} className="rounded-md bg-panel px-3 py-2 text-xs leading-5">
              {reason}
            </p>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {canStart ? (
            <button
              className="touch-target rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white"
              disabled={saving}
              onClick={() => applyTaskAction(task, "start")}
              type="button"
            >
              Start
            </button>
          ) : null}
          {canResume ? (
            <button
              className="touch-target rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white"
              disabled={saving}
              onClick={() => applyTaskAction(task, "resume")}
              type="button"
            >
              Resume
            </button>
          ) : null}
          {canComplete ? (
            <button
              className="touch-target rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink"
              disabled={saving}
              onClick={() => applyTaskAction(task, "complete")}
              type="button"
            >
              Complete
            </button>
          ) : null}
          {canWait ? (
            <button
              className="touch-target rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink"
              disabled={saving}
              onClick={() => applyTaskAction(task, "wait")}
              type="button"
            >
              Mark waiting
            </button>
          ) : null}
          {canBlock ? (
            <button
              className="touch-target rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink"
              disabled={saving}
              onClick={() => applyTaskAction(task, "block")}
              type="button"
            >
              Block
            </button>
          ) : null}
          {canUnblock ? (
            <button
              className="touch-target rounded-md border border-amber-500 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700"
              disabled={saving}
              onClick={() => applyTaskAction(task, "unblock")}
              type="button"
            >
              Return to ready
            </button>
          ) : null}
        </div>
      </li>
    );
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading today plan...</p>;
  }

  if (error) {
    return (
      <div className="rounded-md border border-danger bg-panel p-4 text-sm leading-6 text-danger">
        {error}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-white p-4 text-sm text-muted">
          No tasks are available in this project yet. Add a task from the Tasks screen to build today&apos;s plan.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Available today</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{availableHours}h</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Protected buffer</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{bufferHours}h</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Schedulable target</p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {formatMinutes(todayPlan.capacity.schedulableMinutes)}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-4">
        <h2 className="text-sm font-semibold text-ink">Planning controls</h2>
        <div className="mt-4 space-y-4">
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Available work hours
            <input
              className="rounded-md border border-line px-3 py-2 text-sm"
              min={0}
              step={0.5}
              type="number"
              value={availableHours}
              onChange={(event) => setAvailableHours(Number(event.target.value))}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Protected buffer hours
            <input
              className="rounded-md border border-line px-3 py-2 text-sm"
              min={0}
              step={0.5}
              type="number"
              value={bufferHours}
              onChange={(event) => setBufferHours(Number(event.target.value))}
            />
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold text-ink">
            <input
              checked={helperAvailable}
              className="h-5 w-5"
              onChange={(event) => setHelperAvailable(event.target.checked)}
              type="checkbox"
            />
            Helper available today
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-4">
        <h2 className="text-lg font-semibold text-ink">Today&apos;s capacity</h2>
        <div className="mt-3 grid gap-2 text-sm text-muted">
          <p>Planned: {formatMinutes(todayPlan.capacity.plannedMinutes)}</p>
          <p>Remaining: {formatMinutes(todayPlan.capacity.remainingMinutes)}</p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Start first</h2>
              <p className="text-sm text-muted">Begin with the highest-ranked ready task.</p>
            </div>
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
              {todayPlan.startFirst.length} task
            </span>
          </div>
          {todayPlan.startFirst.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No strongly recommended task fits today&apos;s capacity right now.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {todayPlan.startFirst.map((item) => renderTaskCard(item.task, item.reasons))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Do next</h2>
              <p className="text-sm text-muted">Remaining ready tasks in recommended order.</p>
            </div>
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
              {todayPlan.doNext.length} tasks
            </span>
          </div>
          {todayPlan.doNext.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No additional ready tasks are recommended after the first task.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {todayPlan.doNext.map((item) => renderTaskCard(item.task, item.reasons))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Prep while waiting</h2>
              <p className="text-sm text-muted">Tasks that are safe to do during passive wait or cure time.</p>
            </div>
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
              {todayPlan.prepWhileWaiting.length} tasks
            </span>
          </div>
          {todayPlan.prepWhileWaiting.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No passive-wait compatible tasks are available right now.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {todayPlan.prepWhileWaiting.map((item) => renderTaskCard(item.task, item.reasons))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Helper work</h2>
              <p className="text-sm text-muted">Tasks requiring a helper and ready for today.</p>
            </div>
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
              {todayPlan.helperWork.length} tasks
            </span>
          </div>
          {todayPlan.helperWork.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No helper work is available under the current helper status.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {todayPlan.helperWork.map((item) => renderTaskCard(item.task, item.reasons))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Blocked / Not today</h2>
              <p className="text-sm text-muted">Tasks that are blocked, not ready, or do not fit today.</p>
            </div>
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
              {todayPlan.blockedOrNotToday.length} tasks
            </span>
          </div>
          {todayPlan.blockedOrNotToday.length === 0 ? (
            <p className="mt-4 text-sm text-muted">All available tasks are accounted for in today&apos;s plan.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {todayPlan.blockedOrNotToday.map((item) => renderTaskCard(item.task, item.reasons))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
