import { AppShell } from "@/components/AppShell";
import { RoomManager } from "@/components/RoomManager";

export default function RoomsPage() {
  return (
    <AppShell title="Rooms" subtitle="Whole-home-ready room and area structure.">
      <RoomManager />
    </AppShell>
  );
}
