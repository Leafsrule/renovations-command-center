import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, writeBatch } from "firebase/firestore";
let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-renovations-racp",
    firestore: { rules: await readFile("firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "projects", "owned"), {
      ownerUserId: "owner",
      name: "Test project",
    });
    await setDoc(doc(db, "projects", "owned", "tasks", "photo-required"), {
      status: "in_progress",
      photosRequired: true,
      evidenceCount: 0,
      qcRequired: false,
    });
  });
});
after(async () => {
  if (env) await env.cleanup();
});
test("cross-owner and anonymous reads/writes are rejected", async () => {
  for (const context of [
    env.authenticatedContext("other"),
    env.unauthenticatedContext(),
  ]) {
    const db = context.firestore();
    await assertFails(getDoc(doc(db, "projects", "owned")));
    await assertFails(
      setDoc(doc(db, "projects", "owned", "rooms", "intruder"), { name: "No" }),
    );
  }
});
test("project ownership is immutable", async () => {
  const db = env.authenticatedContext("owner").firestore();
  await assertFails(
    updateDoc(doc(db, "projects", "owned"), { ownerUserId: "other" }),
  );
});
test("required evidence denies task completion", async () => {
  const db = env.authenticatedContext("owner").firestore();
  await assertFails(
    updateDoc(doc(db, "projects", "owned", "tasks", "photo-required"), {
      status: "complete",
    }),
  );
});
test("owner can create an ordinary draft task", async () => {
  const db = env.authenticatedContext("owner").firestore();
  await assertSucceeds(
    setDoc(doc(db, "projects", "owned", "tasks", "draft"), { status: "draft" }),
  );
});
test("direct creation of completed work without restore is rejected", async () => {
  const db = env.authenticatedContext("owner").firestore();
  await assertFails(
    setDoc(doc(db, "projects", "owned", "tasks", "pretend-complete"), {
      status: "complete",
    }),
  );
});
test("atomic owner-scoped restored project and historical task are supported", async () => {
  const db = env.authenticatedContext("owner").firestore();
  const batch = writeBatch(db);
  batch.set(doc(db, "projects", "restore-test"), {
    ownerUserId: "owner",
    restoredFrom: "owned",
  });
  batch.set(doc(db, "projects", "restore-test", "tasks", "historical"), {
    status: "complete",
  });
  await assertSucceeds(batch.commit());
});
