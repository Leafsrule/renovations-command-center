import { AppShell } from "@/components/AppShell";
import { TaskDetail } from "@/components/TaskDetail";

export default function TaskDetailPage() {
  return (
    <AppShell title="Task detail" subtitle="All deeper task fields live here, not on the card.">
      <TaskDetail />
    </AppShell>
  );
}
