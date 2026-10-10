"use client";
import { useAuth } from "./AuthProvider";
import Link from "next/link";
import { mediaTypes, mediaTypeLabel } from "@/lib/media-types";
import { photoEvent, listQueuedPhotos } from "@/lib/photo-outbox";
import { AlphabeticalSelect } from "./AlphabeticalSelect";
import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { listProjectTasks, type RenovationTask } from "@/lib/tasks";
import {
  evidenceBlob,
  listEvidence,
  uploadEvidence,
  type Evidence,
} from "@/lib/evidence";
function EvidenceImage({ item }: { item: Evidence }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true,
      objectUrl = "";
    evidenceBlob(item.path)
      .then((blob) => {
        if (live) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      })
      .catch(() => {
        if (live) setError("Image unavailable. Check access and connection.");
      });
    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.path]);
  return (
    <figure className="rounded border p-3">
      {url ? (
        <Image
          unoptimized
          width={600}
          height={400}
          src={url}
          alt={item.caption || item.category}
          className="max-h-72 w-full object-contain"
        />
      ) : (
        <p>{error || "Loading image…"}</p>
      )}
      <figcaption>
        {mediaTypeLabel(item.category)}: {item.caption}
      </figcaption>
    </figure>
  );
}
export function EvidenceWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user }=useAuth();
  if(!user)return <p>Sign in to upload photos.</p>;
  return <EvidenceWorkspaceContent key={`${user.uid}:${projectId}`} projectId={projectId} ownerId={user.uid} />;
}
function EvidenceWorkspaceContent({ projectId,ownerId }: { projectId: string;ownerId:string }) {
  const fileInput=useRef<HTMLInputElement>(null), taskInput=useRef<HTMLSelectElement>(null);
  const [needsRetry,setNeedsRetry]=useState(false);
  const [tasks, setTasks] = useState<RenovationTask[]>([]),
    [items, setItems] = useState<Evidence[]>([]),
    [taskId, setTaskId] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [caption, setCaption] = useState(""),
    [category, setCategory] = useState("During"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    let live = true;
    void listProjectTasks(projectId).then(rows=>{if(live)setTasks(rows);}).catch(e=>{if(live)setMessage(e.message);});
    const reloadPhotos=()=>listEvidence(projectId).then(rows=>{if(live)setItems(rows);}).catch(e=>{if(live)setMessage(e.message);});
    void reloadPhotos();
    let timer:ReturnType<typeof setTimeout>;
    const refreshOutbox=()=>listQueuedPhotos(ownerId).then(rows=>{if(live)setNeedsRetry(rows.some(row=>row.projectId===projectId && row.state!=="saved"));}).catch(()=>{});
    void refreshOutbox();
    const onSync=()=>{clearTimeout(timer);timer=setTimeout(()=>{void reloadPhotos();void refreshOutbox();},100);};
    window.addEventListener(photoEvent,onSync);
    return () => {
      live = false;
      clearTimeout(timer);
      window.removeEventListener(photoEvent,onSync);
    };
  }, [projectId,ownerId]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if(!taskId){setMessage("Choose the task this file belongs to first. If none is listed, add a task using the link below.");taskInput.current?.focus();return;}
    if(!file){setMessage("Choose a photo or a picture of your receipt, then click Upload media.");fileInput.current?.focus();return;}
    setBusy(true);
    setMessage("Preparing the upload…");
    try {
      let detail="";
      const saved=await uploadEvidence(projectId, taskId, file, caption, category,progress=>{detail=progress;setMessage(progress);});
      setNeedsRetry(!saved);
      setFile(null);
      if(fileInput.current)fileInput.current.value="";
      setCaption("");
      if(saved){
        setMessage("Saved to this project and linked to the selected task.");
        try {setItems(await listEvidence(projectId));}catch{setMessage("Saved to this project. The photo list could not refresh; reload to view it.");}
      }else setMessage(`Not saved to the project yet. ${detail} The original file is retained on this device. Use Retry photo under Photos on this device.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-4">
      <form noValidate onSubmit={submit} className="space-y-3 rounded border bg-white p-4">
        <label className="block">
          Task
          <AlphabeticalSelect
            ref={taskInput}
            className="block w-full rounded border p-2"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
          >
            <option value="">Choose task</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </AlphabeticalSelect>
        </label>
        <label className="block">
          Photo / document type
          <AlphabeticalSelect
            className="block w-full rounded border p-2"
            aria-describedby="media-type-help media-type-definition"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {mediaTypes.map(type=><option key={type.value} value={type.value}>{type.label}</option>)}
          </AlphabeticalSelect>
        </label>
        <p id="media-type-help" className="text-sm text-muted">Choose what the file shows: work before, during or after; a problem; a receipt; or an inspection. This label helps you find the file later and does not change task status.</p>
        <p id="media-type-definition" className="text-sm">{mediaTypes.find(type=>type.value===category)?.definition}</p>
        <label className="block">
          Photo or receipt image
          <input
            ref={fileInput}
            className="block w-full"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="block">
          Caption
          <input
            className="block w-full rounded border p-2"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </label>
        <p className="text-sm text-muted">Choose a task and a JPG, PNG or WebP image smaller than 10 MB. For a paper receipt, upload a picture of it.</p>
        <Link className="touch-target inline-flex items-center underline" href={`/projects/${projectId}/tasks`}>Add / manage tasks</Link>
        <button
          type="submit"
          className="touch-target rounded bg-brand px-4 text-white"
          disabled={busy}
        >
          {busy ? "Uploading…" : "Upload media"}
        </button>
        <p role="status" aria-live="polite" className="whitespace-pre-wrap">{message}</p>
        {needsRetry?<a href="#photo-sync" className="touch-target inline-flex items-center underline">Review / retry photos on this device</a>:null}
      </form>
      {items.length ? (
        items.map((item) => <EvidenceImage key={item.id} item={item} />)
      ) : (
        <p>No media saved yet.</p>
      )}
    </section>
  );
}
