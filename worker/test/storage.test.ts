import { beforeEach, expect, test, vi } from "vitest";
import { bindings, bug, png, request, setup, upload, user } from "./helpers";
import { cleanup } from "../src/index";
import { id, now, stmt } from "../src/core";
beforeEach(setup);
test("attachment quota is atomic, malformed formats and oversize dimensions fail safely", async () => {
  const owner = await user(),
    b = await bug(owner.cookie);
  const results = await Promise.all(
    Array.from({ length: 7 }, () =>
      request(`/bugs/${b.id}/attachments`, "POST", upload(), owner.cookie),
    ),
  );
  expect(results.filter((r) => r.status === 201)).toHaveLength(5);
  expect(results.filter((r) => r.status === 400)).toHaveLength(2);
  expect(
    await stmt(bindings, "SELECT count(*) n FROM attachments").first("n"),
  ).toBe(5);
  const oversized = png.slice();
  new DataView(oversized.buffer).setUint32(16, 50000);
  expect(
    (
      await request(
        `/bugs/${b.id}/attachments`,
        "POST",
        upload(oversized),
        owner.cookie,
      )
    ).status,
  ).toBe(415);
  expect(
    (
      await request(
        `/bugs/${b.id}/attachments`,
        "POST",
        upload(new Uint8Array(6 * 1024 * 1024)),
        owner.cookie,
      )
    ).status,
  ).toBe(413);
});
test("failed R2 writes compensate the reserved attachment row", async () => {
  const owner = await user(),
    b = await bug(owner.cookie);
  const bucket = {
    put: async () => {
      throw new Error("Synthetic outage");
    },
  } as unknown as R2Bucket;
  expect(
    (
      await request(
        `/bugs/${b.id}/attachments`,
        "POST",
        upload(),
        owner.cookie,
        { ATTACHMENTS: bucket },
      )
    ).status,
  ).toBe(503);
  expect(
    await stmt(bindings, "SELECT count(*) n FROM attachments").first("n"),
  ).toBe(0);
});
test("scheduled cleanup removes old deleted reports and dependent objects but preserves live data", async () => {
  const owner = await user(),
    deleted = await bug(owner.cookie),
    live = await bug(owner.cookie),
    recent = await bug(owner.cookie);
  for (const b of [deleted, live, recent])
    await request(`/bugs/${b.id}/attachments`, "POST", upload(), owner.cookie);
  await request(
    `/bugs/${deleted.id}/comments`,
    "POST",
    { content: "Old comment" },
    owner.cookie,
  );
  await request(`/bugs/${deleted.id}/vote`, "POST", {}, owner.cookie);
  await request(
    `/bugs/${deleted.id}/report`,
    "POST",
    { reason: "Old moderation record" },
    owner.cookie,
  );
  await stmt(
    bindings,
    "UPDATE bugs SET deleted_at=? WHERE id=?",
    "2000-01-01T00:00:00.000Z",
    deleted.id,
  ).run();
  await stmt(
    bindings,
    "UPDATE bugs SET deleted_at=? WHERE id=?",
    now(),
    recent.id,
  ).run();
  await stmt(
    bindings,
    "UPDATE sessions SET expires_at=?",
    "2000-01-01T00:00:00.000Z",
  ).run();
  await stmt(
    bindings,
    "INSERT INTO oauth_states(state_hash,provider,verifier,browser_hash,expires_at) VALUES('old','google','verifier','browser','2000-01-01T00:00:00.000Z')",
  ).run();
  await stmt(bindings, "INSERT INTO rate_limits VALUES('old',1,1)").run();
  await stmt(
    bindings,
    "INSERT INTO action_tokens(token_hash,purpose,user_id,email,expires_at,created_at) VALUES(?,'verify',?,?,?,?)",
    id(),
    owner.id,
    "reporter@example.com",
    "2000-01-01T00:00:00.000Z",
    now(),
  ).run();
  await cleanup(bindings);
  expect(await stmt(bindings, "SELECT count(*) n FROM bugs").first("n")).toBe(
    2,
  );
  expect(
    await stmt(bindings, "SELECT count(*) n FROM attachments").first("n"),
  ).toBe(2);
  expect((await bindings.ATTACHMENTS.list()).objects).toHaveLength(2);
  for (const table of [
    "sessions",
    "oauth_states",
    "action_tokens",
    "comments",
    "votes",
    "moderation",
  ])
    expect(
      await stmt(bindings, `SELECT count(*) n FROM ${table}`).first("n"),
    ).toBe(0);
});
test("orphan sweep waits a full day and retains referenced objects", async () => {
  const owner = await user(),
    b = await bug(owner.cookie);
  await request(`/bugs/${b.id}/attachments`, "POST", upload(), owner.cookie);
  await bindings.ATTACHMENTS.put("bugs/orphan/file", png);
  await cleanup(bindings);
  expect((await bindings.ATTACHMENTS.list()).objects).toHaveLength(2);
  const future = Date.now() + 2 * 86400000;
  vi.spyOn(Date, "now").mockReturnValue(future);
  await cleanup(bindings);
  expect((await bindings.ATTACHMENTS.list()).objects).toHaveLength(1);
  expect(
    await stmt(bindings, "SELECT count(*) n FROM attachments").first("n"),
  ).toBe(1);
});
