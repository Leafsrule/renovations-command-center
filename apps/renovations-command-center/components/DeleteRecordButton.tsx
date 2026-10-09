"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { useAuth } from "./AuthProvider";
import type { DeletableKind, DeletionEligibility } from "@/lib/deletion-policy";
const checks = new Map<string, Promise<Record<string, DeletionEligibility>>>();
export function DeleteRecordButton({
  projectId,
  kind,
  id,
  name,
}: {
  projectId: string;
  kind: DeletableKind;
  id: string;
  name: string;
}) {
  const { user } = useAuth();
  const identity = `${user?.uid}:${projectId}:${kind}:${id}`;
  const [result, setResult] = useState<{
    identity: string;
    check: DeletionEligibility;
  } | null>(null);
  const check =
    result?.identity === identity
      ? result.check
      : { allowed: false, reason: "Checking linked entries…" };
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    if (!user) return;
    const key = `${user.uid}:${projectId}`;
    if (!checks.has(key))
      checks.set(
        key,
        (async () => {
          const token = await user.getIdToken();
          if (auth?.currentUser?.uid !== user.uid)
            throw Error("Account changed. Refresh before deleting.");
          const r = await fetch(`/api/projects/${projectId}/deletion`, {
            cache: "no-store",
            headers: { Authorization: `Bearer ${token}` },
          });
          const body = await r.json();
          if (!r.ok) throw Error(body.error);
          return body;
        })(),
      );
    void checks
      .get(key)!
      .then((result) => {
        if (!cancelled)
          setResult({
            identity,
            check: result[`${kind}:${id}`] ?? {
              allowed: false,
              reason: "Record is unavailable.",
            },
          });
      })
      .catch(() => {
        checks.delete(key);
        if (!cancelled)
          setResult({
            identity,
            check: {
              allowed: false,
              reason: "Deletion could not be verified. Refresh to retry.",
            },
          });
      });
    return () => {
      cancelled = true;
    };
  }, [user, projectId, kind, id, identity]);
  async function remove() {
    if (
      !user ||
      !check.allowed ||
      !window.confirm(`Delete “${name}”? Its audit record will be retained.`)
    )
      return;
    setBusy(true);
    setError("");
    try {
      const token = await user.getIdToken();
      if (auth?.currentUser?.uid !== user.uid)
        throw Error("Account changed. Refresh before deleting.");
      const r = await fetch(`/api/projects/${projectId}/deletion`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ kind, id, revision: check.revision }),
      });
      const body = await r.json();
      if (!r.ok) {
        setResult({identity,check:{allowed:false,reason:body.error}});
        throw Error(body.error);
      }
      checks.delete(`${user.uid}:${projectId}`);
      window.location.assign(
        kind === "project" ? "/projects" : window.location.pathname,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
      setBusy(false);
    }
  }
  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={busy || !check.allowed}
        title={check.reason}
        onClick={() => void remove()}
        className="touch-target rounded-md border border-danger px-4 text-sm font-semibold text-danger disabled:cursor-not-allowed disabled:border-line disabled:bg-panel disabled:text-muted disabled:opacity-60"
      >
        {busy ? "Deleting…" : "Delete"}
      </button>
      {!check.allowed ? (
        <p className="mt-1 text-xs text-muted">{check.reason}</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
