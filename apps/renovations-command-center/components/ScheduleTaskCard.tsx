import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import type { ScheduleBoardItem, ScheduleVisualState } from "@/lib/schedule-board";

const stateMap: Record<
  ScheduleVisualState,
  { label: string; tone: "neutral" | "ready" | "blocked" | "warning"; border: string }
> = {
  completed: { label: "Completed", tone: "ready", border: "border-l-[#6cae9f]" },
  overdue: { label: "Late", tone: "blocked", border: "border-l-danger" },
  blocked: { label: "Blocked", tone: "blocked", border: "border-l-danger" },
  waiting: { label: "Waiting", tone: "warning", border: "border-l-caution" },
  review: { label: "Review", tone: "warning", border: "border-l-caution" },
  in_progress: { label: "In progress", tone: "ready", border: "border-l-brand" },
  ready: { label: "Ready", tone: "ready", border: "border-l-brand" },
  scheduled: { label: "Scheduled", tone: "neutral", border: "border-l-[#7894a3]" },
  pending: { label: "Pending", tone: "neutral", border: "border-l-line" }
};

function formatMinutes(minutes: number | null) {
  if (!minutes) return "Duration missing";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h${remainder ? ` ${remainder}m` : ""}` : `${remainder}m`;
}

export function ScheduleTaskCard({
  item,
  projectId
}: {
  item: ScheduleBoardItem;
  projectId: string;
}) {
  const state = stateMap[item.visualState];

  return (
    <li className={`rounded-2xl border border-l-4 border-line bg-white p-4 shadow-sm ${state.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/projects/${projectId}/tasks/${item.task.id}`} className="font-semibold text-ink">
            {item.task.name}
          </Link>
          <p className="mt-1 text-xs text-muted">
            {item.roomName} • {formatMinutes(item.task.estimatedDurationMinutes)}
          </p>
        </div>
        <StatusBadge label={state.label} tone={state.tone} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
        <span className="rounded-md bg-panel px-2 py-1">Due {item.task.dueDate ?? "not set"}</span>
        {item.task.canRunConcurrent ? <span className="rounded-md bg-panel px-2 py-1">Concurrent</span> : null}
        {item.task.dependencyTaskIds.length ? (
          <span className="rounded-md bg-panel px-2 py-1">{item.task.dependencyTaskIds.length} dependencies</span>
        ) : null}
        {item.task.materialStatus !== "not_required" ? (
          <span className="rounded-md bg-panel px-2 py-1">
            Materials: {item.task.materialStatus.replaceAll("_", " ")}
          </span>
        ) : null}
      </div>
      {item.insight.reasons[0] ? (
        <p className="mt-3 rounded-md bg-panel px-3 py-2 text-xs text-muted">{item.insight.reasons[0]}</p>
      ) : null}
    </li>
  );
}
