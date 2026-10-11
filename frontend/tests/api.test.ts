import { expect, test, vi } from "vitest";
import { api, send } from "../src/lib/api";
test("uses the same-origin cookie contract without retrying mutations", async () => {
  const fetch = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        error: {
          code: "EMAIL_UNVERIFIED",
          message: "Verify your email first.",
        },
      }),
      { status: 403 },
    ),
  );
  vi.stubGlobal("fetch", fetch);
  await expect(send("/bugs", { title: "test" })).rejects.toMatchObject({
    status: 403,
    code: "EMAIL_UNVERIFIED",
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith(
    "/api/v1/bugs",
    expect.objectContaining({
      credentials: "same-origin",
      cache: "no-store",
      method: "POST",
    }),
  );
});
test("preserves multipart boundaries for image uploads", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetch);
  const body = new FormData();
  await api("/bugs/id/attachments", { method: "POST", body });
  expect(fetch.mock.calls[0][1].headers).not.toHaveProperty("Content-Type");
});
