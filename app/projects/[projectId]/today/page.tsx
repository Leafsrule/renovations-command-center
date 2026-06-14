import { AppShell } from "@/components/AppShell";
import { TodayPlanner } from "@/components/TodayPlanner";

export default function TodayPage() {
  return (
    <AppShell title="Today" subtitle="Ready work only, ordered by priority and schedule risk.">
      <TodayPlanner />
    </AppShell>
  );
}
