"use client";
import { useLinkedSection } from "@/lib/section-navigation";
import { displayLabel } from "@/lib/terminology";

import {FieldRecordsWorkspace} from "./FieldRecordsWorkspace";
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
  design: "neutral",
  received: "ready",
  stock: "ready",
  blocked: "blocked",
  needed: "warning",
  partial: "warning",
  ordered: "neutral",
  ready: "ready",
  not_required: "neutral"
} as const;

export function MaterialsWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const [filter,setFilter]=useState("all");
  const [tasks, setTasks] = useState<RenovationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listProjectTasks(projectId)
      .then(rows=>{setTasks(rows);setFilter(new URLSearchParams(window.location.search).get("filter")??"all");})
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

  const visibleMaterials=materials.filter(m=>filter==="ready"?["ready","received","stock"].includes(m.status):["blocked","needed"].includes(filter)?m.status===filter:true);
  useLinkedSection(!loading);
  if (loading) {
    return (
      <div className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">
        Building the material list...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FieldRecordsWorkspace kind="materials" />
      {error ? (
        <div className="rounded-xl border border-danger bg-white p-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3">
        {[
          ["Tracked", summary.total, "all"],
          ["Blocked", summary.blocked, "blocked"],
          ["Needed", summary.needed, "needed"],
          ["Ready", summary.ready, "ready"]
        ].map(([label, value, target]) => (
          <a href={`/projects/${projectId}/materials?filter=${target}#material-overview`} key={label} className="rounded-2xl border border-line bg-white p-3 shadow-sm">
            <p className="text-2xl font-semibold text-ink">{value}</p>
            <p className="text-xs text-muted">{label}</p>
          </a>
        ))}
      </section>

      <div id="material-overview" className="space-y-3">
      {filter!=="all"?<p>Showing: {filter}. <a className="underline" href={`/projects/${projectId}/materials#material-overview`}>Show all materials</a></p>:null}
      {visibleMaterials.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-panel p-6 text-center text-sm text-muted">
          No materials match this view.
        </div>
      ) : (
        <ul className="space-y-3">
          {visibleMaterials.map((material) => (
            <li key={material.key} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-ink">{material.name}</h2>
                  <p className="mt-1 text-xs text-muted">
                    Needed by {material.neededByDate ?? "date not set"}
                  </p>
                </div>
                <StatusBadge href={`/projects/${projectId}/tasks?edit=${encodeURIComponent(tasks.find(task=>material.taskIds.includes(task.id) && task.materialStatus===material.status)?.id ?? material.taskIds[0])}#task-materials`}
                  label={displayLabel(material.status)}
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
    </div>
  );
}
