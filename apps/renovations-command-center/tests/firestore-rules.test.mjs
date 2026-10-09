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
test("browser-created restored projects cannot bypass guarded historical task creation", async () => {
  const db = env.authenticatedContext("owner").firestore();
  const batch = writeBatch(db);
  batch.set(doc(db, "projects", "restore-test"), {
    ownerUserId: "owner",
    restoredFrom: "owned",
  });
  batch.set(doc(db, "projects", "restore-test", "tasks", "historical"), {
    status: "complete",
  });
  await assertFails(batch.commit());
});

test("direct SDK cannot forge evidence, QC, work or execution proof", async () => {
 const db=env.authenticatedContext("owner").firestore();
 const task=doc(db,"projects","owned","tasks","photo-required");
 for(const fields of [{evidenceCount:99},{qcPassed:true},{qcChecklist:[{label:"Fake",required:true,passed:true}]},{actualDurationMinutes:100},{completionOverrideReason:"Fake",overrideAuditId:"pretend"},{status:"ready"},{photosRequired:false}]) await assertFails(updateDoc(task,fields));
 await assertFails(setDoc(doc(db,"projects","owned","evidence","fake"),{taskId:"photo-required"}));
 await assertFails(setDoc(doc(db,"projects","owned","taskHistory","pretend"),{action:"owner_exception",actor:"owner"}));
 await assertFails(setDoc(doc(db,"projects","owned","commandReceipts","pretend"),{result:{allowed:true}}));
});
test("ordinary owner metadata edits remain possible", async () => {
 const db=env.authenticatedContext("owner").firestore();
 await assertSucceeds(updateDoc(doc(db,"projects","owned","tasks","draft"),{name:"Edited",status:"ready"}));
});

test("browser identities cannot read or forge private photo manifests or free-capacity reservations", async () => {
  for (const context of [env.authenticatedContext("owner"),env.authenticatedContext("other"),env.unauthenticatedContext()]) {
    const db=context.firestore();
    for (const path of ["photoStorage/capacity","photoStorageObjects/forged"]) {
      await assertFails(getDoc(doc(db,path)));
      await assertFails(setDoc(doc(db,path),{reservedBytes:0,sha256:"forged",state:"ready"}));
    }
  }
});

test("Design remains an owner-only planning state and cannot bypass execution proof", async () => {
  const owner = env.authenticatedContext("owner").firestore();
  const ref = doc(owner,"projects","owned","tasks","design");
  await assertSucceeds(setDoc(ref,{status:"design",phase:"design",readinessState:"design",materialStatus:"stock"}));
  await assertSucceeds(updateDoc(ref,{status:"ready",materialStatus:"received"}));
  await assertSucceeds(updateDoc(ref,{status:"design"}));
  await assertFails(updateDoc(ref,{status:"complete"}));
  await assertFails(updateDoc(ref,{qcPassed:true}));
  await assertFails(setDoc(doc(env.authenticatedContext("other").firestore(),"projects","owned","tasks","other-design"),{status:"design"}));
  await assertFails(updateDoc(doc(owner,"projects","owned","tasks","photo-required"),{status:"design",photosRequired:false}));
});
