import { AppShell } from "@/components/AppShell";
import { ProjectCreateForm } from "@/components/ProjectCreateForm";

export default function NewProjectPage() {
  return (
    <AppShell
      title="Project setup"
      subtitle="Create a Custom or Bathroom/Ensuite project."
    >
      <ProjectCreateForm />
    </AppShell>
  );
}
