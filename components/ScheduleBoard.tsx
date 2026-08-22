"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { ScheduleTaskCard } from "@/components/ScheduleTaskCard";
import { listProjectRooms, type RenovationRoom } from "@/lib/rooms";
import {
  getProjectSchedulingInsights,
  getProjectSchedulingSummary,
  getTodayDateString
} from "@/lib/scheduling";
import {
  buildScheduleBoardItems,
  getScheduleWindow,
  type ScheduleBoardItem
} from "@/lib/schedule-board";
import { listProjectTasks, type RenovationTask } from "@/lib/tasks";

type ScheduleView = "window" | "critical" | "all";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(new Date(`${date}T12:00:00`));
}

export function ScheduleBoard() {
  const { projectId } = useParams<{ projectId: string }>();
  const [tasks, setTasks] = useState<RenovationTask[]>([]);
  const [rooms, setRooms] = useState<RenovationRoom[]>([]);
  const [view, setView] = useState<ScheduleView>("window");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const today = useMemo(() => getTodayDateString(), []);

  async function load(refresh = false) {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");

    try {
      const [projectTasks, projectRooms] = await Promise.all([
        listProjectTasks(projectId),
        listProjectRooms(projectId)
      ]);
      setTasks(projectTasks);
      setRooms(projectRooms);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "The schedule could not be loaded."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const roomNames = useMemo(
    () => new Map(rooms.map((room) => [room.id, room.name])),
    [rooms]
  );
  const insights = useMemo(
    () => getProjectSchedulingInsights(tasks, today),
    [tasks, today]
  );
  const summary = useMemo(
    () => getProjectSchedulingSummary(insights),
    [insights]
  );
  const items = useMemo(
    () => buildScheduleBoardItems(tasks, roomNames, today),
    [tasks, roomNames, today]
  );
  const windowDates = useMemo(
    () => new Set(getScheduleWindow(today, 14)),
    [today]
  );

  const visibleItems = useMemo(() => {
    if (view === "critical") {
      return items.filter(
        (item) =>
          item.task.criticalPathRisk === "high" ||
          item.task.criticalPathRisk === "medium" ||
          item.visualState === "overdue" ||
          item.visualState === "blocked"
      );
    }

    if (view === "window") {
      return items.filter(
        (item) => item.isUnscheduled || windowDates.has(item.anchorDate)
      );
    }

    return items;
  }, [items, view, windowDates]);

  const groups = useMemo(() => {
    const grouped = new Map<string, ScheduleBoardItem[]>();

    visibleItems.forEach((item) => {
      const key = item.isUnscheduled ? "unscheduled" : item.anchorDate;
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    });

    return [...grouped.entries()].sort(([a], [b]) => {
      if (a === "unscheduled") return 1;
      if (b === "unscheduled") return -1;
      return a.localeCompare(b);
    });
  }, [visibleItems]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">
        Building the schedule view...
      </div>
    );
  }

  const restricted =
    summary.blockedCount +
    summary.waitingOnDependenciesCount +
    summary.waitingOnMaterialsCount;

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-danger bg-white p-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3" aria-label="Schedule summary">
        {[
          ["Completed", `${summary.completedCount}/${summary.totalTasks}`],
          ["Ready now", summary.readyNowCount],
          ["Restricted", restricted],
          ["Late", summary.overdueCount]
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-white p-3 shadow-sm">
            <p className="text-2xl font-semibold text-ink">{value}</p>
            <p className="text-xs text-muted">{label}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-line bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">Schedule view</p>
            <p className="text-xs text-muted">
              Scheduled start, earliest start, then due date.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="touch-target inline-flex items-center rounded-md border border-line px-3 text-sm font-semibold text-ink"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Refresh
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(["window", "critical", "all"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setView(value)}
              className={`touch-target rounded-md px-2 text-xs font-semibold ${
                view === value ? "bg-brand text-white" : "bg-panel text-muted"
              }`}
            >
              {value === "window"
                ? "Next 14 days"
                : value === "critical"
                  ? "Critical"
                  : "All tasks"}
            </button>
          ))}
        </div>
      </section>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-panel p-6 text-center text-sm text-muted">
          No tasks match this view.
        </div>
      ) : (
        groups.map(([date, group]) => (
          <section key={date} className="space-y-2">
            <div className="flex justify-between px-1">
              <h2 className="text-sm font-semibold text-ink">
                {date === "unscheduled" ? "Unscheduled" : formatDate(date)}
              </h2>
              <span className="text-xs text-muted">
                {group.length} task{group.length === 1 ? "" : "s"}
              </span>
            </div>
            <ul className="space-y-2">
              {group.map((item) => (
                <ScheduleTaskCard
                  key={item.task.id}
                  item={item}
                  projectId={projectId}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
