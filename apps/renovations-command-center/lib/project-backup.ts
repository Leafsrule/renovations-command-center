import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { auth, db } from "./firebase";
import {
  collections,
  validateProjectBackup,
  type ProjectBackup,
} from "./backup-format";
export * from "./backup-format";
export async function exportPortableProjectBackup(projectId: string): Promise<ProjectBackup> {
  const user = auth?.currentUser;
  if (!user) throw new Error("Sign in before exporting.");
  const token = await user.getIdToken();
  if (auth?.currentUser?.uid !== user.uid) throw new Error("Account changed before exporting.");
  const response = await fetch("/api/projects/backup", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ projectId }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Backup was not confirmed.");
  if (auth?.currentUser?.uid !== user.uid) throw new Error("Account changed. Backup was not downloaded.");
  return validateProjectBackup(result, user.uid);
}
export async function exportProjectBackup(
  projectId: string,
): Promise<ProjectBackup> {
  if (!db || !auth?.currentUser) throw new Error("Sign in before exporting.");
  const project = await getDoc(doc(db, "projects", projectId));
  if (!project.exists() || project.data().ownerUserId !== auth.currentUser.uid)
    throw new Error("Project is unavailable.");
  const rows = await Promise.all(
    collections.map(async (kind) => {
      const snapshot = await getDocs(
        collection(db!, "projects", projectId, kind),
      );
      return [
        kind,
        snapshot.docs.map((d) => ({ id: d.id, data: d.data() })),
      ] as const;
    }),
  );
  return {
    application: "Renovations Command Center",
    schemaVersion: 1,
    projectId,
    createdAt: new Date().toISOString(),
    project: project.data(),
    collections: Object.fromEntries(rows),
  };
}
/** Restores are authenticated server operations into a separate project. */
export async function restoreProjectBackup(value: unknown) {
  const user = auth?.currentUser;
  if (!user) throw new Error("Sign in before restoring.");
  const backup = validateProjectBackup(value, user.uid);
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(backup)),
  );
  const digest = Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const recoveryKey = `rcc:restore:${user.uid}:${digest}`;
  const projectId = localStorage.getItem(recoveryKey) || crypto.randomUUID();
  localStorage.setItem(recoveryKey, projectId);
  const token = await user.getIdToken();
  if (auth?.currentUser?.uid !== user.uid)
    throw new Error("Account changed before restoring.");
  const response = await fetch("/api/projects/restore", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ backup, projectId }),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Restore was not confirmed.");
  if (result.projectId !== projectId || auth?.currentUser?.uid !== user.uid)
    throw new Error("Restore acknowledgment did not match this account and destination. Keep the backup.");
  const ref = { id: projectId };
  const restored = await exportProjectBackup(ref.id);
  for (const [kind, rows] of Object.entries(backup.collections))
    if ((restored.collections[kind]?.length ?? 0) !== rows.length)
      throw new Error(
        `Restored copy ${ref.id} needs review: ${kind} count mismatch. Original project remains intact.`,
      );
  function canonical(value: unknown): string {
    const plain = JSON.parse(JSON.stringify(value));
    function sort(value: unknown): unknown {
      if (Array.isArray(value)) return value.map(sort);
      if (value && typeof value === "object")
        return Object.fromEntries(
          Object.entries(value)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => [k, sort(v)]),
        );
      return value;
    }
    return JSON.stringify(sort(plain));
  }
  for (const [kind, rows] of Object.entries(backup.collections)) {
    const actual = new Map(
      restored.collections[kind].map((row) => [row.id, row.data]),
    );
    for (const row of rows) {
      const value = actual.get(row.id);
      const expected = row.data;
      // Restored private objects have destination-specific paths and generations.
      const comparable = (data: Record<string, unknown> | undefined) => {
        if (kind !== "evidence" || backup.schemaVersion !== 2 || !data) return data;
        const { path, generation, size, contentType, ...rest } = data;
        void path; void generation; void size; void contentType;
        return rest;
      };
      if (canonical(comparable(value)) !== canonical(comparable(expected)))
        throw new Error(
          `Restored copy ${ref.id} needs review: ${kind}/${row.id} semantic parity failed. Original remains intact.`,
        );
      if (kind === "evidence" && backup.schemaVersion === 2) {
        const photo = backup.photoObjects!.find(photo => photo.id === row.id)!;
        if (value?.path !== `projects/${projectId}/evidence/${row.id}` || !value.generation)
          throw new Error("Restored photo linkage failed. Keep the backup.");
        const { evidenceBlob } = await import("./evidence");
        const blob = await evidenceBlob(String(value.path));
        const bytes = await blob.arrayBuffer();
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map(byte => byte.toString(16).padStart(2, "0")).join("");
        if (bytes.byteLength !== photo.size || hash !== photo.sha256)
          throw new Error("Restored photo readback failed. Keep the backup and retry the same destination.");
      }
    }
  }
  localStorage.removeItem(recoveryKey);
  return ref.id;
}
