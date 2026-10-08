"use client";
import { useState, type FormEvent } from "react";
import { useAuth } from "./AuthProvider";
import { taskRevision } from "@/lib/task-command";
import { useBrowserDraft } from "@/lib/browser-draft";
import { updateOwnerProject, type RenovationProject } from "@/lib/projects";
export function ProjectEditor({
  project,
  onSaved,
}: {
  project: RenovationProject;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [draft, setDraft, clearDraft, storageError] = useBrowserDraft(
    `rcc:project-edit:${user?.uid ?? "signed-out"}:${project.id}`,
    {
      name: project.name,
      scope: project.scope,
      start: project.startDate,
      finish: project.targetFinishDate,
      status: project.status,
      revision: taskRevision(project.updatedAt),
    },
  );
  const { name, scope, start, finish, status } = draft;
  const setName = (name: string) => setDraft((d) => ({ ...d, name }));
  const setScope = (scope: string) => setDraft((d) => ({ ...d, scope }));
  const setStart = (start: string) => setDraft((d) => ({ ...d, start }));
  const setFinish = (finish: string) => setDraft((d) => ({ ...d, finish }));
  const setStatus = (status: RenovationProject["status"]) =>
    setDraft((d) => ({ ...d, status }));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      await updateOwnerProject(
        project.id,
        user.uid,
        {
          name,
          scope,
          startDate: start,
          targetFinishDate: finish,
          status,
          type: project.type,
        },
        draft.revision,
      );
      clearDraft();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="rounded border p-4">
      <summary className="cursor-pointer font-semibold">
        Edit / archive / reopen project
      </summary>
      <form className="mt-4 space-y-3" onSubmit={submit}>
        {storageError && <p role="alert">{storageError}</p>}
        <label className="block">
          Name
          <input
            className="block w-full rounded border p-2"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block">
          Scope
          <textarea
            className="block w-full rounded border p-2"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          />
        </label>
        <label className="block">
          Start date
          <input
            className="block w-full rounded border p-2"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label className="block">
          Target finish
          <input
            className="block w-full rounded border p-2"
            type="date"
            value={finish}
            onChange={(e) => setFinish(e.target.value)}
          />
        </label>
        <label className="block">
          Status
          <select
            className="block w-full rounded border p-2"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as RenovationProject["status"])
            }
          >
            {[
              "planning",
              "active",
              "blocked",
              "behind_schedule",
              "on_hold",
              "complete",
              "archived",
            ].map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={busy}
          className="touch-target rounded bg-brand px-4 text-white"
        >
          {busy ? "Saving…" : "Save project"}
        </button>
        <p role="alert">{error}</p>
        <button
          type="button"
          className="touch-target underline"
          onClick={() => {
            if (window.confirm("Discard this local project draft?"))
              clearDraft();
          }}
        >
          Discard local draft
        </button>
      </form>
    </details>
  );
}
