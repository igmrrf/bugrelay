import { beforeEach, expect, test } from "vitest";
import { bindings, bug, request, setup, user } from "./helpers";
import { row, stmt } from "../src/core";
beforeEach(setup);
test("only administrators restore deleted reports and private ACL survives restoration", async () => {
  const owner = await user(),
    admin = await user("admin@example.com", true),
    stranger = await user("stranger@example.com");
  const b = await bug(owner.cookie, { visibility: "private" });
  expect(
    (await request(`/bugs/${b.id}`, "DELETE", undefined, owner.cookie)).status,
  ).toBe(200);
  expect(
    (await request("/admin/bugs/deleted", "GET", undefined, stranger.cookie))
      .status,
  ).toBe(403);
  expect(
    (await request(`/admin/bugs/${b.id}/restore`, "POST", {}, owner.cookie))
      .status,
  ).toBe(403);
  expect(
    (await request(`/bugs/${b.id}`, "GET", undefined, owner.cookie)).status,
  ).toBe(404);
  const list = (await (
    await request("/admin/bugs/deleted", "GET", undefined, admin.cookie)
  ).json()) as { total: number };
  expect(list.total).toBe(1);
  expect(
    (await request(`/admin/bugs/${b.id}/restore`, "POST", {}, admin.cookie))
      .status,
  ).toBe(200);
  expect(
    (await request(`/bugs/${b.id}`, "GET", undefined, owner.cookie)).status,
  ).toBe(200);
  expect(
    (await request(`/bugs/${b.id}`, "GET", undefined, stranger.cookie)).status,
  ).toBe(404);
  expect(
    (await row<{ n: number }>(
      bindings,
      "SELECT count(*) n FROM audit_logs WHERE action='bug_restored'",
    ))!.n,
  ).toBe(1);
});
test("merged and retention-expired reports cannot be restored", async () => {
  const owner = await user(),
    admin = await user("admin@example.com", true),
    a = await bug(owner.cookie),
    b = await bug(owner.cookie),
    old = await bug(owner.cookie);
  expect(
    (
      await request(
        "/admin/bugs/merge",
        "POST",
        { primaryBugId: a.id, duplicateBugIds: [b.id] },
        admin.cookie,
      )
    ).status,
  ).toBe(200);
  await stmt(
    bindings,
    "UPDATE bugs SET deleted_at=? WHERE id=?",
    new Date(Date.now() - 31 * 86400000).toISOString(),
    old.id,
  ).run();
  for (const report of [b, old])
    expect(
      (
        await request(
          `/admin/bugs/${report.id}/restore`,
          "POST",
          {},
          admin.cookie,
        )
      ).status,
    ).toBe(404);
  const list = (await (
    await request("/admin/bugs/deleted", "GET", undefined, admin.cookie)
  ).json()) as { total: number };
  expect(list.total).toBe(0);
});
