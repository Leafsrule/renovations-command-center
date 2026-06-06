import { AppShell } from "@/components/AppShell";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export default function ProjectCommandCenterPage() {
  return (
    <AppShell title="Command center" subtitle="Snapshot of active work, blockers, and schedule readiness.">
      <PagePlaceholder
        title="Active project"
        description="This overview will summarize rooms, ready tasks, blockers, and simple critical-path risk."
        items={["Ready work", "Blocked work", "Upcoming schedule", "Recent photos"]}
      />
    </AppShell>
  );
}
