"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import {
  createProjectRoom,
  listProjectRooms,
  updateProjectRoom,
  type FloorLevel,
  type RenovationRoom,
  type RoomFormInput,
  type RoomPriority
} from "@/lib/rooms";

const floorOptions: Array<{ label: string; value: FloorLevel }> = [
  { label: "Basement", value: "basement" },
  { label: "Main floor", value: "main_floor" },
  { label: "Second floor", value: "second_floor" },
  { label: "Exterior", value: "exterior" },
  { label: "Garage", value: "garage" },
  { label: "Other", value: "other" }
];

const priorityOptions: Array<{ label: string; value: RoomPriority }> = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" }
];

const emptyForm: RoomFormInput = {
  name: "",
  floorLevel: "main_floor",
  dimensions: "",
  priority: "medium",
  notes: ""
};

function friendlyRoomError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Rooms could not be saved. Please try again.";
}

function labelFromValue<T extends string>(
  options: Array<{ label: string; value: T }>,
  value: T
) {
  return options.find((option) => option.value === value)?.label || value;
}

function RoomForm({
  initialValue,
  isSaving,
  onCancel,
  onSubmit,
  submitLabel
}: {
  initialValue: RoomFormInput;
  isSaving: boolean;
  onCancel?: () => void;
  onSubmit: (input: RoomFormInput) => Promise<void>;
  submitLabel: string;
}) {
  const [form, setForm] = useState(initialValue);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Enter a room name.");
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
        Room name
        <input
          className="touch-target mt-2 w-full rounded-md border border-line px-3 text-sm font-normal"
          placeholder="Ensuite"
          value={form.name}
          onChange={(event) =>
            setForm((current) => ({ ...current, name: event.target.value }))
          }
        />
      </label>

      <label className="block text-sm font-semibold text-ink">
        Floor level
        <select
          className="touch-target mt-2 w-full rounded-md border border-line bg-white px-3 text-sm font-normal"
          value={form.floorLevel}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              floorLevel: event.target.value as FloorLevel
            }))
          }
        >
          {floorOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-semibold text-ink">
        Dimensions
        <input
          className="touch-target mt-2 w-full rounded-md border border-line px-3 text-sm font-normal"
          placeholder="10 ft x 8 ft"
          value={form.dimensions}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              dimensions: event.target.value
            }))
          }
        />
      </label>

      <label className="block text-sm font-semibold text-ink">
        Priority
        <select
          className="touch-target mt-2 w-full rounded-md border border-line bg-white px-3 text-sm font-normal"
          value={form.priority}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              priority: event.target.value as RoomPriority
            }))
          }
        >
          {priorityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-semibold text-ink">
        Notes
        <textarea
          className="mt-2 min-h-24 w-full rounded-md border border-line px-3 py-3 text-sm font-normal"
          placeholder="Access notes, rough condition, or constraints."
          value={form.notes}
          onChange={(event) =>
            setForm((current) => ({ ...current, notes: event.target.value }))
          }
        />
      </label>

      <div className="grid grid-cols-1 gap-2">
        <button
          className="touch-target rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Saving..." : submitLabel}
        </button>
        {onCancel ? (
          <button
            className="touch-target rounded-md border border-line px-4 text-sm font-semibold text-ink"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

function roomToForm(room: RenovationRoom): RoomFormInput {
  return {
    name: room.name,
    floorLevel: room.floorLevel,
    dimensions: room.dimensions,
    priority: room.priority,
    notes: room.notes
  };
}

export function RoomManager() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const [rooms, setRooms] = useState<RenovationRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const editingRoom = useMemo(
    () => rooms.find((room) => room.id === editingRoomId) || null,
    [editingRoomId, rooms]
  );

  async function refreshRooms() {
    const nextRooms = await listProjectRooms(projectId);
    setRooms(nextRooms);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadRooms() {
      setLoading(true);
      setError("");

      try {
        const projectRooms = await listProjectRooms(projectId);

        if (!cancelled) {
          setRooms(projectRooms);
        }
      } catch (roomError) {
        if (!cancelled) {
          setError(friendlyRoomError(roomError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRooms();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function handleCreate(input: RoomFormInput) {
    setSaving(true);
    setError("");

    try {
      await createProjectRoom(projectId, input);
      await refreshRooms();
    } catch (roomError) {
      setError(friendlyRoomError(roomError));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(input: RoomFormInput) {
    if (!editingRoom) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await updateProjectRoom(projectId, editingRoom.id, input);
      setEditingRoomId(null);
      await refreshRooms();
    } catch (roomError) {
      setError(friendlyRoomError(roomError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading rooms...</p>;
  }

  return (
    <section className="space-y-5">
      {error ? (
        <div className="rounded-md border border-[#e4bbbb] bg-[#fae8e8] p-3 text-sm leading-6 text-danger">
          {error}
        </div>
      ) : null}

      {rooms.length === 0 ? (
        <div className="rounded-md border border-line bg-panel p-4">
          <h2 className="text-lg font-semibold text-ink">No rooms yet</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Add rooms or areas so the renovation can be organized by space.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => (
            <article
              className="rounded-md border border-line bg-white p-4 shadow-soft"
              key={room.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-ink">
                    {room.name}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {labelFromValue(floorOptions, room.floorLevel)}
                  </p>
                </div>
                <StatusBadge label={room.priority} tone="neutral" />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge label={room.status.replace("_", " ")} />
                {room.dimensions ? (
                  <StatusBadge label={room.dimensions} />
                ) : null}
              </div>

              <button
                className="touch-target mt-4 w-full rounded-md border border-line px-4 text-sm font-semibold text-ink"
                onClick={() => setEditingRoomId(room.id)}
                type="button"
              >
                Edit room
              </button>
            </article>
          ))}
        </div>
      )}

      <div className="rounded-md border border-line bg-white p-4 shadow-soft">
        <h2 className="text-lg font-semibold text-ink">
          {editingRoom ? "Edit room" : "Add room"}
        </h2>
        <div className="mt-4">
          <RoomForm
            initialValue={editingRoom ? roomToForm(editingRoom) : emptyForm}
            isSaving={saving}
            key={editingRoom?.id || "new-room"}
            onCancel={
              editingRoom ? () => setEditingRoomId(null) : undefined
            }
            onSubmit={editingRoom ? handleUpdate : handleCreate}
            submitLabel={editingRoom ? "Save room" : "Add room"}
          />
        </div>
      </div>
    </section>
  );
}
