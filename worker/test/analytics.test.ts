import { beforeEach, expect, test } from "vitest";
import { bindings, bug, company, request, setup, user } from "./helpers";
import { stmt } from "../src/core";
beforeEach(setup);
test("resolution time is set once, cleared on reopening and recomputed on later closure", async () => {
  const reporter = await user(),
    team = await user("team@analytics.example"),
    cid = await company(team, "analytics.example"),
    b = await bug(reporter.cookie, { companyId: cid });
  const started = Date.now();
  const first = (await (
    await request(
      `/bugs/${b.id}/status`,
      "PATCH",
      { status: "resolved" },
      team.cookie,
    )
  ).json()) as { resolvedAt: string };
  expect(Date.parse(first.resolvedAt)).toBeGreaterThanOrEqual(started);
  const previous = "2026-01-01T00:00:00.000Z";
  await stmt(
    bindings,
    "UPDATE bugs SET resolved_at=? WHERE id=?",
    previous,
    b.id,
  ).run();
  const repeat = (await (
    await request(
      `/bugs/${b.id}/status`,
      "PATCH",
      { status: "closed" },
      team.cookie,
    )
  ).json()) as { resolvedAt: string };
  expect(repeat.resolvedAt).toBe(previous);
  const reopen = (await (
    await request(
      `/bugs/${b.id}/status`,
      "PATCH",
      { status: "open" },
      team.cookie,
    )
  ).json()) as { resolvedAt: null };
  expect(reopen.resolvedAt).toBeNull();
  const again = (await (
    await request(
      `/bugs/${b.id}/status`,
      "PATCH",
      { status: "resolved" },
      team.cookie,
    )
  ).json()) as { resolvedAt: string };
  expect(Date.parse(again.resolvedAt)).toBeGreaterThanOrEqual(started);
});
test("resolution averages include only accessible nondeleted company reports and bulk status follows the same rule", async () => {
  const owner = await user(),
    team = await user("team@analytics.example"),
    stranger = await user("other@example.com"),
    admin = await user("admin@example.com", true),
    cid = await company(team, "analytics.example");
  const pub = await bug(owner.cookie, { companyId: cid }),
    priv = await bug(owner.cookie, { companyId: cid, visibility: "private" }),
    deleted = await bug(owner.cookie, { companyId: cid });
  for (const [b, hours] of [
    [pub, 2],
    [priv, 4],
    [deleted, 99],
  ] as const)
    await stmt(
      bindings,
      "UPDATE bugs SET status='resolved',created_at='2026-01-01T00:00:00.000Z',resolved_at=? WHERE id=?",
      new Date(Date.UTC(2026, 0, 1) + hours * 3600000).toISOString(),
      b.id,
    ).run();
  await request(`/bugs/${deleted.id}`, "DELETE", undefined, owner.cookie);
  const stats = (await (
    await request(`/companies/${cid}/analytics`, "GET", undefined, team.cookie)
  ).json()) as { resolvedBugCount: number; averageResolutionHours: number };
  expect(stats.resolvedBugCount).toBe(2);
  expect(stats.averageResolutionHours).toBeCloseTo(3, 5);
  expect(
    (
      await request(
        `/companies/${cid}/analytics`,
        "GET",
        undefined,
        stranger.cookie,
      )
    ).status,
  ).toBe(403);
  await request(
    "/admin/bugs/bulk/status",
    "PATCH",
    { bugIds: [pub.id, priv.id], status: "open" },
    admin.cookie,
  );
  expect(
    await stmt(
      bindings,
      "SELECT resolved_at FROM bugs WHERE id=?",
      pub.id,
    ).first("resolved_at"),
  ).toBeNull();
  expect(
    await (
      await request(
        `/companies/${cid}/analytics`,
        "GET",
        undefined,
        team.cookie,
      )
    ).json(),
  ).toMatchObject({ resolvedBugCount: 0, averageResolutionHours: null });
  await request(
    "/admin/bugs/bulk/status",
    "PATCH",
    { bugIds: [pub.id], status: "resolved" },
    admin.cookie,
  );
  expect(
    await stmt(
      bindings,
      "SELECT resolved_at FROM bugs WHERE id=?",
      pub.id,
    ).first("resolved_at"),
  ).not.toBeNull();
});
