import { AppShell } from "@/components/AppShell";
import { PeopleManager } from "@/components/PeopleManager";

export default function PeoplePage() {
  return (
    <AppShell
      title="People"
      subtitle="Owner is authenticated; champions/helpers are lightweight records."
    >
      <PeopleManager />
    </AppShell>
  );
}
