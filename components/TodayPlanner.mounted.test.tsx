// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RenovationTask } from "@/lib/tasks";
import { TodayPlanner } from "./TodayPlanner";

const routeMocks = vi.hoisted(() => ({
  projectId: "project-1"
}));

const dataMocks = vi.hoisted(() => ({
  listProjectTasks: vi.fn(),
  executeProjectTaskAction: vi.fn(),
  listProjectRooms: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: routeMocks.projectId })
}));

vi.mock("@/lib/tasks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/tasks")>()),
  listProjectTasks: dataMocks.listProjectTasks,
  executeProjectTaskAction: dataMocks.executeProjectTaskAction
}));

vi.mock("@/lib/rooms", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rooms")>()),
  listProjectRooms: dataMocks.listProjectRooms
}));

function createTask(partial: Partial<RenovationTask> = {}): RenovationTask {
  return {
    id: partial.id ?? "task-1",
    name: partial.name ?? "Install vanity",
    roomId: partial.roomId ?? null,
    phase: partial.phase ?? "fixtures",
    description: partial.description ?? "",
    status: partial.status ?? "ready",
    priority: partial.priority ?? "medium",
    championPersonId: partial.championPersonId ?? null,
    helperPersonIds: partial.helperPersonIds ?? [],
    dependencyTaskIds: partial.dependencyTaskIds ?? [],
    helperRequired: partial.helperRequired ?? false,
    estimatedDurationMinutes: partial.estimatedDurationMinutes ?? 90,
    actualDurationMinutes: partial.actualDurationMinutes ?? null,
    earliestStartDate: partial.earliestStartDate ?? null,
    dueDate: partial.dueDate ?? null,
    scheduledStart: partial.scheduledStart ?? null,
    scheduledEnd: partial.scheduledEnd ?? null,
    readinessState: partial.readinessState ?? "ready",
    readinessReasons: partial.readinessReasons ?? [],
    blockerType: partial.blockerType ?? "none",
    blockerNotes: partial.blockerNotes ?? "",
    blockedUntilDate: partial.blockedUntilDate ?? null,
    materialStatus: partial.materialStatus ?? "ready",
    materialItems: partial.materialItems ?? [],
    materialNotes: partial.materialNotes ?? "",
    materialNeededByDate: partial.materialNeededByDate ?? null,
    materialBlockerNotes: partial.materialBlockerNotes ?? "",
    criticalPathRisk: partial.criticalPathRisk ?? "none",
    photosRequired: partial.photosRequired ?? false,
    canRunConcurrent: partial.canRunConcurrent ?? false,
    notes: partial.notes ?? "",
    createdAt: undefined,
    updatedAt: undefined
  };
}

function taskCard(taskName: string) {
  const card = screen.getByText(taskName).closest("li");
  if (!card) {
    throw new Error(`Task card not found for ${taskName}`);
  }

  return within(card);
}

async function renderPlanner(tasks: RenovationTask[]) {
  dataMocks.listProjectTasks.mockResolvedValue(tasks);
  dataMocks.listProjectRooms.mockResolvedValue([]);
  render(<TodayPlanner />);

  await screen.findByText("Planning controls");
}

describe("TodayPlanner mounted behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.localStorage.setItem("today-available-hours", "2");
    window.localStorage.setItem("today-buffer-percent", "0");
    dataMocks.executeProjectTaskAction.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the planner and opens blocker modal for the selected task", async () => {
    await renderPlanner([createTask({ name: "Install vanity" })]);

    expect(screen.getByText("Today's capacity")).toBeTruthy();
    await userEvent.click(taskCard("Install vanity").getByRole("button", { name: "Block" }));

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Block task")).toBeTruthy();
  });

  it("keeps invalid blocker validation inside the modal and clears it when fields change", async () => {
    await renderPlanner([createTask({ name: "Install vanity" })]);
    await userEvent.click(taskCard("Install vanity").getByRole("button", { name: "Block" }));

    fireEvent.submit(screen.getByText("Save blocker").closest("form")!);

    const dialog = within(screen.getByRole("dialog"));
    await waitFor(() => expect(dialog.getByText("Choose a blocker type.")).toBeTruthy());
    expect(screen.getByText("Planning controls")).toBeTruthy();
    expect(screen.queryByText("Tasks could not be loaded. Please try again.")).toBeNull();

    await userEvent.selectOptions(dialog.getByLabelText("Blocker type"), "material");
    expect(dialog.queryByText("Choose a blocker type.")).toBeNull();

    fireEvent.submit(screen.getByText("Save blocker").closest("form")!);
    await waitFor(() => expect(dialog.getByText("Enter a meaningful blocker note.")).toBeTruthy());
    await userEvent.type(dialog.getByLabelText("Blocker note"), "Vanity has not arrived.");
    expect(dialog.queryByText("Enter a meaningful blocker note.")).toBeNull();

    fireEvent.change(dialog.getByLabelText("Blocker note"), { target: { value: "" } });
    fireEvent.submit(screen.getByText("Save blocker").closest("form")!);
    await waitFor(() => expect(dialog.getByText("Enter a meaningful blocker note.")).toBeTruthy());
    const blockedUntilInput = screen
      .getByText("Blocked until (optional)")
      .closest("label")
      ?.querySelector("input");
    if (!blockedUntilInput) {
      throw new Error("Blocked until input was not found.");
    }
    fireEvent.change(blockedUntilInput, {
      target: { value: "2026-06-30" }
    });
    expect(dialog.queryByText("Enter a meaningful blocker note.")).toBeNull();
  });

  it("cancels blocker entry without persisting", async () => {
    await renderPlanner([createTask({ name: "Install vanity" })]);
    await userEvent.click(taskCard("Install vanity").getByRole("button", { name: "Block" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(dataMocks.executeProjectTaskAction).not.toHaveBeenCalled();
  });

  it("saves one intended blocker action and closes the modal", async () => {
    const task = createTask({ id: "block-me", name: "Install vanity" });
    await renderPlanner([task]);
    await userEvent.click(taskCard("Install vanity").getByRole("button", { name: "Block" }));

    const dialog = within(screen.getByRole("dialog"));
    await userEvent.selectOptions(dialog.getByLabelText("Blocker type"), "material");
    await userEvent.type(dialog.getByLabelText("Blocker note"), "Vanity has not arrived.");
    fireEvent.change(dialog.getByLabelText("Blocked until (optional)"), {
      target: { value: "2026-06-30" }
    });
    await userEvent.click(dialog.getByRole("button", { name: "Save blocker" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(dataMocks.executeProjectTaskAction).toHaveBeenCalledTimes(1);
    expect(dataMocks.executeProjectTaskAction).toHaveBeenCalledWith(
      "project-1",
      task,
      "block",
      expect.objectContaining({
        blocker: {
          blockerType: "material",
          blockerNotes: "Vanity has not arrived.",
          blockedUntilDate: "2026-06-30"
        }
      })
    );
  });

  it("keeps rejected blocker saves usable without false success", async () => {
    dataMocks.executeProjectTaskAction.mockRejectedValue(new Error("Write rejected."));
    await renderPlanner([createTask({ name: "Install vanity" })]);
    await userEvent.click(taskCard("Install vanity").getByRole("button", { name: "Block" }));

    const dialog = within(screen.getByRole("dialog"));
    await userEvent.selectOptions(dialog.getByLabelText("Blocker type"), "material");
    await userEvent.type(dialog.getByLabelText("Blocker note"), "Vanity has not arrived.");
    await userEvent.click(dialog.getByRole("button", { name: "Save blocker" }));

    await waitFor(() => expect(dialog.getByText("Write rejected.")).toBeTruthy());
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(
      dialog.getByRole("button", { name: "Save blocker" }).hasAttribute("disabled")
    ).toBe(false);
    expect(screen.queryByText("Blocked")).toBeNull();
  });

  it("hides Start for over-capacity Not Today work and shows Start for eligible work", async () => {
    await renderPlanner([
      createTask({ id: "oversized", name: "Oversized demo", estimatedDurationMinutes: 240, priority: "urgent" }),
      createTask({ id: "eligible", name: "Patch drywall", estimatedDurationMinutes: 60, priority: "high" })
    ]);

    expect(taskCard("Oversized demo").queryByRole("button", { name: "Start" })).toBeNull();
    expect(taskCard("Patch drywall").getByRole("button", { name: "Start" })).toBeTruthy();
  });

  it("requires confirmation before Complete and writes nothing when cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    await renderPlanner([createTask({ name: "Install vanity", status: "in_progress" })]);

    await userEvent.click(taskCard("Install vanity").getByRole("button", { name: "Complete" }));

    expect(window.confirm).toHaveBeenCalledWith('Mark "Install vanity" complete?');
    expect(dataMocks.executeProjectTaskAction).not.toHaveBeenCalled();
  });

  it("keeps rejected Complete recoverable without false visible progress", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    dataMocks.executeProjectTaskAction.mockRejectedValue(new Error("Complete rejected."));
    await renderPlanner([createTask({ name: "Install vanity", status: "in_progress" })]);

    await userEvent.click(taskCard("Install vanity").getByRole("button", { name: "Complete" }));

    await waitFor(() => expect(screen.getByText("Complete rejected.")).toBeTruthy());
    expect(screen.getByText("Planning controls")).toBeTruthy();
    expect(taskCard("Install vanity").getByText("In progress")).toBeTruthy();
    expect(taskCard("Install vanity").getByRole("button", { name: "Complete" })).toBeTruthy();
  });
});
