import { AppShell } from "@/components/AppShell";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export default function TaskDependenciesPage() {
  return (
    <AppShell title="Dependencies" subtitle="Predecessors, cure times, and override rules.">
      <PagePlaceholder
        title="Dependency manager"
        description="Dependencies will support finish-to-start, wait/cure lags, required links, and circular dependency prevention."
      />
    </AppShell>
  );
}
