import { AppShell } from "@/components/AppShell";
import { ProjectDashboard } from "@/components/ProjectDashboard";

export default function ProjectsPage() {
  return (
    <AppShell
      title="Projects"
      subtitle="Multiple projects are supported in the data model; one active project is shown first."
    >
      <ProjectDashboard />
    </AppShell>
  );
}
