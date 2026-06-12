"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CriticalPathRiskBadge } from "@/components/CriticalPathRiskBadge";
import { StatusBadge } from "@/components/StatusBadge";
import {
  getTaskSchedulingInsight,
  getTodayDateString,
  type TaskSchedulingCategory
} from "@/lib/scheduling";
import { listProjectPeople, type RenovationPerson } from "@/lib/people";
import { listProjectRooms, type RenovationRoom } from "@/lib/rooms";
import {
  getProjectTask,
  listProjectTasks,
  type RenovationTask,
  type TaskBlockerType,
  type TaskMaterialStatus,
  type TaskPhase,
  type TaskPriority,
  type TaskReadinessState,
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

const readinessLabels: Record<TaskReadinessState, string> = {
  not_ready: "Not ready",
  ready: "Ready",
  blocked: "Blocked",
  needs_review: "Needs review"
};

const blockerLabels: Record<TaskBlockerType, string> = {
  none: "None",
  dependency: "Dependency",
  material: "Material",
  site_condition: "Site condition",
  labor: "Labor",
  access: "Access",
  inspection: "Inspection",
  client_decision: "Client decision",
  weather: "Weather",
  safety: "Safety",
  other: "Other"
};

const readinessReasonLabels: Record<string, string> = {
  dependency_not_complete: "Dependency not complete",
  materials_not_ready: "Materials not ready",
  site_not_prepared: "Site not prepared",
  access_not_ready: "Access not ready",
  labor_not_available: "Labor not available",
  inspection_required: "Inspection required",
  client_decision_needed: "Client decision needed",
  weather_issue: "Weather issue",
  safety_concern: "Safety concern",
  other: "Other"
};

const materialLabels: Record<TaskMaterialStatus, string> = {
  not_required: "Not required",
  needed: "Needed",
  ordered: "Ordered",
  partial: "Partially ready",
  ready: "Ready",
  blocked: "Blocked"
};

const schedulingLabels: Record<TaskSchedulingCategory, string> = {
  completed: "Completed",
  recommended_next: "Recommended next",
  ready_now: "Ready now",
  overdue: "Overdue",
  due_soon: "Due soon",
  blocked: "Blocked",
  waiting_on_dependencies: "Waiting - deps",
  waiting_on_materials: "Waiting - materials",
  needs_review: "Needs review",
  scheduled_later: "Scheduled later",
  not_ready: "Not ready"
};

function friendlyTaskError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Task details could not be loaded. Please try again.";
}

function formatUnknownTimestamp(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();

    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      return date.toLocaleString();
    }
  }

  return "";
}

function readinessTone(
  readinessState: TaskReadinessState
): "neutral" | "ready" | "blocked" | "warning" {
  if (readinessState === "ready") {
    return "ready";
  }

  if (readinessState === "blocked") {
    return "blocked";
  }

  if (readinessState === "needs_review") {
    return "warning";
  }

  return "neutral";
}

function materialTone(
  materialStatus: TaskMaterialStatus
): "neutral" | "ready" | "blocked" | "warning" {
  if (materialStatus === "ready") {
    return "ready";
  }

  if (materialStatus === "blocked") {
    return "blocked";
  }

  if (
    materialStatus === "needed" ||
    materialStatus === "ordered" ||
    materialStatus === "partial"
  ) {
    return "warning";
  }

  return "neutral";
}

function schedulingTone(
  category: TaskSchedulingCategory
): "neutral" | "ready" | "blocked" | "warning" {
  if (category === "recommended_next" || category === "ready_now") {
    return "ready";
  }

  if (category === "blocked" || category === "overdue") {
    return "blocked";
  }

  if (
    category === "waiting_on_dependencies" ||
    category === "waiting_on_materials" ||
    category === "needs_review" ||
    category === "due_soon"
  ) {
    return "warning";
  }

  return "neutral";
}

export function TaskDetail() {
  const params = useParams<{ projectId: string; taskId: string }>();
  const router = useRouter();
  const { projectId, taskId } = params;
  const [task, setTask] = useState<RenovationTask | null>(null);
  const [dependencyTasks, setDependencyTasks] = useState<RenovationTask[]>([]);
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
  const today = useMemo(() => getTodayDateString(), []);
  const schedulingTaskMap = useMemo(() => {
    const taskMap = new Map(
      dependencyTasks.map((dependencyTask) => [
        dependencyTask.id,
        dependencyTask
      ])
    );

    if (task) {
      taskMap.set(task.id, task);
    }

    return taskMap;
  }, [dependencyTasks, task]);
  const schedulingInsight = useMemo(
    () =>
      task ? getTaskSchedulingInsight(task, schedulingTaskMap, today) : null,
    [schedulingTaskMap, task, today]
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
        const projectDependencyTasks =
          projectTask && projectTask.dependencyTaskIds.length > 0
            ? await listProjectTasks(projectId).catch(() => [])
            : [];

        if (!cancelled) {
          setTask(projectTask);
          setDependencyTasks(projectDependencyTasks);
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
    .map((personId) => personNameById.get(personId) || "Unknown person");
  const dependencyTaskById = new Map(
    dependencyTasks.map((dependencyTask) => [
      dependencyTask.id,
      dependencyTask
    ])
  );
  const dependencyCompletion =
    task.dependencyTaskIds.length > 0 && dependencyTasks.length > 0
      ? {
          completed: task.dependencyTaskIds.filter(
            (dependencyTaskId) =>
              dependencyTaskById.get(dependencyTaskId)?.status === "complete"
          ).length,
          total: task.dependencyTaskIds.length
        }
      : null;
  const createdAtLabel = formatUnknownTimestamp(task.createdAt);
  const updatedAtLabel = formatUnknownTimestamp(task.updatedAt);

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
          <CriticalPathRiskBadge risk={task.criticalPathRisk} />
        </div>

        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="font-semibold text-ink">Room</dt>
            <dd className="mt-1 text-muted">
              {task.roomId
                ? roomNameById.get(task.roomId) || "Unknown room"
                : "No room selected"}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Champion</dt>
            <dd className="mt-1 text-muted">
              {task.championPersonId
                ? personNameById.get(task.championPersonId) ||
                  "Unknown person"
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
            <dt className="font-semibold text-ink">Dependencies</dt>
            <dd className="mt-2">
              {task.dependencyTaskIds.length === 0 ? (
                <span className="text-muted">No dependencies.</span>
              ) : (
                <div className="space-y-2">
                  {task.dependencyTaskIds.map((dependencyTaskId) => {
                    const dependencyTask =
                      dependencyTaskById.get(dependencyTaskId) || null;

                    return (
                      <div
                        className="rounded-md border border-line bg-panel p-3"
                        key={dependencyTaskId}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            className="font-semibold text-brand underline"
                            href={`/projects/${projectId}/tasks/${dependencyTaskId}`}
                          >
                            {dependencyTask?.name || "Unknown task"}
                          </Link>
                          {dependencyTask ? (
                            <StatusBadge
                              label={statusLabels[dependencyTask.status]}
                            />
                          ) : null}
                        </div>
                        {dependencyTask?.roomId ? (
                          <p className="mt-2 text-sm text-muted">
                            {roomNameById.get(dependencyTask.roomId) ||
                              "Unknown room"}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Readiness / Blockers</dt>
            <dd className="mt-2 space-y-3">
              <div className="flex flex-wrap gap-2">
                <StatusBadge
                  label={readinessLabels[task.readinessState]}
                  tone={readinessTone(task.readinessState)}
                />
                <StatusBadge
                  label={`Blocker: ${blockerLabels[task.blockerType]}`}
                  tone={task.blockerType === "none" ? "neutral" : "blocked"}
                />
              </div>

              {dependencyCompletion ? (
                <div className="rounded-md border border-line bg-panel p-3">
                  <p className="font-semibold text-ink">
                    Dependencies complete: {dependencyCompletion.completed}/
                    {dependencyCompletion.total}
                  </p>
                  {dependencyCompletion.completed < dependencyCompletion.total ? (
                    <p className="mt-1 text-muted">
                      Some dependency tasks are not complete yet.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div>
                <p className="font-semibold text-ink">Readiness reasons</p>
                {task.readinessReasons.length > 0 ? (
                  <ul className="mt-1 list-inside list-disc text-muted">
                    {task.readinessReasons.map((reason) => (
                      <li key={reason}>
                        {readinessReasonLabels[reason] || reason}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-muted">
                    No readiness reasons listed.
                  </p>
                )}
              </div>

              <div>
                <p className="font-semibold text-ink">Blocker notes</p>
                {task.blockerType === "none" && !task.blockerNotes ? (
                  <p className="mt-1 text-muted">No blocker recorded.</p>
                ) : (
                  <p className="mt-1 leading-6 text-muted">
                    {task.blockerNotes || "No blocker notes listed."}
                  </p>
                )}
              </div>

              <div>
                <p className="font-semibold text-ink">
                  Blocked until / review date
                </p>
                <p className="mt-1 text-muted">
                  {task.blockedUntilDate || "Not set"}
                </p>
              </div>
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Materials</dt>
            <dd className="mt-2 space-y-3">
              <div className="flex flex-wrap gap-2">
                <StatusBadge
                  label={materialLabels[task.materialStatus]}
                  tone={materialTone(task.materialStatus)}
                />
                {task.materialStatus === "blocked" ? (
                  <StatusBadge label="Material blocker" tone="blocked" />
                ) : null}
              </div>

              {task.materialStatus === "needed" ||
              task.materialStatus === "partial" ||
              task.materialStatus === "blocked" ? (
                <div className="rounded-md border border-line bg-panel p-3">
                  <p className="font-semibold text-ink">
                    Materials may not be ready for this task.
                  </p>
                  {task.materialStatus === "blocked" ? (
                    <p className="mt-1 text-muted">
                      Material blocker recorded.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {task.materialStatus === "not_required" &&
              task.materialItems.length === 0 &&
              !task.materialNotes &&
              !task.materialBlockerNotes ? (
                <p className="text-muted">No material requirements recorded.</p>
              ) : null}

              <div>
                <p className="font-semibold text-ink">Material items</p>
                {task.materialItems.length > 0 ? (
                  <ul className="mt-1 list-inside list-disc text-muted">
                    {task.materialItems.map((materialItem) => (
                      <li key={materialItem}>{materialItem}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-muted">
                    No material items listed.
                  </p>
                )}
              </div>

              {task.materialNotes ? (
                <div>
                  <p className="font-semibold text-ink">Material notes</p>
                  <p className="mt-1 leading-6 text-muted">
                    {task.materialNotes}
                  </p>
                </div>
              ) : null}

              {task.materialNeededByDate ? (
                <div>
                  <p className="font-semibold text-ink">Materials needed by</p>
                  <p className="mt-1 text-muted">
                    {task.materialNeededByDate}
                  </p>
                </div>
              ) : null}

              {task.materialBlockerNotes ? (
                <div>
                  <p className="font-semibold text-ink">
                    Material blocker notes
                  </p>
                  <p className="mt-1 leading-6 text-muted">
                    {task.materialBlockerNotes}
                  </p>
                </div>
              ) : null}
            </dd>
          </div>
          {schedulingInsight ? (
            <div>
              <dt className="font-semibold text-ink">Scheduling Insight</dt>
              <dd className="mt-2 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge
                    label={schedulingLabels[schedulingInsight.category]}
                    tone={schedulingTone(schedulingInsight.category)}
                  />
                  {schedulingInsight.isOverdue ? (
                    <StatusBadge label="Due date passed" tone="blocked" />
                  ) : null}
                  {schedulingInsight.isDueSoon ? (
                    <StatusBadge label="Due soon" tone="warning" />
                  ) : null}
                </div>

                {schedulingInsight.reasons.length > 0 ? (
                  <ul className="list-inside list-disc text-muted">
                    {schedulingInsight.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted">
                    No scheduling issues detected.
                  </p>
                )}

                {schedulingInsight.blockingDependencyIds.length > 0 ? (
                  <div>
                    <p className="font-semibold text-ink">
                      Blocking dependencies
                    </p>
                    <ul className="mt-1 list-inside list-disc text-muted">
                      {schedulingInsight.blockingDependencyIds.map(
                        (dependencyTaskId) => {
                          const dependencyTask =
                            dependencyTaskById.get(dependencyTaskId);

                          return (
                            <li key={dependencyTaskId}>
                              {dependencyTask?.name || "Unknown task"}
                            </li>
                          );
                        }
                      )}
                    </ul>
                  </div>
                ) : null}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="font-semibold text-ink">Estimated duration</dt>
            <dd className="mt-1 text-muted">
              {task.estimatedDurationMinutes === null
                ? "Not set"
                : `${task.estimatedDurationMinutes} minutes`}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Earliest start date</dt>
            <dd className="mt-1 text-muted">
              {task.earliestStartDate || "Not set"}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Due date</dt>
            <dd className="mt-1 text-muted">{task.dueDate || "Not set"}</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Photos required</dt>
            <dd className="mt-1 text-muted">
              {task.photosRequired ? "Yes" : "No"}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Can run concurrent</dt>
            <dd className="mt-1 text-muted">
              {task.canRunConcurrent ? "Yes" : "No"}
            </dd>
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
          {createdAtLabel ? (
            <div>
              <dt className="font-semibold text-ink">Created</dt>
              <dd className="mt-1 text-muted">{createdAtLabel}</dd>
            </div>
          ) : null}
          {updatedAtLabel ? (
            <div>
              <dt className="font-semibold text-ink">Updated</dt>
              <dd className="mt-1 text-muted">{updatedAtLabel}</dd>
            </div>
          ) : null}
        </dl>
      </article>
    </section>
  );
}
