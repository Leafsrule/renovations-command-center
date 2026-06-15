"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getTodayDateString } from "@/lib/scheduling";
import { getTodayPlan } from "@/lib/today";
import {
  executeProjectTaskAction,
  listProjectTasks,
  type RenovationTask,
  type TaskBlockerType
} from "@/lib/tasks";
import {
  evaluateTaskTransition,
  type TaskExecutionAction
} from "@/lib/task-execution";
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

const blockerOptions: Array<{
  label: string;
  value: Exclude<TaskBlockerType, "none">;
}> = [
  { label: "Dependency", value: "dependency" },
  { label: "Material", value: "material" },
  { label: "Site condition", value: "site_condition" },
  { label: "Labor", value: "labor" },
  { label: "Access", value: "access" },
  { label: "Inspection", value: "inspection" },
  { label: "Client decision", value: "client_decision" },
  { label: "Weather", value: "weather" },
  { label: "Safety", value: "safety" },
  { label: "Other", value: "other" }
];

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
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [blockingTaskId, setBlockingTaskId] = useState<string | null>(null);
  const [blockerType, setBlockerType] = useState<TaskBlockerType>("none");
  const [blockerNotes, setBlockerNotes] = useState("");
  const [blockedUntilDate, setBlockedUntilDate] = useState("");
  const [availableHours, setAvailableHours] = useState(10);
  const [bufferPercent, setBufferPercent] = useState(20);
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
    const savedBufferPercent = window.localStorage.getItem(
      "today-buffer-percent"
    );
    const savedBufferHours = window.localStorage.getItem(
      "today-buffer-hours"
    );
    const savedHelper = window.localStorage.getItem("today-helper-available");

    if (savedAvailable !== null) {
      const parsed = Number(savedAvailable);
      if (!Number.isNaN(parsed)) {
        setAvailableHours(parsed);
      }
    }

    if (savedBufferPercent !== null) {
      const parsed = Number(savedBufferPercent);
      if (!Number.isNaN(parsed)) {
        setBufferPercent(parsed);
      }
    } else if (savedBufferHours !== null) {
      const parsedHours = Number(savedBufferHours);
      const parsedAvailable = Number(savedAvailable ?? 10);
      if (
        !Number.isNaN(parsedHours) &&
        !Number.isNaN(parsedAvailable) &&
        parsedAvailable > 0
      ) {
        setBufferPercent(Math.round((parsedHours / parsedAvailable) * 100));
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
    window.localStorage.setItem(
      "today-buffer-percent",
      String(bufferPercent)
    );
    window.localStorage.setItem(
      "today-helper-available",
      String(helperAvailable)
    );
  }, [availableHours, bufferPercent, helperAvailable, mounted]);

  const today = useMemo(() => getTodayDateString(), []);

  const todayPlan = useMemo(
    () =>
      getTodayPlan({
        tasks,
        today,
        availableMinutes: Math.round(availableHours * 60),
        bufferPercent,
        helperAvailable
      }),
    [tasks, today, availableHours, bufferPercent, helperAvailable]
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
    action: TaskExecutionAction,
    blocker?: {
      blockerType: TaskBlockerType;
      blockerNotes: string;
      blockedUntilDate: string | null;
    }
  ) {
    if (
      action === "complete" &&
      !window.confirm(`Mark "${task.name}" complete?`)
    ) {
      return false;
    }

    setSavingTaskId(task.id);
    setError("");

    try {
      await executeProjectTaskAction(projectId, task, action, {
        tasks,
        today,
        helperAvailable,
        blocker
      });
      await refreshTasks();
      return true;
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update task. Please try again."
      );
      return false;
    } finally {
      setSavingTaskId(null);
    }
  }

  function openBlockerForm(task: RenovationTask) {
    setError("");
    setBlockingTaskId(task.id);
    setBlockerType("none");
    setBlockerNotes("");
    setBlockedUntilDate("");
  }

  function closeBlockerForm() {
    if (savingTaskId) {
      return;
    }

    setBlockingTaskId(null);
    setBlockerType("none");
    setBlockerNotes("");
    setBlockedUntilDate("");
  }

  async function submitBlocker(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const task = tasks.find((item) => item.id === blockingTaskId);

    if (!task) {
      setError(
        "The selected task is no longer available. Refresh and try again."
      );
      return;
    }

    const result = evaluateTaskTransition(task, "block", {
      tasks,
      today,
      helperAvailable,
      blocker: {
        blockerType,
        blockerNotes,
        blockedUntilDate: blockedUntilDate || null
      }
    });

    if (!result.allowed) {
      setError(result.reason);
      return;
    }

    const saved = await applyTaskAction(task, "block", {
      blockerType,
      blockerNotes,
      blockedUntilDate: blockedUntilDate || null
    });

    if (!saved) {
      return;
    }

    setBlockingTaskId(null);
    setBlockerType("none");
    setBlockerNotes("");
    setBlockedUntilDate("");
  }

  function renderTaskCard(task: RenovationTask, reasons: string[]) {
    const transitionContext = { tasks, today, helperAvailable };
    const canStart = evaluateTaskTransition(
      task,
      "start",
      transitionContext
    ).allowed;
    const canResume = evaluateTaskTransition(
      task,
      "resume",
      transitionContext
    ).allowed;
    const canComplete = evaluateTaskTransition(
      task,
      "complete",
      transitionContext
    ).allowed;
    const canWait = evaluateTaskTransition(
      task,
      "mark_waiting",
      transitionContext
    ).allowed;
    const canBlock = evaluateTaskTransition(task, "block", {
      ...transitionContext,
      blocker: { blockerType: "other", blockerNotes: "Pending blocker details" }
    }).allowed;
    const canUnblock = evaluateTaskTransition(
      task,
      "clear_blocker",
      transitionContext
    ).allowed;
    const saving = savingTaskId !== null;
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
              onClick={() => applyTaskAction(task, "mark_waiting")}
              type="button"
            >
              Mark waiting
            </button>
          ) : null}
          {canBlock ? (
            <button
              className="touch-target rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink"
              disabled={saving}
              onClick={() => openBlockerForm(task)}
              type="button"
            >
              Block
            </button>
          ) : null}
          {canUnblock ? (
            <button
              className="touch-target rounded-md border border-amber-500 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700"
              disabled={saving}
              onClick={() => applyTaskAction(task, "clear_blocker")}
              type="button"
            >
              Clear blocker
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
          <p className="mt-2 text-2xl font-semibold text-ink">
            {bufferPercent}%
          </p>
          <p className="mt-1 text-xs text-muted">
            {formatMinutes(todayPlan.capacity.bufferMinutes)} of crew capacity
          </p>
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
            Crew capacity hours
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
            Protected crew buffer percentage
            <input
              className="rounded-md border border-line px-3 py-2 text-sm"
              min={0}
              max={100}
              step={5}
              type="number"
              value={bufferPercent}
              onChange={(event) =>
                setBufferPercent(Number(event.target.value))
              }
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
          <p>
            Current work: {formatMinutes(todayPlan.capacity.inProgressMinutes)}
          </p>
          <p>Committed: {formatMinutes(todayPlan.capacity.plannedMinutes)}</p>
          <p>Remaining: {formatMinutes(todayPlan.capacity.remainingMinutes)}</p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">In progress</h2>
              <p className="text-sm text-muted">
                Current work reserved against today&apos;s crew capacity.
              </p>
            </div>
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
              {todayPlan.currentWork.length} tasks
            </span>
          </div>
          {todayPlan.currentWork.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No task is currently in progress.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {todayPlan.currentWork.map((item) =>
                renderTaskCard(item.task, item.reasons)
              )}
            </ul>
          )}
        </div>

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

      {blockingTaskId ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end bg-black/40 p-3 sm:items-center sm:justify-center"
          role="dialog"
        >
          <form
            className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-xl"
            onSubmit={submitBlocker}
          >
            <div>
              <h2 className="text-lg font-semibold text-ink">Block task</h2>
              <p className="mt-1 text-sm text-muted">
                Record what is stopping work so the task can be reassessed
                accurately.
              </p>
            </div>

            {error ? (
              <p className="rounded-md border border-danger bg-panel p-3 text-sm text-danger">
                {error}
              </p>
            ) : null}

            <label className="grid gap-2 text-sm font-semibold text-ink">
              Blocker type
              <select
                className="rounded-md border border-line px-3 py-2 text-sm"
                disabled={savingTaskId !== null}
                onChange={(event) =>
                  setBlockerType(event.target.value as TaskBlockerType)
                }
                required
                value={blockerType}
              >
                <option value="none">Choose a blocker</option>
                {blockerOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-ink">
              Blocker note
              <textarea
                className="min-h-28 rounded-md border border-line px-3 py-2 text-sm"
                disabled={savingTaskId !== null}
                onChange={(event) => setBlockerNotes(event.target.value)}
                placeholder="Describe the specific condition preventing work."
                required
                value={blockerNotes}
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-ink">
              Blocked until (optional)
              <input
                className="rounded-md border border-line px-3 py-2 text-sm"
                disabled={savingTaskId !== null}
                onChange={(event) => setBlockedUntilDate(event.target.value)}
                type="date"
                value={blockedUntilDate}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                className="touch-target rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink"
                disabled={savingTaskId !== null}
                onClick={closeBlockerForm}
                type="button"
              >
                Cancel
              </button>
              <button
                className="touch-target rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white"
                disabled={savingTaskId !== null}
                type="submit"
              >
                {savingTaskId ? "Saving..." : "Save blocker"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
