import { AppShell } from "@/components/AppShell";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export default function TodayPage() {
  return (
    <AppShell title="Today" subtitle="Ready work only, ordered by priority and schedule risk.">
      <PagePlaceholder
        title="Daily work plan"
        description="Today will separate work into Start first, Do next, Prep if time, and Blocked/not today."
        items={["Start first", "Do next", "Prep if time", "Blocked / not today"]}
      />
    </AppShell>
  );
}
