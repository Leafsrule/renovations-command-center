import { createHash } from "node:crypto";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { CommandError, validId } from "../task-command";
import { validDate } from "../calendar";
export async function createProject(db:Firestore, owner:string, value:unknown) {
  const row=value as {projectId?:string;input?:Record<string,unknown>} | null;
  const input=row?.input;
  if (!row?.projectId || !validId(row.projectId) || !input || typeof input!=="object" || Array.isArray(input)) throw new CommandError(400,"Invalid project request.");
  for (const field of ["name","scope","startDate","targetFinishDate"]) if (typeof input[field]!=="string" || (input[field] as string).length>10000) throw new CommandError(400,"Invalid project fields.");
  if (!(input.name as string).trim() || (input.name as string).length>200 || !["custom","bathroom_ensuite"].includes(input.type as string)) throw new CommandError(400,"Choose a project name and type.");
  const start=input.startDate as string, finish=input.targetFinishDate as string;
  if ([start,finish].some(date=>date && !validDate(date)) || (start && finish && finish<start)) throw new CommandError(400,"Choose valid project dates in order.");
  const digest=createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const ref=db.doc(`projects/${row.projectId}`);
  await db.runTransaction(async tx=>{
    const [current,owned]=await Promise.all([tx.get(ref),tx.get(db.collection("projects").where("ownerUserId","==",owner).limit(401))]);
    if (current.exists) {
      if (current.data()?.ownerUserId!==owner || current.data()?.creationDigest!==digest) throw new CommandError(409,"Project destination contains a different request. No data was overwritten.");
      return;
    }
    if (owned.size>400) throw new CommandError(400,"Account exceeds the safe project limit.");
    const timestamp=FieldValue.serverTimestamp();
    tx.create(ref,{name:(input.name as string).trim(),type:input.type,status:"planning",scope:(input.scope as string).trim(),startDate:start,targetFinishDate:finish,activeProject:owned.empty,ownerUserId:owner,currentPhase:"setup",criticalPathWarning:false,creationDigest:digest,createdAt:timestamp,updatedAt:timestamp});
    const stages=[
      ["Confirm scope, measurements and required inspections","setup"],
      ["Plan protection, safe demolition and waste removal","demolition"],
      ["Prepare substrate and confirm rough-in work","prep"],
      ["Verify waterproofing requirements and inspection","waterproofing"],
      ["Plan tile installation and manufacturer curing periods","tile"],
      ["Fit fixtures, check workmanship and clean up","fixtures"],
    ];
    if (input.type==="bathroom_ensuite") stages.forEach(([name,phase],index)=>tx.create(ref.collection("tasks").doc(`template-${index+1}`),{name,phase,status:"draft",priority:"medium",dependencyTaskIds:index?[`template-${index}`]:[],helperPersonIds:[],helperRequired:false,estimatedDurationMinutes:null,readinessState:"not_ready",materialStatus:"needed",photosRequired:false,notes:"Template planning item: verify scope, measurements, estimates, materials and inspection requirements before work.",createdAt:timestamp,updatedAt:timestamp}));
  });
  return row.projectId;
}
