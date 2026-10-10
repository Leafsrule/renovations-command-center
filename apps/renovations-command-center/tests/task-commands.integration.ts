import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { runTaskCommand } from "../lib/server/task-commands";
import { createProject } from "../lib/server/project-create";
import { getTodayDateString } from "../lib/scheduling";
import { restoreProject } from "../lib/server/project-restore";
import { exportProjectArchive } from "../lib/server/project-archive";
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
  await assert.rejects(action(id, "complete"), /media/);
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

test("portable photo backup survives source deletion and restores private bytes with safe retries", async () => {
  const source = `archive-source-${Date.now()}`, destination = `archive-copy-${Date.now()}`;
  await db.doc(`projects/${source}`).set({ ownerUserId: "owner", name: "Photo recovery demo" });
  await db.doc(`projects/${source}/tasks/tile`).set({ ...base, status: "complete", photosRequired: true, evidenceCount: 1 });
  const bytes = Buffer.from([255, 216, 255, 1, 2, 3]);
  const sourceFile = bucket.file(`projects/${source}/evidence/photo`);
  await sourceFile.save(bytes, { metadata: { contentType: "image/jpeg", metadata: { uploadedBy: "owner", taskId: "tile" } } });
  const [metadata] = await sourceFile.getMetadata();
  await db.doc(`projects/${source}/evidence/photo`).set({ taskId: "tile", caption: "After", category: "After", uploadedBy: "owner",
    path: sourceFile.name, generation: String(metadata.generation), size: bytes.length, contentType: "image/jpeg" });
  await assert.rejects(exportProjectArchive(db, bucket, "other", source), /unavailable/);
  const backup = await exportProjectArchive(db, bucket, "owner", source);
  assert.equal(backup.schemaVersion, 2);
  assert.equal(backup.photoObjects?.length, 1);
  const corrupt = structuredClone(backup);
  corrupt.photoObjects![0].sha256 = "0".repeat(64);
  await assert.rejects(restoreProject(db, "owner", "invalid-archive", corrupt, bucket), /checksum/);
  assert.equal((await db.doc("projectRestores/invalid-archive").get()).exists, false);
  assert.equal((await db.doc("projects/invalid-archive").get()).exists, false);
  // Only isolated disposable emulator data is removed here.
  await sourceFile.delete();
  await db.recursiveDelete(db.doc(`projects/${source}`));
  const results = await Promise.allSettled([
    restoreProject(db, "owner", destination, backup, bucket),
    restoreProject(db, "owner", destination, backup, bucket),
  ]);
  assert.equal(results.filter(row => row.status === "fulfilled").length, 2);
  const copy = bucket.file(`projects/${destination}/evidence/photo`);
  assert.deepEqual((await copy.download())[0], bytes);
  const [privateMetadata] = await copy.getMetadata();
  assert.ok(!privateMetadata.metadata?.firebaseStorageDownloadTokens);
  const record = (await db.doc(`projects/${destination}/evidence/photo`).get()).data()!;
  assert.equal(record.path, copy.name);
  assert.equal(record.generation, String(privateMetadata.generation));
  assert.equal((await db.doc(`projects/${destination}/tasks/tile`).get()).data()?.status, "complete");
  const secondBackup = await exportProjectArchive(db, bucket, "owner", destination);
  assert.equal(secondBackup.photoObjects![0].sha256, backup.photoObjects![0].sha256);
  await assert.rejects(restoreProject(db, "other", destination, backup, bucket), /account/);
  await assert.rejects(restoreProject(db, "owner", destination, { ...backup, project: { ...backup.project, name: "Changed" } }, bucket), /already exists/);
});

test("portable restore resumes after interrupted file save without publishing partial records", async () => {
  const source = `interrupted-source-${Date.now()}`, destination = `interrupted-copy-${Date.now()}`;
  await db.doc(`projects/${source}`).set({ ownerUserId: "owner", name: "Interrupted" });
  await db.doc(`projects/${source}/tasks/tile`).set({ ...base });
  for (const id of ["one", "two"]) {
    const path = `projects/${source}/evidence/${id}`;
    await bucket.file(path).save(Buffer.from([255, 216, 255]), { metadata: { contentType: "image/jpeg", metadata: { uploadedBy: "owner", taskId: "tile" } } });
    const [metadata] = await bucket.file(path).getMetadata();
    await db.doc(`projects/${source}/evidence/${id}`).set({ taskId: "tile", uploadedBy: "owner", path, generation: String(metadata.generation) });
  }
  const backup = await exportProjectArchive(db, bucket, "owner", source);
  const interruptedBucket = { file: (path: string, options?: object) => {
    if (path === `projects/${destination}/evidence/two`) throw new Error("Interrupted transfer");
    return bucket.file(path, options);
  } } as typeof bucket;
  await assert.rejects(restoreProject(db, "owner", destination, backup, interruptedBucket), /Interrupted/);
  assert.equal((await db.doc(`projects/${destination}`).get()).exists, false);
  assert.equal((await bucket.file(`projects/${destination}/evidence/one`).exists())[0], true);
  await assert.rejects(restoreProject(db, "owner", destination, { ...backup, project: { ...backup.project, name: "Different" } }, bucket), /reserved/);
  assert.equal(await restoreProject(db, "owner", destination, backup, bucket), destination);
  assert.equal((await db.collection(`projects/${destination}/evidence`).get()).size, 2);
});

test("portable export refuses a missing linked photo rather than making an incomplete backup", async () => {
  const id = `missing-archive-${Date.now()}`;
  await db.doc(`projects/${id}`).set({ ownerUserId: "owner", name: "Missing photo" });
  await db.doc(`projects/${id}/tasks/tile`).set({ ...base });
  await db.doc(`projects/${id}/evidence/missing`).set({ taskId: "tile", path: `projects/${id}/evidence/missing`, generation: "1" });
  await assert.rejects(exportProjectArchive(db, bucket, "owner", id));
});

test("free-photo adapter preserves trusted evidence, byte-verified archives and concurrent separate-copy restore", async () => {
  const { supabasePhotoStore } = await import("../lib/server/supabase-photo-store");
  const { fakePrivateStorage } = await import("./supabase-fixture");
  const { client, objects } = fakePrivateStorage();
  const store = supabasePhotoStore(db,client,"private-demo");
  await db.doc("photoStorage/capacity").set({reservedBytes:0});
  const source=`free-source-${Date.now()}`,destination=`free-copy-${Date.now()}`;
  await db.doc(`projects/${source}`).set({ownerUserId:"owner",name:"Free private photos"});
  await db.doc(`projects/${source}/tasks/tile`).set({...base,status:"in_progress",photosRequired:true,helperPersonIds:[]});
  const staging=`projects/${source}/evidence-staging/photo`;
  const bytes=Buffer.from([255,216,255]);
  await Promise.all([store.create(staging,bytes,"image/jpeg",{uploadedBy:"owner",taskId:"tile"}),store.create(staging,bytes,"image/jpeg",{uploadedBy:"owner",taskId:"tile"})]);
  assert.equal((await db.doc("photoStorage/capacity").get()).data()?.reservedBytes,bytes.length);
  await assert.rejects(runTaskCommand(db,store,"other",source,"tile",{kind:"evidence",evidenceId:"photo",caption:"Proof",category:"After",commandId:"free-link"}),/unavailable/);
  const command={kind:"evidence",evidenceId:"photo",caption:"Proof",category:"After",commandId:"free-link"};
  await runTaskCommand(db,store,"owner",source,"tile",command);
  await runTaskCommand(db,store,"owner",source,"tile",command);
  assert.equal(objects.has(staging),false);
  assert.equal((await db.doc("photoStorage/capacity").get()).data()?.reservedBytes,bytes.length);
  const backup=await exportProjectArchive(db,store,"owner",source);
  assert.match(backup.collections.evidence[0].data.generation as string,/^supabase:/);
  await Promise.all([restoreProject(db,"owner",destination,backup,store),restoreProject(db,"owner",destination,backup,store)]);
  assert.equal((await db.collection(`projects/${destination}/evidence`).get()).size,1);
  const info=await store.info(`projects/${destination}/evidence/photo`);
  assert.deepEqual(await store.read(`projects/${destination}/evidence/photo`,info.version),bytes);
  assert.equal((await db.doc("photoStorage/capacity").get()).data()?.reservedBytes,bytes.length*2);
  objects.get(`projects/${source}/evidence/photo`)!.bytes=Buffer.from([1,2,3]);
  await assert.rejects(exportProjectArchive(db,store,"owner",source),/checksum/);
  const current=await db.doc(`projects/${source}/tasks/tile`).get();
  await assert.rejects(runTaskCommand(db,store,"owner",source,"tile",{kind:"action",action:"complete",expectedRevision:taskRevision(current.data()?.updatedAt),helperAvailable:false,commandId:"free-complete"}),/photo|media/i);
});

test("concurrent free-capacity reservations cannot exceed the app's storage ceiling", async () => {
  const { supabasePhotoStore,FREE_PHOTO_CAPACITY }=await import("../lib/server/supabase-photo-store");
  const { fakePrivateStorage }=await import("./supabase-fixture");
  const {client,objects}=fakePrivateStorage();const store=supabasePhotoStore(db,client,"private-demo");
  const bytes=Buffer.from("image");await db.doc("photoStorage/capacity").set({reservedBytes:FREE_PHOTO_CAPACITY-bytes.length});
  const unique=`capacity-${Date.now()}`;
  const results=await Promise.allSettled(["one","two"].map(id=>store.create(`projects/${unique}/evidence-staging/${id}`,bytes,"image/png",{uploadedBy:"owner",taskId:"tile"})));
  assert.equal(results.filter(r=>r.status==="fulfilled").length,1);
  assert.equal(objects.size,1);
  assert.equal((await db.doc("photoStorage/capacity").get()).data()?.reservedBytes,FREE_PHOTO_CAPACITY);
  assert.equal((results.find(r=>r.status==="rejected") as PromiseRejectedResult).reason.status,507);
});

async function deletionProject() {
 const id=`delete-${++counter}`;
 await db.doc(`projects/${id}`).set({ownerUserId:"owner",name:"Deletion test",activeProject:true});
 return id;
}
test("guarded deletion preserves source and audit, denies wrong owner and stale revisions",async()=>{
 const {deletionOptions,deleteOpenRecord}=await import("../lib/server/record-deletion");
 const id=await deletionProject(), room=db.doc(`projects/${id}/rooms/unused`);
 await room.set({name:"Kitchen"});
 await assert.rejects(deletionOptions(db,id,"other"),/unavailable/);
 let options=await deletionOptions(db,id,"owner");
 await room.update({name:"Edited"});
 await assert.rejects(deleteOpenRecord(db,id,"owner","rooms","unused",options["rooms:unused"].revision!),/changed/);
 options=await deletionOptions(db,id,"owner");
 await deleteOpenRecord(db,id,"owner","rooms","unused",options["rooms:unused"].revision!);
 assert.equal((await room.get()).data()?.name,"Edited");assert.ok((await room.get()).data()?.deletedAt);
 const audit=await db.collection(`projects/${id}/deletionHistory`).get();
 assert.equal(audit.size,1);assert.equal(audit.docs[0].data().before.name,"Edited");
 await deleteOpenRecord(db,id,"owner","rooms","unused",options["rooms:unused"].revision!);
 assert.equal((await db.collection(`projects/${id}/deletionHistory`).get()).size,1);
 const backup=await exportProjectArchive(db,bucket,"owner",id);
 assert.equal(backup.collections.deletionHistory.length,1);
 const destination=await deletionProject();await db.doc(`projects/${destination}`).delete();
 await restoreProject(db,"owner",destination,backup,bucket);
 assert.ok((await db.doc(`projects/${destination}/rooms/unused`).get()).data()?.deletedAt);
 assert.equal((await db.collection(`projects/${destination}/deletionHistory`).get()).size,1);
});
test("deletion rechecks new links and closed history after eligibility was displayed",async()=>{
 const {deletionOptions,deleteOpenRecord}=await import("../lib/server/record-deletion");
 const id=await deletionProject();
 await db.doc(`projects/${id}/rooms/room`).set({name:"Room"});
 await db.doc(`projects/${id}/people/person`).set({name:"Champion"});
 const initial=await deletionOptions(db,id,"owner");
 await db.doc(`projects/${id}/tasks/task`).set({...base,status:"complete",roomId:"room",championPersonId:"person"});
 await assert.rejects(deleteOpenRecord(db,id,"owner","rooms","room",initial["rooms:room"].revision!),/Closed/);
 const options=await deletionOptions(db,id,"owner");
 assert.equal(options["rooms:room"].allowed,false);assert.equal(options["people:person"].allowed,false);assert.equal(options["tasks:task"].allowed,false);
 await db.doc(`projects/${id}/tasks/task`).update({status:"ready"});
 await db.doc(`projects/${id}/taskHistory/closed`).set({taskId:"task",toStatus:"complete"});
 assert.equal((await deletionOptions(db,id,"owner"))["tasks:task"].allowed,false);
});
test("deleting an unused material updates readiness; empty projects can be removed",async()=>{
 const {deletionOptions,deleteOpenRecord}=await import("../lib/server/record-deletion");
 const id=await deletionProject();
 await db.doc(`projects/${id}/tasks/task`).set({...base,requiredItemIds:["materials:item"],requiredItemsReady:false});
 await db.doc(`projects/${id}/materials/item`).set({name:"Tile",taskId:"task",status:"needed"});
 const options=await deletionOptions(db,id,"owner");
 await deleteOpenRecord(db,id,"owner","materials","item",options["materials:item"].revision!);
 const task=(await db.doc(`projects/${id}/tasks/task`).get()).data()!;
 assert.deepEqual(task.requiredItemIds,[]);assert.equal(task.requiredItemsReady,true);
 const empty=await deletionProject(), check=await deletionOptions(db,empty,"owner");
 await deleteOpenRecord(db,empty,"owner","project",empty,check[`project:${empty}`].revision!);
 assert.equal((await db.doc(`projects/${empty}`).get()).data()?.activeProject,false);
 await assert.rejects(deletionOptions(db,empty,"owner"),/unavailable/);
});
