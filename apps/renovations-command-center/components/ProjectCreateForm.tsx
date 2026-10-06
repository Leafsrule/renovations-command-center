"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  createOwnerProject,
  type CreateProjectInput,
  type ProjectType
} from "@/lib/projects";

const projectTypes: Array<{ label: string; value: ProjectType }> = [
  { label: "Custom project", value: "custom" },
  { label: "Bathroom / Ensuite", value: "bathroom_ensuite" }
];

function friendlyProjectError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The project could not be saved. Please try again.";
}

export function ProjectCreateForm() {
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<CreateProjectInput>({
    name: "",
    type: "custom",
    scope: "",
    startDate: "",
    targetFinishDate: ""
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!user) {
      setError("Sign in before creating a project.");
      return;
    }

    if (!form.name.trim()) {
      setError("Enter a project name.");
      return;
    }

    setSaving(true);

    try {
      const projectId = await createOwnerProject(user.uid, form);
      router.replace(`/projects/${projectId}`);
    } catch (projectError) {
      setError(friendlyProjectError(projectError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error ? (
        <div className="rounded-md border border-[#e4bbbb] bg-[#fae8e8] p-3 text-sm leading-6 text-danger">
          {error}
        </div>
      ) : null}

      <label className="block text-sm font-semibold text-ink">
        Project name
        <input
          className="touch-target mt-2 w-full rounded-md border border-line px-3 text-sm font-normal"
          placeholder="Ensuite renovation"
          value={form.name}
          onChange={(event) =>
            setForm((current) => ({ ...current, name: event.target.value }))
          }
          required
        />
      </label>

      <label className="block text-sm font-semibold text-ink">
        Project type
        <select
          className="touch-target mt-2 w-full rounded-md border border-line bg-white px-3 text-sm font-normal"
          value={form.type}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              type: event.target.value as ProjectType
            }))
          }
        >
          {projectTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-semibold text-ink">
        Scope / notes
        <textarea
          className="mt-2 min-h-28 w-full rounded-md border border-line px-3 py-3 text-sm font-normal"
          placeholder="Short notes about the work, constraints, or goal."
          value={form.scope}
          onChange={(event) =>
            setForm((current) => ({ ...current, scope: event.target.value }))
          }
        />
      </label>

      <div className="grid grid-cols-1 gap-4">
        <label className="block text-sm font-semibold text-ink">
          Start date
          <input
            className="touch-target mt-2 w-full rounded-md border border-line px-3 text-sm font-normal"
            type="date"
            value={form.startDate}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                startDate: event.target.value
              }))
            }
          />
        </label>

        <label className="block text-sm font-semibold text-ink">
          Target finish date
          <input
            className="touch-target mt-2 w-full rounded-md border border-line px-3 text-sm font-normal"
            type="date"
            value={form.targetFinishDate}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                targetFinishDate: event.target.value
              }))
            }
          />
        </label>
      </div>

      <button
        className="touch-target w-full rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
        disabled={saving}
        type="submit"
      >
        {saving ? "Saving project..." : "Create project"}
      </button>
    </form>
  );
}
