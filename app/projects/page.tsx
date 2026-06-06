import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export default function ProjectsPage() {
  return (
    <AppShell
      title="Projects"
      subtitle="Multiple projects are supported in the data model; one active project is shown first."
    >
      <div className="space-y-4">
        <PagePlaceholder
          title="Project dashboard"
          description="A quiet project list for active renovations, health status, blockers, and next work."
          items={["Active project card", "Critical-path warning", "Next ready task"]}
        />
        <Link
          href="/projects/new"
          className="touch-target flex items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white"
        >
          Set up project
        </Link>
      </div>
    </AppShell>
  );
}
