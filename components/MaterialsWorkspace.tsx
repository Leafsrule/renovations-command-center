"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import {
  buildMaterialOverview,
  getMaterialOverviewSummary
} from "@/lib/materials-overview";
import { listProjectTasks, type RenovationTask } from "@/lib/tasks";

const tones = {
  blocked: "blocked",
  needed: "warning",
  partial: "warning",
  ordered: "neutral",
  ready: "ready",
  not_required: "neutral"
} as const;

export function MaterialsWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const [tasks, setTasks] = useState<RenovationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listProjectTasks(projectId)
      .then(setTasks)
      .catch((loadError) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Materials could not be loaded."
        )
      )
      .finally(() => setLoading(false));
  }, [projectId]);

  const materials = useMemo(() => buildMaterialOverview(tasks), [tasks]);
  const summary = useMemo(
    () => getMaterialOverviewSummary(materials),
    [materials]
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">
        Building the material list...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-danger bg-white p-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3">
        {[
          ["Tracked", summary.total],
          ["Blocked", summary.blocked],
          ["Needed", summary.needed],
          ["Ready", summary.ready]
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-white p-3 shadow-sm">
            <p className="text-2xl font-semibold text-ink">{value}</p>
            <p className="text-xs text-muted">{label}</p>
          </div>
        ))}
      </section>

      {materials.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-panel p-6 text-center text-sm text-muted">
          No task-linked materials have been entered yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {materials.map((material) => (
            <li key={material.key} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-ink">{material.name}</h2>
                  <p className="mt-1 text-xs text-muted">
                    Needed by {material.neededByDate ?? "date not set"}
                  </p>
                </div>
                <StatusBadge
                  label={material.status.replaceAll("_", " ")}
                  tone={tones[material.status]}
                />
              </div>

              <div className="mt-3 space-y-2">
                {material.taskIds.map((taskId, index) => (
                  <Link
                    key={taskId}
                    href={`/projects/${projectId}/tasks/${taskId}`}
                    className="block rounded-md bg-panel px-3 py-2 text-sm font-medium text-ink"
                  >
                    {material.taskNames[index] ?? "Linked task"}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
