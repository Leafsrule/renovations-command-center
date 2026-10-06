"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { DEFAULT_CALENDAR } from "@/lib/calendar";
import {
  getProjectSettings,
  saveProjectSettings,
  type ProjectSettings,
} from "@/lib/project-settings";

export function PlanningSettings() {
  const { projectId } = useParams<{ projectId: string }>();
  return <PlanningSettingsForm key={projectId} projectId={projectId} />;
}
function PlanningSettingsForm({ projectId }: { projectId: string }) {
  const [settings, setSettings] = useState<ProjectSettings>({
    calendar: DEFAULT_CALENDAR,
    version: 0,
  });
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    let live = true;
    getProjectSettings(projectId)
      .then((s) => {
        if (live) setSettings(s);
      })
      .catch((e) => {
        if (live) setMessage(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [projectId]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await saveProjectSettings(projectId, settings);
      setSettings({ ...settings, version: settings.version + 1 });
      setMessage("Saved. Recalculate the schedule to apply these settings.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-md border border-line bg-white p-4"
    >
      <h2 className="text-lg font-semibold">Work calendar</h2>
      <p className="text-sm">
        Dates use Toronto time. Helpers must be explicitly assigned.
      </p>
      <label className="block">
        Work hours per day
        <input
          className="block w-full rounded border p-2"
          type="number"
          min="0.25"
          max="24"
          step="0.25"
          value={settings.calendar.hoursPerDay}
          onChange={(e) =>
            setSettings({
              ...settings,
              calendar: {
                ...settings.calendar,
                hoursPerDay: Number(e.target.value),
              },
            })
          }
        />
      </label>
      <label className="block">
        Planning buffer (%)
        <input
          className="block w-full rounded border p-2"
          type="number"
          min="0"
          max="99"
          value={settings.calendar.bufferPercent}
          onChange={(e) =>
            setSettings({
              ...settings,
              calendar: {
                ...settings.calendar,
                bufferPercent: Number(e.target.value),
              },
            })
          }
        />
      </label>
      <fieldset>
        <legend>Workdays</legend>
        <div className="flex flex-wrap gap-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
            (name, day) => (
              <label key={day}>
                <input
                  type="checkbox"
                  checked={settings.calendar.workdays.includes(day)}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      calendar: {
                        ...settings.calendar,
                        workdays: e.target.checked
                          ? [...settings.calendar.workdays, day]
                          : settings.calendar.workdays.filter((d) => d !== day),
                      },
                    })
                  }
                />{" "}
                {name}
              </label>
            ),
          )}
        </div>
      </fieldset>
      <label className="block">
        Blackout dates (one YYYY-MM-DD per line)
        <textarea
          className="block w-full rounded border p-2"
          rows={5}
          value={settings.calendar.blackouts.join("\n")}
          onChange={(e) =>
            setSettings({
              ...settings,
              calendar: {
                ...settings.calendar,
                blackouts: e.target.value.split("\n"),
              },
            })
          }
        />
      </label>
      <button
        className="touch-target rounded bg-brand px-4 text-white"
        disabled={loading || saving}
      >
        {saving ? "Saving…" : "Save calendar"}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
