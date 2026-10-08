import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { runTaskCommand } from "../lib/server/task-commands";
import { createProject } from "../lib/server/project-create";
import { getTodayDateString } from "../lib/scheduling";
import { restoreProject } from "../lib/server/project-restore";
import { taskRevision, type TaskCommand } from "../lib/task-command";
const app = initializeApp(
  {
    projectId: "demo-renovations-racp",
    storageBucket: "demo-renovations-racp.appspot.com",
  },
  "server-integration",
);
const db = getFirestore(app),
  bucket = getStorage(app).bucket();
const project = "server-project";
const base = {
  name: "Task",
  status: "ready",
  dependencyTaskIds: [],
  materialStatus: "not_required",
  blockerType: "none",
  photosRequired: false,
  helperRequired: false,
  estimatedDurationMinutes: 60,
  updatedAt: Timestamp.now(),
  notes: "Preserve me",
};
let counter = 0;
async function seed(data: Record<string, unknown> = {}) {
  const id = `task-${++counter}`;
  await db
    .doc(`projects/${project}/tasks/${id}`)
    .set({ ...base, ...data, updatedAt: Timestamp.now() });
  return id;
}
async function action(
  taskId: string,
  name: Extract<TaskCommand, { kind: "action" }>["action"],
  extra: Record<string, unknown> = {},
) {
  const current = await db.doc(`projects/${project}/tasks/${taskId}`).get();
  const c = {
    kind: "action",
    action: name,
    expectedRevision: taskRevision(current.data()?.updatedAt),
    helperAvailable: false,
    commandId: `command-${++counter}`,
    ...extra,
  };
  return runTaskCommand(db, bucket, "owner", project, taskId, c);
}
before(async () => {
  if (
    !process.env.FIRESTORE_EMULATOR_HOST ||
    !process.env.FIREBASE_STORAGE_EMULATOR_HOST
  )
    throw new Error("Demo emulators required; never run on live resources.");
  await db.recursiveDelete(db.doc(`projects/${project}`));
  await db.doc(`projects/${project}`).set({ ownerUserId: "owner" });
  await db
    .doc(`projects/${project}/settings/planning`)
    .set({
      calendar: {
        workdays: [0, 1, 2, 3, 4, 5, 6],
        hoursPerDay: 8,
        bufferPercent: 20,
        blackouts: [],
      },
    });
});
after(async () => {
  await deleteApp(app);
});
test("server rejects another owner before any private write", async () => {
  const id = await seed();
  await assert.rejects(
    runTaskCommand(db, bucket, "other", project, id, {
      kind: "action",
      action: "start",
      expectedRevision: "none",
      helperAvailable: false,
      commandId: "intruder",
    }),
    /unavailable/,
  );
  assert.equal(
    (await db.doc(`projects/${project}/taskHistory/intruder`).get()).exists,
    false,
  );
});
test("server enforces fresh prerequisites, rather than submitted task-universe", async () => {
  const prerequisite = await seed({ status: "cancelled" });
  const id = await seed({ dependencyTaskIds: [prerequisite] });
  await assert.rejects(
    action(id, "start", { tasks: [{ id: prerequisite, status: "complete" }] }),
    /incomplete|cancelled/,
  );
});
test("server serializes concurrent owner starts and preserves unrelated notes", async () => {
  const one = await seed(),
    two = await seed();
  const results = await Promise.allSettled([
    action(one, "start"),
    action(two, "start"),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const active = (
    await db
      .collection(`projects/${project}/tasks`)
      .where("status", "==", "in_progress")
      .get()
  ).docs;
  assert.equal(active.length, 1);
  assert.equal(active[0].data().notes, "Preserve me");
  await action(active[0].id, "mark_waiting");
});
test("stale quality drafts fail; identical replay never adds work twice", async () => {
  const id = await seed();
  const ref = db.doc(`projects/${project}/tasks/${id}`),
    snapshot = await ref.get();
  const command = {
    kind: "quality",
    commandId: "work-once",
    expectedRevision: taskRevision(snapshot.data()?.updatedAt),
    input: {
      items: [{ label: "Level", required: true, passed: true }],
      required: true,
      cureUntil: null,
      overrideReason: "",
      workMinutes: 45,
      workNote: "Installed vanity",
      rework: false,
    },
  };
  await runTaskCommand(db, bucket, "owner", project, id, command);
  await runTaskCommand(db, bucket, "owner", project, id, command);
  assert.equal((await ref.get()).data()?.actualDurationMinutes, 45);
  await assert.rejects(
    runTaskCommand(db, bucket, "owner", project, id, {
      ...command,
      commandId: "stale-work",
    }),
    /CONFLICT/,
  );
  await assert.rejects(
    runTaskCommand(db, bucket, "owner", project, id, {
      ...command,
      input: { ...command.input, workMinutes: 60 },
    }),
    /different change/,
  );
});
test("forged evidence counts cannot complete work, but audited owner exception can", async () => {
  const id = await seed({
    status: "in_progress",
    photosRequired: true,
    evidenceCount: 99,
  });
  await assert.rejects(action(id, "complete"), /evidence/);
  const snapshot = await db.doc(`projects/${project}/tasks/${id}`).get();
  await runTaskCommand(db, bucket, "owner", project, id, {
    kind: "quality",
    commandId: "explicit-exception",
    expectedRevision: taskRevision(snapshot.data()?.updatedAt),
    input: {
      items: [],
      required: false,
      cureUntil: null,
      overrideReason: "Owner reviewed this task and accepts missing photo",
      workMinutes: 0,
      workNote: "",
      rework: false,
    },
  });
  await action(id, "complete");
  assert.equal(
    (await db.doc(`projects/${project}/tasks/${id}`).get()).data()?.status,
    "complete",
  );
});
test("server verifies uploaded bytes, task/owner linkage and removes download tokens", async () => {
  const id = await seed({ status: "in_progress", photosRequired: true });
  const path = `projects/${project}/evidence-staging/real-photo`;
  await bucket
    .file(path)
    .save(Buffer.from([255, 216, 255]), {
      metadata: {
        contentType: "image/jpeg",
        metadata: {
          taskId: id,
          uploadedBy: "owner",
          firebaseStorageDownloadTokens: "must-remove",
        },
      },
    });
  await runTaskCommand(db, bucket, "owner", project, id, {
    kind: "evidence",
    commandId: "link-photo",
    evidenceId: "real-photo",
    caption: "Vanity",
    category: "After",
  });
  assert.ok(
    !(
      await bucket.file(`projects/${project}/evidence/real-photo`).getMetadata()
    )[0].metadata?.firebaseStorageDownloadTokens,
  );
  assert.equal((await bucket.file(path).exists())[0], false);
  await action(id, "complete");
  assert.equal(
    (await db.doc(`projects/${project}/tasks/${id}`).get()).data()?.status,
    "complete",
  );
});
test("missing or incorrectly linked objects are rejected", async () => {
  const id = await seed();
  await assert.rejects(
    runTaskCommand(db, bucket, "owner", project, id, {
      kind: "evidence",
      commandId: "missing-photo",
      evidenceId: "missing-photo",
      caption: "",
      category: "During",
    }),
    /unavailable/,
  );
  const path = `projects/${project}/evidence-staging/wrong-task`;
  await bucket
    .file(path)
    .save(Buffer.from([1]), {
      metadata: {
        contentType: "image/jpeg",
        metadata: { taskId: "other-task", uploadedBy: "owner" },
      },
    });
  await assert.rejects(
    runTaskCommand(db, bucket, "owner", project, id, {
      kind: "evidence",
      commandId: "wrong-link",
      evidenceId: "wrong-task",
      caption: "",
      category: "During",
    }),
    /verification/,
  );
});
test("server recomputes required material readiness and enforces cure times", async () => {
  const id = await seed({ requiredItemsReady: true });
  await db
    .doc(`projects/${project}/materials/needed`)
    .set({ taskId: id, status: "ordered" });
  await assert.rejects(action(id, "start"), /material|tools|items/i);
  const waiting = await seed({
    status: "waiting_curing",
    cureUntil: new Date(Date.now() + 86400000).toISOString(),
  });
  await assert.rejects(action(waiting, "resume"), /curing/);
});
test("server restore preserves history and timestamps in a separate copy without overwriting", async () => {
  const backup = {
    application: "Renovations Command Center",
    schemaVersion: 1,
    projectId: project,
    createdAt: new Date().toISOString(),
    project: { ownerUserId: "owner", name: "Ensuite" },
    collections: {
      tasks: [
        {
          id: "historical",
          data: {
            status: "complete",
            dependencyTaskIds: [],
            updatedAt: {
              type: "firestore/timestamp/1.0",
              seconds: 123,
              nanoseconds: 456000,
            },
          },
        },
      ],
    },
  };
  await db.recursiveDelete(db.doc("projects/restored-server"));
  await restoreProject(db, "owner", "restored-server", backup);
  await restoreProject(db, "owner", "restored-server", backup);
  const record = (
    await db.doc("projects/restored-server/tasks/historical").get()
  ).data()!;
  assert.equal(record.status, "complete");
  assert.equal(record.updatedAt.nanoseconds, 456000);
  await assert.rejects(
    restoreProject(db, "owner", "restored-server", {
      ...backup,
      project: { ...backup.project, name: "Different" },
    }),
    /already exists/,
  );
  assert.equal(
    (await db.doc(`projects/${project}`).get()).data()?.ownerUserId,
    "owner",
  );
});

test("project creation is atomic, retryable and cannot overwrite another request",async()=>{
  const projectId=`created-project-${Date.now()}`;
  const input={name:"Demo ensuite",type:"bathroom_ensuite",scope:"Test",startDate:"2026-10-08",targetFinishDate:"2026-10-20"};
  assert.equal(await createProject(db,"owner",{projectId,input}),projectId);
  const original=(await db.doc(`projects/${projectId}`).get()).data();
  assert.equal((await db.collection(`projects/${projectId}/tasks`).get()).size,6);
  assert.equal(await createProject(db,"owner",{projectId,input}),projectId);
  assert.deepEqual((await db.doc(`projects/${projectId}`).get()).data(),original);
  await assert.rejects(createProject(db,"other",{projectId,input}),/different/);
  await assert.rejects(createProject(db,"owner",{projectId,input:{...input,name:"Changed"}}),/different/);
  await assert.rejects(createProject(db,"owner",{projectId:"bad-date",input:{...input,startDate:"2026-02-30"}}),/dates/);
  assert.equal((await db.doc("projects/bad-date").get()).exists,false);
});
test("server cannot replace persisted helper availability with a browser assertion",async()=>{
  const id=await seed({helperRequired:true,helperPersonIds:["assigned-helper"]});
  const person=db.doc(`projects/${project}/people/assigned-helper`);
  await person.set({active:true});
  await assert.rejects(action(id,"start",{helperAvailable:true}),/availability/);
  await person.set({active:true,availability:{workdays:[0,1,2,3,4,5,6],hoursPerDay:4,blackouts:[getTodayDateString()]}});
  await assert.rejects(action(id,"start",{helperAvailable:true}),/availability/);
  assert.equal((await db.doc(`projects/${project}/tasks/${id}`).get()).data()?.status,"ready");
  const running=await db.collection(`projects/${project}/tasks`).where("status","==","in_progress").get();
  for (const entry of running.docs) await entry.ref.update({status:"complete"});
  await person.set({active:true,availability:{workdays:[0,1,2,3,4,5,6],hoursPerDay:4,blackouts:[]}});
  await action(id,"start",{helperAvailable:true});
  assert.equal((await db.doc(`projects/${project}/tasks/${id}`).get()).data()?.status,"in_progress");
});
