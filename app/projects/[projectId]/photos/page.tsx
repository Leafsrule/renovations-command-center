import { AppShell } from "@/components/AppShell";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export default function PhotosPage() {
  return (
    <AppShell title="Photos" subtitle="Optional by default, required per task when configured.">
      <PagePlaceholder
        title="Photo upload"
        description="Photos will attach to tasks, rooms, materials, receipts, blockers, and completion records."
        items={["Before", "During", "After", "Issue", "Receipt"]}
      />
    </AppShell>
  );
}
