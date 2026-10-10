import { AppShell } from "@/components/AppShell";
import { MaterialsWorkspace } from "@/components/MaterialsWorkspace";

export default function MaterialsPage() {
  return (
    <AppShell title="Materials" subtitle="Task-linked material readiness.">
      <MaterialsWorkspace />
    </AppShell>
  );
}
