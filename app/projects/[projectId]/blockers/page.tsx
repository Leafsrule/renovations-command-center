import { AppShell } from "@/components/AppShell";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export default function BlockersPage() {
  return (
    <AppShell title="Blockers" subtitle="Manual blockers are separate from material-generated blockers.">
      <PagePlaceholder
        title="Manual blockers"
        description="Manual blockers cover labour, access, damage, inspection, unknown issues, and weather."
        items={["Labour", "Access", "Damage", "Inspection", "Weather"]}
      />
    </AppShell>
  );
}
