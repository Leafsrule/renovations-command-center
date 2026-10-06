import { AppShell } from "@/components/AppShell";
import { TaskManager } from "@/components/TaskManager";

export default function TasksPage() {
  return (
    <AppShell
      showFloatingAddButton={false}
      title="Tasks"
      subtitle="Clean mobile cards with details kept inside task view."
    >
      <TaskManager />
    </AppShell>
  );
}
