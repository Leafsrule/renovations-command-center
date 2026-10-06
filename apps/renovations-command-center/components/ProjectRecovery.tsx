"use client";
import { useState } from "react";
import Link from "next/link";
import {
  exportProjectBackup,
  restoreProjectBackup,
  validateProjectBackup,
} from "@/lib/project-backup";
import { useAuth } from "./AuthProvider";
export function ProjectRecovery({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [file, setFile] = useState<File | null>(null),
    [restoredId, setRestoredId] = useState("");
  async function backup() {
    setBusy(true);
    try {
      const data = await exportProjectBackup(projectId),
        blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        }),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `renovation-backup-${projectId}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        "Backup exported. Keep this file private. Photo objects need a separate storage backup.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }
  async function restore() {
    if (!file || !user) return;
    setBusy(true);
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("Choose a backup smaller than 10 MB.");
      const value = JSON.parse(await file.text());
      const dryRun = validateProjectBackup(value, user.uid);
      setMessage(
        `Validated ${Object.values(dryRun.collections).reduce((n, r) => n + r.length, 0)} records.`,
      );
      const id = await restoreProjectBackup(value);
      setRestoredId(id);
      setMessage(
        "Restored into a separate project; original records remain intact.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="rounded border p-4">
      <summary className="font-semibold">Backup / restore</summary>
      <div className="mt-3 space-y-3">
        <button
          disabled={busy}
          className="touch-target rounded bg-brand px-4 text-white"
          onClick={() => void backup()}
        >
          Export project backup
        </button>
        <p className="text-sm">
          Restore makes a separate copy and preserves record IDs. Restoring
          private photo files requires additional verified storage access.
          Existing projects are never overwritten.
        </p>
        <label className="block">
          App backup JSON
          <input
            type="file"
            accept="application/json"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button
          disabled={busy || !file}
          className="touch-target rounded border px-4"
          onClick={() => void restore()}
        >
          Validate and restore copy
        </button>
        <p role="status">{message}</p>
        {restoredId ? (
          <Link href={`/projects/${restoredId}`} className="underline">
            Open restored project
          </Link>
        ) : null}
      </div>
    </details>
  );
}
