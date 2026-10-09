"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { listProjectTasks, type RenovationTask } from "@/lib/tasks";
import {
  emptyFieldRecord,
  listFieldRecords,
  pendingKey,
  readPending,
  saveFieldRecord,
  storePending,
  validateFieldRecord,
  clearConfirmedPending,
  type FieldRecord,
  type FieldKind,
  type PendingFieldChange,
} from "@/lib/field-records";
const options: Record<FieldKind, string[]> = {
  materials: [
    "needed",
    "ordered",
    "purchased",
    "delivered",
    "on_site",
    "used",
    "missing",
  ],
  tools: ["unknown", "available", "unavailable", "needs_repair"],
  measurements: ["not_measured", "to_verify", "verified", "recheck"],
  decisions: ["proposed", "approved", "rejected", "superseded"],
};
export function FieldRecordsWorkspace({ kind }: { kind: FieldKind }) {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  if (!user) return <p>Sign in to load records.</p>;
  return (
    <FieldRecordsContent
      key={`${user.uid}:${projectId}:${kind}`}
      ownerId={user.uid}
      projectId={projectId}
      kind={kind}
    />
  );
}
function FieldRecordsContent({
  ownerId,
  projectId,
  kind,
}: {
  ownerId: string;
  projectId: string;
  kind: FieldKind;
}) {
  const [records, setRecords] = useState<FieldRecord[]>([]),
    [tasks, setTasks] = useState<RenovationTask[]>([]),
    [form, setForm] = useState<FieldRecord | null>(null),
    [pending, setPending] = useState<PendingFieldChange | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const sync = useCallback(
    async (change: PendingFieldChange) => {
      setBusy(true);
      setMessage("Saving…");
      try {
        await saveFieldRecord(
          projectId,
          kind,
          change.record,
          ownerId,
          change.changeId,
        );
        if (!clearConfirmedPending(change)) {
          setMessage("Server confirmed the submitted change. A newer device draft was preserved; reload to review it.");
          return;
        }
        setPending(null);
        setForm(null);
        setMessage("Saved.");
        try {
          setRecords(await listFieldRecords(projectId, kind));
        } catch {
          setMessage(
            "Saved. List refresh failed; reload to see the saved record.",
          );
        }
      } catch (e) {
        const error = e instanceof Error ? e.message : "Save failed";
        const failed = {
          ...change,
          state: error.startsWith("CONFLICT:")
            ? ("conflicting" as const)
            : ("failed" as const),
          error,
        };
        try {
          storePending(failed);
          setPending(failed);
        } catch {
          setMessage(
            "Browser storage is unavailable. Keep this page open to recover your changes.",
          );
          return;
        }
        setMessage(error);
      } finally {
        setBusy(false);
      }
    },
    [projectId, kind, ownerId],
  );
  useEffect(() => {
    let live = true;
    Promise.all([
      listFieldRecords(projectId, kind),
      listProjectTasks(projectId),
    ])
      .then(([r, t]) => {
        if (live) {
          setRecords(r);
          setTasks(t);
        }
      })
      .catch((e) => {
        if (live) setMessage(e.message);
      });
    try {
      const draft = readPending(ownerId, projectId, kind);
      if (draft)
        Promise.resolve().then(() => {
          if (live) {
            setForm(draft.record);
            setPending(draft);
            setMessage(`Recovered ${draft.state} change.`);
          }
        });
    } catch (e) {
      Promise.resolve().then(() => {
        if (live)
          setMessage(e instanceof Error ? e.message : "Draft recovery failed");
      });
    }
    return () => {
      live = false;
    };
  }, [projectId, kind, ownerId]);
  useEffect(() => {
    const reconnect = () => {
      try {
        const change = readPending(ownerId, projectId, kind);
        if (change?.state === "pending") void sync(change);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Draft recovery failed");
      }
    };
    window.addEventListener("online", reconnect);
    const startup = window.setTimeout(() => {
      if (navigator.onLine) reconnect();
    }, 0);
    return () => {
      window.clearTimeout(startup);
      window.removeEventListener("online", reconnect);
    };
  }, [kind, ownerId, projectId, sync]);
  function edit(next: FieldRecord, replaceReviewedConflict = false) {
    const draft: PendingFieldChange = {
      changeId: crypto.randomUUID(),
      kind,
      projectId,
      ownerId,
      record: next,
      state: "draft",
      error: "",
    };
    try {
      storePending(draft, replaceReviewedConflict);
      setForm(next);
      setPending(draft);
      setMessage("Draft saved on this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save a durable draft. Check browser storage.");
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    try {
      validateFieldRecord(kind, form);
      const change: PendingFieldChange = {
        changeId: pending?.changeId ?? crypto.randomUUID(),
        kind,
        ownerId,
        projectId,
        record: form,
        state: "pending",
        error: "",
      };
      storePending(change);
      setPending(change);
      if (navigator.onLine) await sync(change);
      else setMessage("Pending sync. This change is saved on this device.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    }
  }
  const update = (field: keyof FieldRecord, value: string | number) => {
    if (form) edit({ ...form, [field]: value });
  };
  const shopping =
    kind === "materials"
      ? records.filter((r) => !["on_site", "used"].includes(r.status))
      : [];
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button
          className="touch-target rounded bg-brand px-4 text-white"
          disabled={busy || Boolean(pending)}
          onClick={() =>
            edit({ ...emptyFieldRecord(), status: options[kind][0] })
          }
        >
          Add {kind.slice(0, -1)}
        </button>
        <button
          className="touch-target rounded border px-4"
          onClick={() => window.print()}
        >
          Print list
        </button>
      </div>
      <p role="status">{message}</p>
      {pending ? (
        <p className="text-sm">
          State: {pending.state}.{" "}
          {pending.state === "conflicting"
            ? "Keep your draft and compare it with the current record below before saving."
            : ""}
        </p>
      ) : null}
      {form ? (
        <form
          onSubmit={submit}
          className="space-y-3 rounded border bg-white p-4"
        >
          <label className="block">
            Name
            <input
              required
              className="block w-full rounded border p-2"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </label>
          <label className="block">
            Task
            <select
              required
              className="block w-full rounded border p-2"
              value={form.taskId}
              onChange={(e) => update("taskId", e.target.value)}
            >
              <option value="">Choose task</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Status
            <select
              className="block w-full rounded border p-2"
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
            >
              {options[kind].map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          {kind === "materials" ? (
            <>
              <label className="block">
                Quantity
                <input
                  className="block w-full rounded border p-2"
                  type="number"
                  min="0.001"
                  step="any"
                  value={form.quantity}
                  onChange={(e) => update("quantity", Number(e.target.value))}
                />
              </label>
              <label className="block">
                Unit
                <input
                  className="block w-full rounded border p-2"
                  value={form.unit}
                  onChange={(e) => update("unit", e.target.value)}
                />
              </label>
              <label className="block">
                Supplier
                <input
                  className="block w-full rounded border p-2"
                  value={form.supplier}
                  onChange={(e) => update("supplier", e.target.value)}
                />
              </label>
              <label className="block">
                Needed by
                <input
                  className="block w-full rounded border p-2"
                  type="date"
                  value={form.neededDate}
                  onChange={(e) => update("neededDate", e.target.value)}
                />
              </label>
            </>
          ) : null}
          {kind === "measurements" ? (
            <>
              {(["feet", "inches", "tolerance"] as const).map((field) => (
                <label className="block" key={field}>
                  {field}
                  {field === "tolerance" ? " (inches)" : ""}
                  <input
                    className="block w-full rounded border p-2"
                    type="number"
                    min="0"
                    step={field === "feet" ? 1 : "any"}
                    value={form[field]}
                    onChange={(e) => update(field, Number(e.target.value))}
                  />
                </label>
              ))}
              <p>
                Total: {form.feet * 12 + form.inches} inches. Status remains
                unverified until explicitly verified.
              </p>
            </>
          ) : null}
          {["measurements", "decisions"].includes(kind) ? (
            <label className="block">
              Verification / approval reason
              <input
                className="block w-full rounded border p-2"
                value={form.approvalReason}
                onChange={(e) => update("approvalReason", e.target.value)}
              />
            </label>
          ) : null}
          <label className="block">
            Notes
            <textarea
              className="block w-full rounded border p-2"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </label>
          <button
            disabled={busy}
            className="touch-target rounded bg-brand px-4 text-white"
          >
            {busy ? "Saving…" : "Save / queue change"}
          </button>
          <button
            type="button"
            disabled={busy}
            className="touch-target ml-3 rounded border px-4"
            onClick={() => {
              if (pending?.state !== "draft" && !window.confirm("Discard this unconfirmed local change? It may already be saved on the server. Review current records before submitting a replacement.")) return;
              localStorage.removeItem(pendingKey(ownerId, projectId, kind));
              setForm(null);
              setPending(null);
              setMessage("Local draft discarded.");
            }}
          >
            Discard local draft
          </button>
          {pending?.state === "conflicting" ? (
            <button
              type="button"
              className="touch-target block underline"
              onClick={async () => {
                const fresh = await listFieldRecords(projectId, kind);
                setRecords(fresh);
                setMessage(
                  "Current records reloaded. Review differences before adopting the current version.",
                );
              }}
            >
              Reload current records
            </button>
          ) : null}
        </form>
      ) : null}
      {shopping.length ? (
        <section>
          <h2 className="font-semibold">Shopping list</h2>
          <ul className="list-disc pl-5">
            {Object.values(
              shopping.reduce<
                Record<string, { name: string; quantity: number; unit: string }>
              >((groups, r) => {
                const key = `${r.name.trim().toLowerCase()}:${r.unit}`;
                groups[key] ??= { name: r.name, quantity: 0, unit: r.unit };
                groups[key].quantity += r.quantity;
                return groups;
              }, {}),
            ).map((r) => (
              <li key={`${r.name}:${r.unit}`}>
                {r.name}: {r.quantity} {r.unit}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <ul className="space-y-3">
        {records.map((r) => (
          <li key={r.id} className="rounded border p-4">
            <h2 className="font-semibold">{r.name}</h2>
            <p>
              {r.status.replaceAll("_", " ")}
              {kind === "materials"
                ? ` · ${r.quantity} ${r.unit}`
                : kind === "measurements"
                  ? ` · ${r.feet * 12 + r.inches} in ± ${r.tolerance} in`
                  : ""}
            </p>
            <p>{r.notes}</p>
            <Link
              className="underline"
              href={`/projects/${projectId}/tasks/${r.taskId}`}
            >
              Linked task
            </Link>
            <button
              disabled={busy || Boolean(pending)}
              className="touch-target ml-3 underline"
              onClick={() => edit(r)}
            >
              Edit
            </button>
            {pending?.state === "conflicting" && r.id === form?.id ? (
              <button
                className="touch-target block underline"
                onClick={() => {
                  if (
                    window.confirm(
                      "Have you compared your draft with the current record? Apply your reviewed draft to the current version?",
                    )
                  )
                    edit({ ...form!, version: r.version }, true);
                }}
              >
                Use current version after review
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {!records.length ? <p>No records saved yet.</p> : null}
    </section>
  );
}
