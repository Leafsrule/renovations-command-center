import { AppShell } from "@/components/AppShell";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export default function PeoplePage() {
  return (
    <AppShell title="People" subtitle="Owner is authenticated; champions/helpers are lightweight records.">
      <PagePlaceholder
        title="Champions and helpers"
        description="People records can later link to real user accounts through an optional linkedUserId."
        items={["Owner", "Champion", "Helper"]}
      />
    </AppShell>
  );
}
