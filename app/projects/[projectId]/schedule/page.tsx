import { AppShell } from "@/components/AppShell";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export default function SchedulePage() {
  return (
    <AppShell title="Schedule" subtitle="Manual recalculation updates task dates and Today order.">
      <PagePlaceholder
        title="Schedule readiness"
        description="Task readiness updates automatically; full schedule recalculation waits for Owner action."
        items={["Recalculate Schedule", "Project work hours", "Project blackout dates"]}
      />
    </AppShell>
  );
}
