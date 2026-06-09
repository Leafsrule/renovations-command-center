"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CriticalPathRiskBadge } from "@/components/CriticalPathRiskBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { listProjectPeople, type RenovationPerson } from "@/lib/people";
import { listProjectRooms, type RenovationRoom } from "@/lib/rooms";
import {
  createProjectTask,
  listProjectTasks,
  updateProjectTask,
  type RenovationTask,
  type TaskFormInput,
  type TaskPhase,
  type TaskPriority,
  type TaskStatus
} from "@/lib/tasks";

const phaseOptions: Array<{ label: string; value: TaskPhase }> = [
  { label: "Setup", value: "setup" },
  { label: "Demolition", value: "demolition" },
  { label: "Prep", value: "prep" },
  { label: "Rough-in", value: "rough_in" },
  { label: "Waterproofing", value: "waterproofing" },
  { label: "Tile", value: "tile" },
  { label: "Flooring", value: "flooring" },
  { label: "Drywall", value: "drywall" },
  { label: "Paint", value: "paint" },
  { label: "Trim", value: "trim" },
  { label: "Fixtures", value: "fixtures" },
  { label: "Cleanup", value: "cleanup" },
  { label: "Other", value: "other" }
];

const statusOptions: Array<{ label: string; value: TaskStatus }> = [
  { label: "Draft", value: "draft" },
  { label: "Not ready", value: "not_ready" },
  { label: "Ready", value: "ready" },
  { label: "In progress", value: "in_progress" },
  { label: "Blocked", value: "blocked" },
  { label: "Waiting / curing", value: "waiting_curing" },
  { label: "QC review", value: "qc_review" },
  { label: "Complete", value: "complete" },
  { label: "Rework required", value: "rework_required" },
  { label: "Cancelled", value: "cancelled" }
];

const priorityOptions: Array<{ label: string; value: TaskPriority }> = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" }
];

const emptyForm: TaskFormInput = {
  name: "",
  roomId: "",
  phase: "setup",
  description: "",
  status: "draft",
  priority: "medium",
  championPersonId: "",
  helperPersonIds: [],
  helperRequired: false,
  estimatedDurationMinutes: "",
  dueDate: "",
  notes: "",
  photosRequired: false,
  canRunConcurrent: false
};

function friendlyTaskError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Tasks could not be saved. Please try again.";
}

function labelFromValue<T extends string>(
  options: Array<{ label: string; value: T }>,
  value: T
) {
  return options.find((option) => option.value === value)?.label || value;
}

function taskToForm(task: RenovationTask): TaskFormInput {
  return {
    name: task.name,
    roomId: task.roomId || "",
    phase: task.phase,
    description: task.description,
    status: task.status,
    priority: task.priority,
    championPersonId: task.championPersonId || "",
    helperPersonIds: task.helperPersonIds,
    helperRequired: task.helperRequired,
    estimatedDurationMinutes:
      task.estimatedDurationMinutes === null
        ? ""
        : String(task.estimatedDurationMinutes),
    dueDate: task.dueDate || "",
    notes: task.notes,
    photosRequired: task.photosRequired,
    canRunConcurrent: task.canRunConcurrent
  };
}

function TaskForm({
  initialValue,
  isSaving,
  onCancel,
  onSubmit,
  people,
  rooms,
  submitLabel
}: {
  initialValue: TaskFormInput;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (input: TaskFormInput) => Promise<void>;
  people: RenovationPerson[];
  rooms: RenovationRoom[];
  submitLabel: string;
}) {
  const [form, setForm] = useState(initialValue);
  const [error, setError] = useState("");

  function toggleHelper(personId: string) {
    setForm((current) => {
      const helperPersonIds = current.helperPersonIds.includes(personId)
        ? current.helperPersonIds.filter((helperId) => helperId !== personId)
        : [...current.helperPersonIds, personId];

      return {
        ...current,
        helperPersonIds
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Enter a task name.");
      return;
    }

    if (
      form.estimatedDurationMinutes.trim() &&
      !Number.isFinite(Number(form.estimatedDurationMinutes.trim()))
    ) {
      setError("Estimated duration must be a number of minutes.");
      return;
    }

    await onSubmit(form);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error ? (
        <div className="rounded-md border border-danger bg-panel p-3 text-sm leading-6 text-danger">
          {error}
        </div>
      ) : null}

      <label className="block text-sm font-semibold text-ink">
        Task name
        <input
          className="touch-target mt-2 w-full rounded-md border border-line px-3 text-sm font-normal"
          placeholder="Demo protection and prep"
          value={form.name}
          onChange={(event) =>
            setForm((current) => ({ ...current, name: event.target.value }))
          }
        />
      </label>

      <label className="block text-sm font-semibold text-ink">
        Room
        <select
          className="touch-target mt-2 w-full rounded-md border border-line bg-white px-3 text-sm font-normal"
          value={form.roomId}
          onChange={(event) =>
            setForm((current) => ({ ...current, roomId: event.target.value }))
          }
        >
          <option value="">No room selected</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-semibold text-ink">
        Phase
        <select
          className="touch-target mt-2 w-full rounded-md border border-line bg-white px-3 text-sm font-normal"
          value={form.phase}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              phase: event.target.value as TaskPhase
            }))
          }
        >
          {phaseOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-semibold text-ink">
        Description
        <textarea
          className="mt-2 min-h-24 w-full rounded-md border border-line px-3 py-3 text-sm font-normal"
          placeholder="Protect surrounding areas and prepare the work zone."
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              description: event.target.value
            }))
          }
        />
      </label>

      <label className="block text-sm font-semibold text-ink">
        Status
        <select
          className="touch-target mt-2 w-full rounded-md border border-line bg-white px-3 text-sm font-normal"
          value={form.status}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              status: event.target.value as TaskStatus
            }))
          }
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-semibold text-ink">
        Priority
        <select
          className="touch-target mt-2 w-full rounded-md border border-line bg-white px-3 text-sm font-normal"
          value={form.priority}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              priority: event.target.value as TaskPriority
            }))
          }
        >
          {priorityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-semibold text-ink">
        Champion
        <select
          className="touch-target mt-2 w-full rounded-md border border-line bg-white px-3 text-sm font-normal"
          value={form.championPersonId}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              championPersonId: event.target.value
            }))
          }
        >
          <option value="">No champion selected</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-ink">Helpers</legend>
        {people.length === 0 ? (
          <p className="rounded-md border border-line bg-panel p-3 text-sm text-muted">
            No people available yet.
          </p>
        ) : (
          <div className="space-y-2">
            {people.map((person) => (
              <label
                className="flex min-h-11 items-center gap-3 rounded-md border border-line px-3 text-sm font-semibold text-ink"
                key={person.id}
              >
                <input
                  checked={form.helperPersonIds.includes(person.id)}
                  className="h-5 w-5"
                  onChange={() => toggleHelper(person.id)}
                  type="checkbox"
                />
                {person.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-ink">
        <input
          checked={form.helperRequired}
          className="h-5 w-5"
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              helperRequired: event.target.checked
            }))
          }
          type="checkbox"
        />
        Helper required
      </label>

      <label className="block text-sm font-semibold text-ink">
        Estimated duration in minutes
        <input
          className="touch-target mt-2 w-full rounded-md border border-line px-3 text-sm font-normal"
          inputMode="numeric"
          placeholder="120"
          value={form.estimatedDurationMinutes}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              estimatedDurationMinutes: event.target.value
            }))
          }
        />
      </label>

      <label className="block text-sm font-semibold text-ink">
        Due date
        <input
          className="touch-target mt-2 w-full rounded-md border border-line px-3 text-sm font-normal"
          type="date"
          value={form.dueDate}
          onChange={(event) =>
            setForm((current) => ({ ...current, dueDate: event.target.value }))
          }
        />
      </label>

      <label className="block text-sm font-semibold text-ink">
        Notes
        <textarea
          className="mt-2 min-h-24 w-full rounded-md border border-line px-3 py-3 text-sm font-normal"
          placeholder="First test task for task manager foundation"
          value={form.notes}
          onChange={(event) =>
            setForm((current) => ({ ...current, notes: event.target.value }))
          }
        />
      </label>

      <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-ink">
        <input
          checked={form.photosRequired}
          className="h-5 w-5"
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              photosRequired: event.target.checked
            }))
          }
          type="checkbox"
        />
        Photos required
      </label>

      <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-ink">
        <input
          checked={form.canRunConcurrent}
          className="h-5 w-5"
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              canRunConcurrent: event.target.checked
            }))
          }
          type="checkbox"
        />
        Can run concurrent
      </label>

      <div className="grid grid-cols-1 gap-2">
        <button
          className="touch-target rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Saving..." : submitLabel}
        </button>
        <button
          className="touch-target rounded-md border border-line px-4 text-sm font-semibold text-ink"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function TaskManager() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId;
  const [tasks, setTasks] = useState<RenovationTask[]>([]);
  const [rooms, setRooms] = useState<RenovationRoom[]>([]);
  const [people, setPeople] = useState<RenovationPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const editingTask = useMemo(
    () => tasks.find((task) => task.id === editingTaskId) || null,
    [editingTaskId, tasks]
  );

  const roomNameById = useMemo(
    () => new Map(rooms.map((room) => [room.id, room.name])),
    [rooms]
  );
  const personNameById = useMemo(
    () => new Map(people.map((person) => [person.id, person.name])),
    [people]
  );

  async function refreshTasks() {
    const nextTasks = await listProjectTasks(projectId);
    setTasks(nextTasks);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadTasks() {
      setLoading(true);
      setError("");

      try {
        const [projectTasks, projectRooms, projectPeople] = await Promise.all([
          listProjectTasks(projectId),
          listProjectRooms(projectId),
          listProjectPeople(projectId)
        ]);

        if (!cancelled) {
          setTasks(projectTasks);
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

    loadTasks();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function handleCreate(input: TaskFormInput) {
    setSaving(true);
    setError("");

    try {
      await createProjectTask(projectId, input);
      await refreshTasks();
      setShowAddForm(false);
    } catch (taskError) {
      setError(friendlyTaskError(taskError));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(input: TaskFormInput) {
    if (!editingTask) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await updateProjectTask(projectId, editingTask.id, input);
      setEditingTaskId(null);
      await refreshTasks();
    } catch (taskError) {
      setError(friendlyTaskError(taskError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading tasks...</p>;
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="touch-target rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink"
          onClick={() => router.push(`/projects/${projectId}`)}
          type="button"
        >
          &larr; Back to Project
        </button>
        <Link
          className="touch-target flex items-center rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink"
          href="/projects"
        >
          Projects
        </Link>
        <h1 className="min-h-11 flex items-center text-xl font-semibold text-ink">
          Tasks
        </h1>
      </div>

      {error ? (
        <div className="rounded-md border border-danger bg-panel p-3 text-sm leading-6 text-danger">
          {error}
        </div>
      ) : null}

      <div className="rounded-md border border-line bg-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Current Tasks</h2>
            <p className="mt-1 text-sm text-muted">
              Task records for this project.
            </p>
          </div>
          <button
            className="touch-target rounded-md bg-brand px-4 text-sm font-semibold text-white"
            onClick={() => {
              setEditingTaskId(null);
              setShowAddForm(true);
            }}
            type="button"
          >
            Add Task
          </button>
        </div>

        {tasks.length === 0 ? (
          <p className="mt-4 rounded-md border border-line bg-white p-4 text-sm text-muted">
            No tasks added yet.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {tasks.map((task) => (
              <article
                className="rounded-md border border-line bg-white p-4 shadow-soft"
                key={task.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-ink">
                      {task.name}
                    </h3>
                    {task.roomId ? (
                      <p className="mt-1 text-sm text-muted">
                        {roomNameById.get(task.roomId) || "Room unavailable"}
                      </p>
                    ) : null}
                  </div>
                  <StatusBadge label={labelFromValue(statusOptions, task.status)} />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge
                    label={`Priority: ${labelFromValue(
                      priorityOptions,
                      task.priority
                    )}`}
                  />
                  {task.championPersonId ? (
                    <StatusBadge
                      label={`Champion: ${
                        personNameById.get(task.championPersonId) ||
                        "Unavailable"
                      }`}
                    />
                  ) : null}
                  {task.helperRequired ? (
                    <StatusBadge label="Helper required" tone="warning" />
                  ) : null}
                  {task.helperPersonIds.length > 0 ? (
                    <StatusBadge
                      label={`${task.helperPersonIds.length} helper${
                        task.helperPersonIds.length === 1 ? "" : "s"
                      }`}
                    />
                  ) : null}
                  {task.criticalPathRisk !== "none" ? (
                    <CriticalPathRiskBadge risk={task.criticalPathRisk} />
                  ) : null}
                </div>

                {task.dueDate ? (
                  <p className="mt-3 text-sm text-muted">
                    Due: {task.dueDate}
                  </p>
                ) : null}

                <div className="mt-4 grid grid-cols-1 gap-2">
                  <button
                    className="touch-target rounded-md border border-line px-4 text-sm font-semibold text-ink"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingTaskId(task.id);
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                  <Link
                    className="touch-target flex items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white"
                    href={`/projects/${projectId}/tasks/${task.id}`}
                  >
                    View Details
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {showAddForm || editingTask ? (
        <div className="rounded-md border border-line bg-white p-4 shadow-soft">
          <h2 className="text-lg font-semibold text-ink">
            {editingTask ? "Edit Task" : "Add Task"}
          </h2>
          <div className="mt-4">
            <TaskForm
              initialValue={editingTask ? taskToForm(editingTask) : emptyForm}
              isSaving={saving}
              key={editingTask?.id || "new-task"}
              onCancel={() => {
                setEditingTaskId(null);
                setShowAddForm(false);
              }}
              onSubmit={editingTask ? handleUpdate : handleCreate}
              people={people}
              rooms={rooms}
              submitLabel={editingTask ? "Save Task" : "Add Task"}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
