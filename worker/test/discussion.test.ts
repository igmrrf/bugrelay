import { beforeEach, expect, test } from "vitest";
import { bindings, bug, company, request, setup, user } from "./helpers";
import { row, stmt } from "../src/core";
import type { Comment, Page } from "@bugrelay/contracts";
beforeEach(setup);
async function comment(
  b: string,
  cookie: string,
  content = "A reproducible comment",
  parent?: string,
) {
  const r = await request(
    `/bugs/${b}/comments${parent ? `/${parent}/replies` : ""}`,
    "POST",
    { content },
    cookie,
  );
  expect(r.status).toBe(201);
  return (await r.json()) as Comment;
}
test("threads paginate siblings, reject foreign/deleted parents, and retain safe tombstones", async () => {
  const u = await user(),
    b = await bug(u.cookie),
    other = await bug(u.cookie),
    root = await comment(b.id, u.cookie),
    reply = await comment(b.id, u.cookie, "A reply", root.id);
  expect(reply).toMatchObject({ parentId: root.id, depth: 1 });
  await comment(b.id, u.cookie, "Second reply", root.id);
  expect(
    (
      await request(
        `/bugs/${other.id}/comments/${root.id}/replies`,
        "POST",
        { content: "Wrong report" },
        u.cookie,
      )
    ).status,
  ).toBe(404);
  const top = (await (
    await request(`/bugs/${b.id}/comments`)
  ).json()) as Page<Comment>;
  expect(top.total).toBe(1);
  expect(top.items[0].replyCount).toBe(2);
  const one = (await (
    await request(`/bugs/${b.id}/comments?parentId=${root.id}&limit=1`)
  ).json()) as Page<Comment>;
  expect(one.total).toBe(2);
  expect(one.items).toHaveLength(1);
  expect(one.hasNextPage).toBe(true);
  const two = (await (
    await request(`/bugs/${b.id}/comments?parentId=${root.id}&limit=1&page=2`)
  ).json()) as Page<Comment>;
  expect(one.items[0].id).not.toBe(two.items[0].id);
  await request(
    `/bugs/${b.id}/comments/${root.id}`,
    "DELETE",
    undefined,
    u.cookie,
  );
  const deleted = (await (
    await request(`/bugs/${b.id}/comments`)
  ).json()) as Page<Comment>;
  expect(deleted.items[0]).toMatchObject({
    isDeleted: true,
    content: "[Deleted comment]",
    canEdit: false,
    replyCount: 2,
  });
  expect(JSON.stringify(deleted)).not.toContain("A reproducible comment");
  expect(
    (
      await request(
        `/bugs/${b.id}/comments/${root.id}/replies`,
        "POST",
        { content: "New reply" },
        u.cookie,
      )
    ).status,
  ).toBe(404);
  expect(
    (
      (await (
        await request(`/bugs/${b.id}/comments?parentId=${root.id}`)
      ).json()) as Page<Comment>
    ).total,
  ).toBe(2);
});
test("reply depth is bounded without accepting client supplied author, depth or parent", async () => {
  const u = await user(),
    b = await bug(u.cookie);
  let cm = await comment(b.id, u.cookie);
  for (let depth = 1; depth <= 5; depth++) {
    cm = await comment(b.id, u.cookie, `Depth ${depth}`, cm.id);
    expect(cm.depth).toBe(depth);
  }
  expect(
    (
      await request(
        `/bugs/${b.id}/comments/${cm.id}/replies`,
        "POST",
        { content: "Too deep" },
        u.cookie,
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await request(
        `/bugs/${b.id}/comments`,
        "POST",
        { content: "Injected", parentId: cm.id, authorId: u.id },
        u.cookie,
      )
    ).status,
  ).toBe(400);
});
test("private reply and comment-flag surfaces deny strangers and revoked company members", async () => {
  const owner = await user(),
    team = await user("team@private.example"),
    stranger = await user("stranger@example.com"),
    cid = await company(team, "private.example");
  const b = await bug(owner.cookie, { visibility: "private", companyId: cid }),
    cm = await comment(b.id, owner.cookie);
  for (const cookie of [undefined, stranger.cookie]) {
    expect(
      (
        await request(
          `/bugs/${b.id}/comments?parentId=${cm.id}`,
          "GET",
          undefined,
          cookie,
        )
      ).status,
    ).toBe(404);
    for (const action of ["replies", "report"])
      expect([401, 404]).toContain(
        (
          await request(
            `/bugs/${b.id}/comments/${cm.id}/${action}`,
            "POST",
            action === "replies"
              ? { content: "Forbidden" }
              : { reason: "Forbidden flag" },
            cookie,
          )
        ).status,
      );
  }
  await request(
    `/bugs/${b.id}/comments/${cm.id}/report`,
    "POST",
    { reason: "An authorized flag" },
    team.cookie,
  );
  await stmt(
    bindings,
    "UPDATE companies SET is_verified=0 WHERE id=?",
    cid,
  ).run();
  expect(
    (
      await request(
        `/bugs/${b.id}/comments?parentId=${cm.id}`,
        "GET",
        undefined,
        team.cookie,
      )
    ).status,
  ).toBe(404);
  expect(
    (
      await request(
        `/bugs/${b.id}/comments/${cm.id}/report`,
        "POST",
        { reason: "After revocation" },
        team.cookie,
      )
    ).status,
  ).toBe(404);
});
test("comment moderation is idempotent, independently scoped and cannot delete the report or replies", async () => {
  const u = await user(),
    admin = await user("admin@example.com", true),
    b = await bug(u.cookie),
    cm = await comment(b.id, u.cookie),
    child = await comment(b.id, u.cookie, "Keep this reply", cm.id);
  for (let i = 0; i < 2; i++)
    expect(
      (
        await request(
          `/bugs/${b.id}/comments/${cm.id}/report`,
          "POST",
          { reason: "Moderate this comment" },
          u.cookie,
        )
      ).status,
    ).toBe(200);
  await request(
    `/bugs/${b.id}/report`,
    "POST",
    { reason: "Separate report flag" },
    u.cookie,
  );
  const list = (await (
    await request("/admin/moderation", "GET", undefined, admin.cookie)
  ).json()) as Page<{
    id: string;
    commentId: string | null;
    commentContent: string | null;
  }>;
  expect(list.total).toBe(2);
  const flag = list.items.find((m) => m.commentId === cm.id)!;
  expect(flag.commentContent).toBe(cm.content);
  expect(
    (
      await request(
        `/admin/moderation/${flag.id}`,
        "POST",
        { action: "delete" },
        u.cookie,
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await request(
        `/admin/moderation/${flag.id}`,
        "POST",
        { action: "delete" },
        admin.cookie,
      )
    ).status,
  ).toBe(200);
  expect(
    (await request(`/bugs/${b.id}`, "GET", undefined, u.cookie)).status,
  ).toBe(200);
  expect(
    await stmt(
      bindings,
      "SELECT deleted_at FROM comments WHERE id=?",
      child.id,
    ).first("deleted_at"),
  ).toBeNull();
  expect(
    await row<{ entity_type: string; entity_id: string }>(
      bindings,
      "SELECT entity_type,entity_id FROM audit_logs WHERE action='moderation_delete'",
    ),
  ).toEqual({ entity_type: "comment", entity_id: cm.id });
});
test("merging moves thread structure and pending comment flags to the same authorized report", async () => {
  const u = await user(),
    admin = await user("admin@example.com", true),
    a = await bug(u.cookie),
    b = await bug(u.cookie),
    cm = await comment(b.id, u.cookie);
  await comment(b.id, u.cookie, "Keep relationship", cm.id);
  await request(
    `/bugs/${b.id}/comments/${cm.id}/report`,
    "POST",
    { reason: "Review after merge" },
    u.cookie,
  );
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
  expect(
    await stmt(
      bindings,
      "SELECT bug_id FROM moderation WHERE comment_id=?",
      cm.id,
    ).first("bug_id"),
  ).toBe(a.id);
  const threads = (await (
    await request(`/bugs/${a.id}/comments`)
  ).json()) as Page<Comment>;
  expect(threads.items[0].replyCount).toBe(1);
  expect(
    (await request(`/bugs/${b.id}/comments?parentId=${cm.id}`)).status,
  ).toBe(404);
});
test("merging several flagged duplicates keeps one report flag per reporter on the primary", async () => {
  const u = await user(),
    admin = await user("admin@example.com", true),
    a = await bug(u.cookie),
    b = await bug(u.cookie),
    c = await bug(u.cookie);
  for (const report of [b, c])
    await request(
      `/bugs/${report.id}/report`,
      "POST",
      { reason: "Review this duplicate" },
      u.cookie,
    );
  expect(
    (
      await request(
        "/admin/bugs/merge",
        "POST",
        { primaryBugId: a.id, duplicateBugIds: [b.id, c.id] },
        admin.cookie,
      )
    ).status,
  ).toBe(200);
  const flags = (await (
    await request("/admin/moderation", "GET", undefined, admin.cookie)
  ).json()) as Page<{ bugId: string }>;
  expect(flags.total).toBe(1);
  expect(flags.items[0].bugId).toBe(a.id);
});
