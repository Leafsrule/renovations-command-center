import { AppShell } from "@/components/AppShell";
import { ProjectDetail } from "@/components/ProjectDetail";

export default function ProjectCommandCenterPage() {
  return (
    <AppShell title="Command center" subtitle="Snapshot of active work, blockers, and schedule readiness.">
      <ProjectDetail />
    </AppShell>
  );
}
