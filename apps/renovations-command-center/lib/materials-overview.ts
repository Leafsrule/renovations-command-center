import type { RenovationTask, TaskMaterialStatus } from "./tasks";

export type MaterialOverviewItem = {
  key: string;
  name: string;
  status: TaskMaterialStatus;
  taskIds: string[];
  taskNames: string[];
  neededByDate: string | null;
  notes: string[];
};

const severity: Record<TaskMaterialStatus, number> = {
  blocked: 0,
  needed: 1,
  partial: 2,
  ordered: 3,
  ready: 4,
  not_required: 5
};

function earlierDate(current: string | null, candidate: string | null) {
  if (!candidate) return current;
  if (!current) return candidate;
  return candidate < current ? candidate : current;
}

export function buildMaterialOverview(tasks: RenovationTask[]) {
  const groups = new Map<string, MaterialOverviewItem>();

  tasks.forEach((task) => {
    if (task.materialStatus === "not_required" && task.materialItems.length === 0) {
      return;
    }

    const materialNames = task.materialItems.length
      ? task.materialItems
      : ["Material details missing"];

    materialNames.forEach((materialName) => {
      const name = materialName.trim() || "Material details missing";
      const key = name.toLocaleLowerCase();
      const current = groups.get(key);
      const nextStatus =
        !current || severity[task.materialStatus] < severity[current.status]
          ? task.materialStatus
          : current.status;

      groups.set(key, {
        key,
        name: current?.name ?? name,
        status: nextStatus,
        taskIds: [...new Set([...(current?.taskIds ?? []), task.id])],
        taskNames: [...new Set([...(current?.taskNames ?? []), task.name])],
        neededByDate: earlierDate(
          current?.neededByDate ?? null,
          task.materialNeededByDate
        ),
        notes: [
          ...new Set(
            [...(current?.notes ?? []), task.materialNotes, task.materialBlockerNotes]
              .map((note) => note.trim())
              .filter(Boolean)
          )
        ]
      });
    });
  });

  return [...groups.values()].sort((a, b) => {
    if (severity[a.status] !== severity[b.status]) {
      return severity[a.status] - severity[b.status];
    }
    return a.name.localeCompare(b.name);
  });
}

export function getMaterialOverviewSummary(items: MaterialOverviewItem[]) {
  return {
    total: items.length,
    blocked: items.filter((item) => item.status === "blocked").length,
    needed: items.filter((item) => item.status === "needed").length,
    ordered: items.filter((item) => item.status === "ordered").length,
    ready: items.filter((item) => item.status === "ready").length
  };
}
