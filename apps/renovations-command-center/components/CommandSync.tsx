"use client";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import {
  readQueuedCommands,
  discardQueuedCommand,
  type QueuedCommand,
} from "@/lib/command-queue";
import { notifyCommands, retryTaskCommand } from "@/lib/task-command-client";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("rcc-commands-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("rcc-commands-change", callback);
  };
}
export function CommandSync() {
  const { user } = useAuth();
  return user ? <AccountCommands key={user.uid} ownerId={user.uid} /> : null;
}
function AccountCommands({ ownerId }: { ownerId: string }) {
  const [message, setMessage] = useState("");
  const getSnapshot = useCallback(() => {
    try {
      return JSON.stringify(readQueuedCommands(localStorage, ownerId));
    } catch {
      return "error";
    }
  }, [ownerId]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => "[]");
  const rows: QueuedCommand[] = raw === "error" ? [] : JSON.parse(raw);
  const sync = useCallback(async () => {
    let changes: QueuedCommand[];
    try {
      changes = readQueuedCommands(localStorage, ownerId);
    } catch {
      return;
    }
    for (const row of changes.filter((row) => row.state === "pending")) {
      try {
        await retryTaskCommand(row);
      } catch {
        /* Persisted errors are shown in the queue. */
      }
    }
  }, [ownerId]);
  useEffect(() => {
    void sync();
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
  }, [sync]);
  if (raw === "error")
    return (
      <p role="alert">
        Stored changes could not be read. Keep browser storage intact.
      </p>
    );
  if (!rows.length) return null;
  return (
    <details className="m-3 rounded border bg-white p-3 print:hidden">
      <summary>
        Device changes: {rows.filter((row) => row.state !== "saved").length}{" "}
        awaiting confirmation
      </summary>
      <p role="status">{message}</p>
      {rows.map((row) => (
        <div key={row.command.commandId} className="my-2 border-b p-2">
          <Link
            className="underline"
            href={`/projects/${row.projectId}/tasks/${row.taskId}`}
          >
            {row.command.kind === "action"
              ? row.command.action.replaceAll("_", " ")
              : row.command.kind}{" "}
            — {row.state}
          </Link>
          <p>
            {row.error ||
              (row.state === "saved"
                ? "Server confirmed. Reload the task to see current details."
                : "Stored on this device; awaiting server confirmation.")}
          </p>
          <details>
            <summary>Review submitted change</summary>
            <pre className="overflow-auto whitespace-pre-wrap text-xs">
              {JSON.stringify(row.command, null, 2)}
            </pre>
          </details>
          {row.state !== "conflicting" && row.state !== "saved" && (
            <button
              className="touch-target mr-3 underline"
              onClick={() => {
                void retryTaskCommand(row).catch((e) => setMessage(e.message));
              }}
            >
              Retry
            </button>
          )}
          <button
            className="touch-target underline"
            onClick={() => {
              if (
                row.state !== "saved" &&
                !window.confirm(
                  "Discard this local change? If a previous request reached the server, it may already be saved. Review the task first.",
                )
              )
                return;
              discardQueuedCommand(localStorage, row);
              notifyCommands();
            }}
          >
            {" "}
            {row.state === "saved"
              ? "Dismiss confirmation"
              : "Discard local change"}
          </button>
        </div>
      ))}
    </details>
  );
}
