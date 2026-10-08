import { it, expect } from "vitest";
import { readJsonRequest } from "./request-body";
it("bounds actual streamed bytes without trusting content-length", async () => {
  const request = new Request("https://app.test", {
    method: "POST",
    headers: { "content-length": "1" },
    body: '{"note":"' + "x".repeat(50) + '"}',
  });
  await expect(readJsonRequest(request, 30)).rejects.toMatchObject({
    status: 413,
  });
});
it("rejects malformed JSON and reads permitted commands", async () => {
  await expect(
    readJsonRequest(
      new Request("https://app.test", { method: "POST", body: "invalid" }),
      30,
    ),
  ).rejects.toMatchObject({ status: 400 });
  expect(
    await readJsonRequest(
      new Request("https://app.test", { method: "POST", body: '{"ok":true}' }),
      30,
    ),
  ).toEqual({ ok: true });
});
