import { AppShell } from "@/components/AppShell";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export default function NewTaskPage() {
  return (
    <AppShell title="Add task" subtitle="Task creation placeholder for Phase 1 Foundation.">
      <PagePlaceholder
        title="Task form"
        description="The full task form will include room, status, champion, helper, dependencies, materials, and photo rules."
      />
    </AppShell>
  );
}
