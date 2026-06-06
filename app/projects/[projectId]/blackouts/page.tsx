import { AppShell } from "@/components/AppShell";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export default function BlackoutsPage() {
  return (
    <AppShell title="Blackouts" subtitle="Project-level blackout dates block scheduling first.">
      <PagePlaceholder
        title="Blackout dates"
        description="Room and worker blackout support stays schema-ready, with simple project-level UI first."
      />
    </AppShell>
  );
}
