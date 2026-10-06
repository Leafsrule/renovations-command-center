"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { recalculateSchedule } from "@/lib/recalculate-schedule";
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

type ScheduleView = "day" | "week" | "month" | "critical" | "all";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(new Date(`${date}T12:00:00`));
}

export function ScheduleBoard() {
  const { projectId } = useParams<{ projectId: string }>();
  return <ScheduleBoardContent key={projectId} projectId={projectId} />;
}
function ScheduleBoardContent({projectId}: {projectId:string}) {
  const [tasks, setTasks] = useState<RenovationTask[]>([]);
  const [rooms, setRooms] = useState<RenovationRoom[]>([]);
  const [view, setView] = useState<ScheduleView>("week");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const today = useMemo(() => getTodayDateString(), []);

  async function load(refresh = false) {
    if (refresh) setRefreshing(true);
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
    let live = true;
    Promise.all([listProjectTasks(projectId), listProjectRooms(projectId)])
      .then(([projectTasks, projectRooms]) => { if(live) {setTasks(projectTasks); setRooms(projectRooms);} })
      .catch(e => {if(live) setError(e instanceof Error ? e.message : "Schedule could not be loaded.");})
      .finally(() => {if(live) setLoading(false);});
    return () => {live = false;};
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
    () => new Set(getScheduleWindow(today, view === "day" ? 1 : view === "month" ? 31 : 7)),
    [today, view]
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

    if (["day","week","month"].includes(view)) {
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

      <button disabled={refreshing} className="touch-target rounded bg-brand px-4 text-white" onClick={async () => {
        setRefreshing(true); setError("");
        try {const result = await recalculateSchedule(projectId); await load(true); if(result.blocked.length) setError(`${result.blocked.length} tasks remain unscheduled: ${result.blocked.map(b=>b.reason).join("; ")}`);}
        catch (e) {setError(e instanceof Error ? e.message : "Recalculation failed.");}
        finally {setRefreshing(false);}
      }}>Recalculate schedule</button>
      <p className="text-sm text-muted">Conservative one-worker plan with hard dependencies. Recalculation changes planned dates; it does not confirm work or helper availability.</p>
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
        <div className="mt-3 flex flex-wrap gap-2">
          {(["day", "week", "month", "critical", "all"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setView(value)}
              className={`touch-target rounded-md px-2 text-xs font-semibold ${
                view === value ? "bg-brand text-white" : "bg-panel text-muted"
              }`}
            >
              {value === "day" ? "Day" : value === "week" ? "Week" : value === "month"
                ? "Month"
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
