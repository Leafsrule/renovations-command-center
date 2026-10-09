"use client";
import { AlphabeticalSelect } from "./AlphabeticalSelect";
import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
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
        {item.category}: {item.caption}
      </figcaption>
    </figure>
  );
}
export function EvidenceWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  return <EvidenceWorkspaceContent key={projectId} projectId={projectId} />;
}
function EvidenceWorkspaceContent({ projectId }: { projectId: string }) {
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
    Promise.all([listProjectTasks(projectId), listEvidence(projectId)])
      .then(([t, e]) => {
        if (live) {
          setTasks(t);
          setItems(e);
        }
      })
      .catch((e) => {
        if (live) setMessage(e.message);
      });
    return () => {
      live = false;
    };
  }, [projectId]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!file || !taskId) return;
    setBusy(true);
    setMessage("Uploading…");
    try {
      const saved=await uploadEvidence(projectId, taskId, file, caption, category);
      if(saved) setItems(await listEvidence(projectId));
      setMessage(saved?"Saved to this project.":"Photo retained on this device. Project save is pending; use Photo sync to retry.");
      setFile(null);
      setCaption("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-4">
      <form onSubmit={submit} className="space-y-3 rounded border bg-white p-4">
        <label className="block">
          Task
          <AlphabeticalSelect
            required
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
          Media purpose
          <AlphabeticalSelect
            className="block w-full rounded border p-2"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {[
              "Before",
              "During",
              "After",
              "Issue",
              "Receipt",
              "Inspection",
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </AlphabeticalSelect>
        </label>
        <label className="block">
          Photo / receipt
          <input
            required
            className="block w-full"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
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
        <button
          className="touch-target rounded bg-brand px-4 text-white"
          disabled={busy || !file || !taskId}
        >
          {busy ? "Uploading…" : "Upload media"}
        </button>
        <p role="status">{message}</p>
      </form>
      {items.length ? (
        items.map((item) => <EvidenceImage key={item.id} item={item} />)
      ) : (
        <p>No media saved yet.</p>
      )}
    </section>
  );
}
