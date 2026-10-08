import {
  FieldValue,
  Timestamp,
  type Firestore,
} from "firebase-admin/firestore";
import { createHash } from "node:crypto";
import { validateProjectBackup } from "../backup-format";
import { CommandError, validId } from "../task-command";
function restoreValues(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(restoreValues);
  if (value && typeof value === "object") {
    const data = value as Record<string, unknown>;
    if (
      data.type === "firestore/timestamp/1.0" &&
      typeof data.seconds === "number" &&
      typeof data.nanoseconds === "number"
    )
      return new Timestamp(data.seconds, data.nanoseconds);
    return Object.fromEntries(
      Object.entries(data).map(([key, v]) => [key, restoreValues(v)]),
    );
  }
  return value;
}
export async function restoreProject(
  db: Firestore,
  owner: string,
  projectId: string,
  value: unknown,
) {
  if (!validId(projectId)) throw new CommandError(400, "Invalid restore ID.");
  let backup;
  try {
    backup = validateProjectBackup(value, owner);
  } catch (e) {
    throw new CommandError(
      400,
      e instanceof Error ? e.message : "Invalid backup.",
    );
  }
  if ((backup.collections.evidence ?? []).length)
    throw new CommandError(
      400,
      "Evidence-backed restore requires private file-copy verification. No changes were made.",
    );
  const digest = createHash("sha256")
    .update(JSON.stringify(backup))
    .digest("hex");
  const ref = db.doc(`projects/${projectId}`);
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists) {
      if (
        existing.data()?.ownerUserId === owner &&
        existing.data()?.restoreDigest === digest
      )
        return;
      throw new CommandError(
        409,
        "Restore destination already exists. No records were overwritten.",
      );
    }
    tx.create(ref, {
      ...(restoreValues(backup.project) as Record<string, unknown>),
      name: `${String(backup.project.name)} (restored copy)`,
      activeProject: false,
      ownerUserId: owner,
      restoredFrom: backup.projectId,
      restoredBy: owner,
      restoredAt: FieldValue.serverTimestamp(),
      restoreDigest: digest,
    });
    for (const [kind, rows] of Object.entries(backup.collections))
      for (const row of rows)
        tx.create(
          ref.collection(kind).doc(row.id),
          restoreValues(row.data) as Record<string, unknown>,
        );
  });
  return projectId;
}
