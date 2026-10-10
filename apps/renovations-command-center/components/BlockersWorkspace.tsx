"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { listProjectTasks, type RenovationTask } from "@/lib/tasks";
export function BlockersWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const [tasks, setTasks] = useState<RenovationTask[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    listProjectTasks(projectId)
      .then((value) => {
        if (live) setTasks(value);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [projectId]);
  if (loading) return <p>Loading blockers…</p>;
  if (error) return <p role="alert">{error}</p>;
  const blocked = tasks.filter(
    (t) => t.status === "blocked" || t.blockerType !== "none",
  );
  return (
    <section className="space-y-3">
      <p className="text-sm">
        Clear blockers through Today so dependencies, materials and other
        restrictions are rechecked.
      </p>
      {blocked.map((t) => (
        <article key={t.id} className="rounded border p-4">
          <h2 className="font-semibold">{t.name}</h2>
          <p>
            {t.blockerType.replaceAll("_", " ")}:{" "}
            {t.blockerNotes || "No resolution note recorded."}
          </p>
          {t.blockedUntilDate ? (
            <p>Blocked until {t.blockedUntilDate}</p>
          ) : null}
          <div className="flex flex-wrap gap-4">
            <Link
              className="touch-target underline"
              href={`/projects/${projectId}/tasks/${t.id}`}
            >
              Task details
            </Link>
            <Link
              className="touch-target underline"
              href={`/projects/${projectId}/today`}
            >
              Resolve in Today
            </Link>
          </div>
        </article>
      ))}
      {!blocked.length ? <p>No manual blockers recorded.</p> : null}
    </section>
  );
}
