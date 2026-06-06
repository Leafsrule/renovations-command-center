import { AppShell } from "@/components/AppShell";
import { CriticalPathRiskBadge } from "@/components/CriticalPathRiskBadge";
import { StatusBadge } from "@/components/StatusBadge";

export default function TasksPage() {
  return (
    <AppShell title="Tasks" subtitle="Clean mobile cards with details kept inside task view.">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Master task list</h2>
        <article className="rounded-md border border-line bg-white p-3 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-ink">Tile layout</h3>
              <p className="mt-1 text-sm text-muted">Ensuite</p>
            </div>
            <StatusBadge label="Ready" tone="ready" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge label="Champion: Owner" />
            <StatusBadge label="Helper needed" tone="warning" />
            <StatusBadge label="Material warning" tone="warning" />
            <CriticalPathRiskBadge risk="medium" />
          </div>
          <p className="mt-3 text-sm text-muted">Scheduled: not set</p>
        </article>
      </section>
    </AppShell>
  );
}
