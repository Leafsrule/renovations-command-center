import { AppShell } from "@/components/AppShell";
import { ScheduleBoard } from "@/components/ScheduleBoard";

export default function SchedulePage() {
  return (
    <AppShell title="Schedule" subtitle="See project timing and task restrictions.">
      <ScheduleBoard />
    </AppShell>
  );
}
