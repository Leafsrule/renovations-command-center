"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { listProjectTasks } from "@/lib/tasks";
import { getTodayDateString } from "@/lib/scheduling";
import { dailyWorkReport, type WorkEvent } from "@/lib/work-report";
import { useAuth } from "./AuthProvider";
export function DailyWorkReport() {
  const { projectId } = useParams<{ projectId: string }>(),
    { user } = useAuth();
  return user ? (
    <ReportContent key={`${user.uid}:${projectId}`} projectId={projectId} />
  ) : (
    <p>Sign in to see work records.</p>
  );
}
function ReportContent({ projectId }: { projectId: string }) {
  const [date, setDate] = useState(getTodayDateString()),
    [events, setEvents] = useState<WorkEvent[]>([]),
    [names, setNames] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    async function load() {
      if (!db) throw new Error("Firestore is not configured.");
      const [history, tasks] = await Promise.all([
        getDocs(collection(db, "projects", projectId, "taskHistory")),
        listProjectTasks(projectId),
      ]);
      if (active) {
        setEvents(
          history.docs.map((d) => ({ id: d.id, ...d.data() }) as WorkEvent),
        );
        setNames(Object.fromEntries(tasks.map((t) => [t.id, t.name])));
        setLoading(false);
      }
    }
    void load().catch((e) => {
      if (active) {
        setError(
          e instanceof Error ? e.message : "Work records failed to load.",
        );
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [projectId]);
  const report = dailyWorkReport(events, date, names);
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Daily work record — {date}</h2>
      <label className="block">
        Toronto work date
        <input
          className="ml-3 rounded border p-2"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <button
        className="touch-target rounded bg-brand px-4 text-white"
        onClick={() => window.print()}
      >
        Print / save PDF
      </button>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p>Loading work records…</p>
      ) : (
        !error && (
          <>
            <p>
              Recorded actual work: {Math.floor(report.totalMinutes / 60)}h{" "}
              {report.totalMinutes % 60}m. Actions without work entries add no
              hours.
            </p>
            {!report.rows.length ? (
              <p>No saved work entries or task actions for this date.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr>
                      <th className="p-2">Task</th>
                      <th className="p-2">Action</th>
                      <th className="p-2">Minutes</th>
                      <th className="p-2">Work / reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row) => (
                      <tr className="border-t" key={row.id}>
                        <td className="p-2">{row.name}</td>
                        <td className="p-2">
                          {row.action.replaceAll("_", " ")}
                        </td>
                        <td className="p-2">{row.minutes || "—"}</td>
                        <td className="p-2">{row.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )
      )}
    </section>
  );
}
