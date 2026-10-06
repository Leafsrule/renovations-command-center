"use client";
import { useState, type FormEvent } from "react";
import { useAuth } from "./AuthProvider";
import { updateOwnerProject, type RenovationProject } from "@/lib/projects";
export function ProjectEditor({
  project,
  onSaved,
}: {
  project: RenovationProject;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState(project.name),
    [scope, setScope] = useState(project.scope),
    [start, setStart] = useState(project.startDate),
    [finish, setFinish] = useState(project.targetFinishDate),
    [status, setStatus] = useState(project.status),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      await updateOwnerProject(project.id, user.uid, {
        name,
        scope,
        startDate: start,
        targetFinishDate: finish,
        status,
        type: project.type,
      });
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
      </form>
    </details>
  );
}
