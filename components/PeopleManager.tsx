"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import {
  createProjectPerson,
  listProjectPeople,
  updateProjectPerson,
  type PersonFormInput,
  type PersonRoleType,
  type RenovationPerson
} from "@/lib/people";

const roleOptions: Array<{ label: string; value: PersonRoleType }> = [
  { label: "Owner", value: "owner" },
  { label: "Champion", value: "champion" },
  { label: "Helper", value: "helper" },
  { label: "Contractor", value: "contractor" },
  { label: "Viewer", value: "viewer" },
  { label: "Other", value: "other" }
];

const emptyForm: PersonFormInput = {
  name: "",
  roleType: "helper",
  email: "",
  phone: "",
  skillTagsText: "",
  availabilityNotes: "",
  active: true
};

function friendlyPeopleError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "People could not be saved. Please try again.";
}

function labelFromValue<T extends string>(
  options: Array<{ label: string; value: T }>,
  value: T
) {
  return options.find((option) => option.value === value)?.label || value;
}

function personToForm(person: RenovationPerson): PersonFormInput {
  return {
    name: person.name,
    roleType: person.roleType,
    email: person.contact.email,
    phone: person.contact.phone,
    skillTagsText: person.skillTags.join(", "),
    availabilityNotes: person.availabilityNotes,
    active: person.active
  };
}

function PersonForm({
  initialValue,
  isEditing,
  isSaving,
  onCancel,
  onSubmit,
  submitLabel
}: {
  initialValue: PersonFormInput;
  isEditing: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (input: PersonFormInput) => Promise<void>;
  submitLabel: string;
}) {
  const [form, setForm] = useState(initialValue);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Enter a person name.");
      return;
    }

    await onSubmit(form);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error ? (
        <div className="rounded-md border border-[#e4bbbb] bg-[#fae8e8] p-3 text-sm leading-6 text-danger">
          {error}
        </div>
      ) : null}

      <label className="block text-sm font-semibold text-ink">
        Name
        <input
          className="touch-target mt-2 w-full rounded-md border border-line px-3 text-sm font-normal"
          placeholder="George"
          value={form.name}
          onChange={(event) =>
            setForm((current) => ({ ...current, name: event.target.value }))
          }
        />
      </label>

      <label className="block text-sm font-semibold text-ink">
        Role
        <select
          className="touch-target mt-2 w-full rounded-md border border-line bg-white px-3 text-sm font-normal"
          value={form.roleType}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              roleType: event.target.value as PersonRoleType
            }))
          }
        >
          {roleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-semibold text-ink">
        Email
        <input
          className="touch-target mt-2 w-full rounded-md border border-line px-3 text-sm font-normal"
          placeholder="name@example.com"
          type="email"
          value={form.email}
          onChange={(event) =>
            setForm((current) => ({ ...current, email: event.target.value }))
          }
        />
      </label>

      <label className="block text-sm font-semibold text-ink">
        Phone
        <input
          className="touch-target mt-2 w-full rounded-md border border-line px-3 text-sm font-normal"
          placeholder="555-555-5555"
          value={form.phone}
          onChange={(event) =>
            setForm((current) => ({ ...current, phone: event.target.value }))
          }
        />
      </label>

      <label className="block text-sm font-semibold text-ink">
        Skills
        <input
          className="touch-target mt-2 w-full rounded-md border border-line px-3 text-sm font-normal"
          placeholder="planning, renovation"
          value={form.skillTagsText}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              skillTagsText: event.target.value
            }))
          }
        />
      </label>

      <label className="block text-sm font-semibold text-ink">
        Availability notes
        <textarea
          className="mt-2 min-h-24 w-full rounded-md border border-line px-3 py-3 text-sm font-normal"
          placeholder="Days, times, or project availability notes."
          value={form.availabilityNotes}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              availabilityNotes: event.target.value
            }))
          }
        />
      </label>

      {isEditing ? (
        <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-ink">
          <input
            checked={form.active}
            className="h-5 w-5"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                active: event.target.checked
              }))
            }
            type="checkbox"
          />
          Active
        </label>
      ) : null}

      <div className="grid grid-cols-1 gap-2">
        <button
          className="touch-target rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Saving..." : submitLabel}
        </button>
        <button
          className="touch-target rounded-md border border-line px-4 text-sm font-semibold text-ink"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function PeopleManager() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId;
  const [people, setPeople] = useState<RenovationPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const editingPerson = useMemo(
    () => people.find((person) => person.id === editingPersonId) || null,
    [editingPersonId, people]
  );

  async function refreshPeople() {
    const nextPeople = await listProjectPeople(projectId);
    setPeople(nextPeople);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadPeople() {
      setLoading(true);
      setError("");

      try {
        const projectPeople = await listProjectPeople(projectId);

        if (!cancelled) {
          setPeople(projectPeople);
        }
      } catch (peopleError) {
        if (!cancelled) {
          setError(friendlyPeopleError(peopleError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPeople();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function handleCreate(input: PersonFormInput) {
    setSaving(true);
    setError("");

    try {
      await createProjectPerson(projectId, input);
      await refreshPeople();
      setShowAddForm(false);
    } catch (peopleError) {
      setError(friendlyPeopleError(peopleError));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(input: PersonFormInput) {
    if (!editingPerson) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await updateProjectPerson(projectId, editingPerson.id, input);
      setEditingPersonId(null);
      await refreshPeople();
    } catch (peopleError) {
      setError(friendlyPeopleError(peopleError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading people...</p>;
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="touch-target rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink"
          onClick={() => router.push(`/projects/${projectId}`)}
          type="button"
        >
          &larr; Back to Project
        </button>
        <Link
          className="touch-target flex items-center rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink"
          href="/projects"
        >
          Projects
        </Link>
        <h1 className="min-h-11 flex items-center text-xl font-semibold text-ink">
          People / Team
        </h1>
      </div>

      {error ? (
        <div className="rounded-md border border-[#e4bbbb] bg-[#fae8e8] p-3 text-sm leading-6 text-danger">
          {error}
        </div>
      ) : null}

      <div className="rounded-md border border-line bg-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Current People</h2>
            <p className="mt-1 text-sm text-muted">
              Team records for this project.
            </p>
          </div>
          <button
            className="touch-target rounded-md bg-brand px-4 text-sm font-semibold text-white"
            onClick={() => {
              setEditingPersonId(null);
              setShowAddForm(true);
            }}
            type="button"
          >
            Add Person
          </button>
        </div>

        {people.length === 0 ? (
          <p className="mt-4 rounded-md border border-line bg-white p-4 text-sm text-muted">
            No team members added yet.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {people.map((person) => (
              <article
                className="rounded-md border border-line bg-white p-4 shadow-soft"
                key={person.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-ink">
                      {person.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted">
                      {labelFromValue(roleOptions, person.roleType)}
                    </p>
                  </div>
                  <StatusBadge
                    label={person.active ? "Active" : "Inactive"}
                    tone={person.active ? "ready" : "neutral"}
                  />
                </div>

                {person.skillTags.length > 0 ? (
                  <p className="mt-3 text-sm leading-6 text-muted">
                    Skills: {person.skillTags.join(", ")}
                  </p>
                ) : null}
                {person.contact.phone ? (
                  <p className="mt-2 text-sm text-muted">
                    Phone: {person.contact.phone}
                  </p>
                ) : null}
                {person.contact.email ? (
                  <p className="mt-2 text-sm text-muted">
                    Email: {person.contact.email}
                  </p>
                ) : null}

                <button
                  className="touch-target mt-4 w-full rounded-md border border-line px-4 text-sm font-semibold text-ink"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingPersonId(person.id);
                  }}
                  type="button"
                >
                  Edit
                </button>
              </article>
            ))}
          </div>
        )}
      </div>

      {showAddForm || editingPerson ? (
        <div className="rounded-md border border-line bg-white p-4 shadow-soft">
          <h2 className="text-lg font-semibold text-ink">
            {editingPerson ? "Edit Person" : "Add Person"}
          </h2>
          <div className="mt-4">
            <PersonForm
              initialValue={
                editingPerson ? personToForm(editingPerson) : emptyForm
              }
              isEditing={Boolean(editingPerson)}
              isSaving={saving}
              key={editingPerson?.id || "new-person"}
              onCancel={() => {
                setEditingPersonId(null);
                setShowAddForm(false);
              }}
              onSubmit={editingPerson ? handleUpdate : handleCreate}
              submitLabel={editingPerson ? "Save Person" : "Add Person"}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
