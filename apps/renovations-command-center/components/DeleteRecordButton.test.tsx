// @vitest-environment jsdom
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: { uid: "owner", getIdToken: vi.fn() },
  current: { uid: "owner" },
}));
vi.mock("./AuthProvider", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/lib/firebase", () => ({
  auth: {
    get currentUser() {
      return mocks.current;
    },
  },
}));
import { DeleteRecordButton } from "./DeleteRecordButton";
beforeEach(() => {
  mocks.user.getIdToken.mockResolvedValue("token");
  mocks.current.uid = "owner";
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("greys out closed entries and shows why deletion is unavailable", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      Response.json({
        "rooms:room": {
          allowed: false,
          reason: "Closed task entries are linked to this record.",
        },
      }),
    );
  vi.stubGlobal("fetch", fetch);
  render(
    <DeleteRecordButton
      projectId="closed"
      kind="rooms"
      id="room"
      name="Kitchen"
    />,
  );
  await screen.findByText("Closed task entries are linked to this record.");
  expect(
    (screen.getByRole("button", { name: "Delete" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button"));
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("requires confirmation and sends the verified revision; handles changed entries without removing them", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        "rooms:room": { allowed: true, reason: "Unused", revision: "abc" },
      }),
    )
    .mockResolvedValueOnce(
      Response.json(
        { error: "Closed task entries are linked to this record." },
        { status: 409 },
      ),
    );
  vi.stubGlobal("fetch", fetch);
  const confirm = vi
    .spyOn(window, "confirm")
    .mockReturnValueOnce(false)
    .mockReturnValueOnce(true);
  render(
    <DeleteRecordButton
      projectId="open"
      kind="rooms"
      id="room"
      name="Kitchen"
    />,
  );
  await waitFor(() =>
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(
      false,
    ),
  );
  fireEvent.click(screen.getByRole("button"));
  expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button"));
  await screen.findByRole("alert");
  expect(confirm).toHaveBeenCalledTimes(2);
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({
    kind: "rooms",
    id: "room",
    revision: "abc",
  });
  expect(screen.getByRole("alert").textContent).toMatch(/Closed/);
});
it("does not submit deletion if the signed-in account changed", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        "rooms:room": { allowed: true, reason: "Unused", revision: "abc" },
      }),
    );
  vi.stubGlobal("fetch", fetch);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  render(
    <DeleteRecordButton
      projectId="changed-owner"
      kind="rooms"
      id="room"
      name="Kitchen"
    />,
  );
  await waitFor(() =>
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(
      false,
    ),
  );
  mocks.current.uid = "other";
  fireEvent.click(screen.getByRole("button"));
  await screen.findByRole("alert");
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("refreshes eligibility when returning to a record after it gains closed entries", async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(Response.json({"rooms:room":{allowed:true,reason:"Unused",revision:"abc"}})).mockResolvedValueOnce(Response.json({"rooms:room":{allowed:false,reason:"Closed task entries are linked to this record."}}));
 vi.stubGlobal("fetch",fetch);
 const first=render(<DeleteRecordButton projectId="returning" kind="rooms" id="room" name="Kitchen"/>);
 await waitFor(()=>expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(false));first.unmount();
 render(<DeleteRecordButton projectId="returning" kind="rooms" id="room" name="Kitchen"/>);
 await screen.findByText("Closed task entries are linked to this record.");
 expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);expect(fetch).toHaveBeenCalledTimes(2);
});
