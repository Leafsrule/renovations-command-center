import { AppShell } from "@/components/AppShell";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export default function NewProjectPage() {
  return (
    <AppShell title="Project setup" subtitle="Custom and Bathroom/Ensuite templates start here.">
      <PagePlaceholder
        title="Setup wizard"
        description="Create the project, rooms, default work hours, lightweight people, and known constraints."
        items={["Custom Project", "Bathroom/Ensuite starter template", "Project default work hours"]}
      />
    </AppShell>
  );
}
