"use client";

import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function NewTaskPage() {
  const params = useParams<{ projectId: string }>();

  return (
    <AppShell title="Add task" subtitle="Add tasks from the main task list.">
      <section className="rounded-md border border-line bg-panel p-4">
        <h2 className="text-lg font-semibold text-ink">
          Add tasks from the task list
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          The Add Task form now lives on the main Tasks page.
        </p>
        <Link
          className="touch-target mt-4 flex items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white"
          href={`/projects/${params.projectId}/tasks`}
        >
          Go to Tasks
        </Link>
      </section>
    </AppShell>
  );
}
