"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useBrowserDraft } from "@/lib/browser-draft";
import { useAuth } from "./AuthProvider";
import type { QualityInput } from "@/lib/task-command";
import { saveTaskQuality, type QualityItem } from "@/lib/task-quality";
import { taskRevision } from "@/lib/task-command";
import type { RenovationTask } from "@/lib/tasks";
export function TaskQualityPanel({
  projectId,
  task,
  onSaved,
}: {
  projectId: string;
  task: RenovationTask;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const initial = {
    items: task.qcChecklist ?? [],
    required: Boolean(task.qcRequired),
    cureUntil: task.cureUntil ?? null,
    overrideReason: "",
    workMinutes: 0,
    workNote: "",
    rework: false,
    expectedRevision: taskRevision(task.updatedAt),
  };
  const [draft, setDraft, clearDraft, storageError] = useBrowserDraft<
    QualityInput & { expectedRevision: string }
  >(
    `rcc:quality:${user?.uid ?? "signed-out"}:${projectId}:${task.id}`,
    initial,
  );
  const {
    items,
    required,
    cureUntil: cure,
    overrideReason: override,
    workMinutes: minutes,
    workNote: note,
    rework,
  } = draft;
  const setItems = (items: QualityItem[]) => setDraft((d) => ({ ...d, items }));
  const setRequired = (required: boolean) =>
    setDraft((d) => ({ ...d, required }));
  const setCure = (cureUntil: string) =>
    setDraft((d) => ({ ...d, cureUntil: cureUntil || null }));
  const setOverride = (overrideReason: string) =>
    setDraft((d) => ({ ...d, overrideReason }));
  const setMinutes = (workMinutes: number) =>
    setDraft((d) => ({ ...d, workMinutes }));
  const setNote = (workNote: string) => setDraft((d) => ({ ...d, workNote }));
  const setRework = (rework: boolean) => setDraft((d) => ({ ...d, rework }));
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await saveTaskQuality(
        projectId,
        task.id,
        {
          items,
          required,
          cureUntil: cure || null,
          overrideReason: override,
          workMinutes: minutes,
          workNote: note,
          rework,
        },
        draft.expectedRevision,
      );
      clearDraft();
      setMessage("Review and actual work saved.");
      onSaved();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="space-y-3 rounded border bg-white p-4" onSubmit={submit}>
      {storageError && <p role="alert">{storageError}</p>}
      <h2 className="font-semibold">Quality review and work record</h2>
      <Link className="underline" href={`/projects/${projectId}/photos`}>
        Upload required photos / receipts
      </Link>
      <label className="block">
        <input
          type="checkbox"
          checked={required}
          onChange={(e) => setRequired(e.target.checked)}
        />{" "}
        Require quality checklist before completion
      </label>
      {items.map((item, index) => (
        <fieldset key={index} className="space-y-2 rounded border p-2">
          <legend>Check {index + 1}</legend>
          <label className="block">
            Description
            <input
              required
              className="block w-full rounded border p-2"
              value={item.label}
              onChange={(e) =>
                setItems(
                  items.map((i, n) =>
                    n === index ? { ...i, label: e.target.value } : i,
                  ),
                )
              }
            />
          </label>
          <label className="mr-4">
            <input
              type="checkbox"
              checked={item.required}
              onChange={(e) =>
                setItems(
                  items.map((i, n) =>
                    n === index ? { ...i, required: e.target.checked } : i,
                  ),
                )
              }
            />{" "}
            Required
          </label>
          <label>
            <input
              type="checkbox"
              checked={item.passed}
              onChange={(e) =>
                setItems(
                  items.map((i, n) =>
                    n === index ? { ...i, passed: e.target.checked } : i,
                  ),
                )
              }
            />{" "}
            Passed
          </label>
        </fieldset>
      ))}
      <button
        type="button"
        className="touch-target underline"
        onClick={() =>
          setItems([...items, { label: "", required: true, passed: false }])
        }
      >
        Add checklist item
      </button>
      <label className="block">
        Curing release time (include timezone, e.g. 2026-10-07T10:00:00-04:00)
        <input
          className="block w-full rounded border p-2"
          value={cure ?? ""}
          onChange={(e) => setCure(e.target.value)}
          placeholder="Leave blank if not a timed cure"
        />
      </label>
      <label className="block">
        Actual work minutes to add
        <input
          className="block w-full rounded border p-2"
          type="number"
          min="0"
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
        />
      </label>
      <label className="block">
        Work performed
        <textarea
          className="block w-full rounded border p-2"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <label className="block">
        <input
          type="checkbox"
          checked={rework}
          onChange={(e) => setRework(e.target.checked)}
        />{" "}
        Require rework
      </label>
      <details>
        <summary>Owner completion exception</summary>
        <p className="text-sm">
          An explicit exception permits completion without required media or
          QC and records your reason in history.
        </p>
        <label className="block">
          Reason
          <input
            className="block w-full rounded border p-2"
            value={override}
            onChange={(e) => setOverride(e.target.value)}
          />
        </label>
      </details>
      <button
        disabled={busy || ["complete", "cancelled"].includes(task.status)}
        className="touch-target rounded bg-brand px-4 text-white"
      >
        {busy ? "Saving…" : "Save review / work record"}
      </button>
      <p role="status">{message}</p>
      <button
        type="button"
        className="touch-target underline"
        onClick={() => {
          if (
            window.confirm(
              "Discard this local quality/work draft? Submitted device changes remain in the sync list.",
            )
          )
            clearDraft();
        }}
      >
        Discard local draft
      </button>
    </form>
  );
}
