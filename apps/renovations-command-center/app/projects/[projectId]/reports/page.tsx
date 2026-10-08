import { AppShell } from "@/components/AppShell";
import { DailyWorkReport } from "@/components/DailyWorkReport";
export default function WorkReportPage() {
  return (
    <AppShell
      title="Daily work record"
      subtitle="Saved work and task actions, grouped by Toronto date."
    >
      <DailyWorkReport />
    </AppShell>
  );
}
