import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { taskRevision } from "../lib/task-command.ts";
const project="demo-renovations-racp";
for (const key of ["FIRESTORE_EMULATOR_HOST","FIREBASE_AUTH_EMULATOR_HOST","FIREBASE_STORAGE_EMULATOR_HOST"]) if (!/^127\.0\.0\.1:\d+$/.test(process.env[key] ?? "")) throw new Error("Loopback demo emulators are required.");
if (process.env.FIREBASE_ADMIN_PROJECT_ID!==project) throw new Error("Demo project required.");
const app=initializeApp({projectId:project});
const db=getFirestore(app);
const child=spawn("npm",["run","dev","--","--hostname","127.0.0.1","--port","3000"],{env:process.env,stdio:["ignore","ignore","inherit"],detached:true});
const base="http://127.0.0.1:3000";
try {
  let ready=false;
  for (let i=0;i<100;i++) {
    if (child.exitCode!==null) throw new Error("Private development server stopped.");
    try { if ((await fetch(`${base}/api/health`)).ok) {ready=true;break;} } catch { /* Wait for the private server. */ }
    await delay(200);
  }
  assert(ready,"Server did not start.");
  const authUrl=`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-local-only`;
  const signup=await fetch(authUrl,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:`smoke-${Date.now()}@example.invalid`,password:"demo-only-smoke-password",returnSecureToken:true})});
  assert(signup.ok,"Demo signup failed.");
  const {idToken,localId}=await signup.json();
  const headers={"Content-Type":"application/json",Authorization:`Bearer ${idToken}`};
  const id=`http-smoke-${Date.now()}`;
  const input={name:"Disposable smoke project",type:"bathroom_ensuite",scope:"Demo only",startDate:"",targetFinishDate:""};
  const create=()=>fetch(`${base}/api/projects/create`,{method:"POST",headers,body:JSON.stringify({projectId:id,input})});
  assert.equal((await create()).status,200);
  assert.equal((await create()).status,200,"Retry must return the same project.");
  assert.equal((await db.doc(`projects/${id}`).get()).data().ownerUserId,localId);
  assert.equal((await db.collection(`projects/${id}/tasks`).get()).size,6,"Atomic template requires all tasks.");
  await db.doc(`projects/${id}/settings/planning`).set({calendar:{workdays:[0,1,2,3,4,5,6],hoursPerDay:8,bufferPercent:20,blackouts:[]}});
  const taskRef=db.doc(`projects/${id}/tasks/work`);
  await taskRef.set({name:"Demo work",status:"ready",dependencyTaskIds:[],helperPersonIds:[],helperRequired:false,materialStatus:"not_required",blockerType:"none",estimatedDurationMinutes:30,updatedAt:Timestamp.now()});
  const command={kind:"action",action:"start",expectedRevision:taskRevision((await taskRef.get()).data().updatedAt),helperAvailable:false,commandId:"http-smoke-start"};
  const endpoint=`${base}/api/projects/${id}/tasks/work/commands`;
  assert.equal((await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(command)})).status,401);
  assert.equal((await fetch(endpoint,{method:"POST",headers:{...headers,Authorization:"Bearer invalid-demo-token"},body:JSON.stringify(command)})).status,401);
  assert.equal((await fetch(endpoint,{method:"POST",headers,body:JSON.stringify(command)})).status,200);
  assert.equal((await fetch(endpoint,{method:"POST",headers,body:JSON.stringify(command)})).status,200,"Same receipt must replay.");
  assert.equal((await taskRef.get()).data().status,"in_progress");
  assert.equal((await db.collection(`projects/${id}/taskHistory`).get()).size,1);
  console.log("PASS: real demo Auth token → private Next HTTP routes → Firestore; atomic project/template creation, idempotent replay, unauthorized/invalid-token rejection and task receipt.");
} finally {
  process.kill(-child.pid,"SIGTERM");
  await deleteApp(app);
}
