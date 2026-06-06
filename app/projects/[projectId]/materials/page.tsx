import { AppShell } from "@/components/AppShell";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export default function MaterialsPage() {
  return (
    <AppShell title="Materials" subtitle="Costs are stored but shown only on detail screens.">
      <PagePlaceholder
        title="Material blockers"
        description="Main cards will show material status and task impact, while cost details stay inside material detail."
        items={["Needed", "Ordered", "Delivered", "On site", "Missing"]}
      />
    </AppShell>
  );
}
