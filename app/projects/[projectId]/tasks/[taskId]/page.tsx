import { AppShell } from "@/components/AppShell";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export default function TaskDetailPage() {
  return (
    <AppShell title="Task detail" subtitle="All deeper task fields live here, not on the card.">
      <PagePlaceholder
        title="Task tabs"
        description="Details, dependencies, materials, photos, QC, and notes will be organized here."
        items={["Details", "Dependencies", "Materials", "Photos", "Notes"]}
      />
    </AppShell>
  );
}
