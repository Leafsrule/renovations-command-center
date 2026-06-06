import { AppShell } from "@/components/AppShell";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export default function RoomsPage() {
  return (
    <AppShell title="Rooms" subtitle="Whole-home-ready room and area structure.">
      <PagePlaceholder
        title="Room manager"
        description="Rooms organize tasks, photos, priorities, notes, and future whole-home expansion."
        items={["Ensuite", "Main floor", "Basement", "Exterior"]}
      />
    </AppShell>
  );
}
