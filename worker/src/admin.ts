import { Hono } from "hono";
import { z } from "zod";
import { statusSchema } from "@bugrelay/contracts";
import {
  audit,
  body,
  fail,
  now,
  pageResult,
  pagination,
  requireAdmin,
  row,
  rows,
  stmt,
} from "./core";
import { bugDTO, getBug } from "./bugs";
import type { AppEnv } from "./types";
import companyClaims from "./company-claims";
const admin = new Hono<AppEnv>();
// This guard terminates before dispatching any handler, including reads and exports.
admin.use("*", async (c, next) => {
  requireAdmin(c);
  await next();
});
admin.route("/company-claims", companyClaims);
admin.get("/stats", async (c) => {
  const values = await c.env.DB.batch<{ n: number }>(
    [
      "SELECT count(*) n FROM users",
      "SELECT count(*) n FROM bugs WHERE deleted_at IS NULL",
      "SELECT count(*) n FROM companies",
      "SELECT count(*) n FROM companies WHERE is_verified=1",
      "SELECT count(*) n FROM moderation WHERE status='pending'",
    ].map((sql) => stmt(c.env, sql)),
  );
  return c.json({
    totalUsers: values[0].results[0].n,
    totalBugs: values[1].results[0].n,
    totalCompanies: values[2].results[0].n,
    verifiedCompanies: values[3].results[0].n,
    pendingModerations: values[4].results[0].n,
  });
});
admin.get("/users", async (c) => {
  const p = pagination(c);
  const q = c.req.query("q")?.slice(0, 200) ?? "";
  const list = await rows<{
    id: string;
    email: string;
    display_name: string;
    is_admin: number;
    email_verified: number;
    suspended: number;
    created_at: string;
  }>(
    c.env,
    "SELECT id,email,display_name,is_admin,email_verified,suspended,created_at FROM users WHERE email LIKE ? OR display_name LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
    `%${q}%`,
    `%${q}%`,
    p.limit,
    p.offset,
  );
  const count = await row<{ n: number }>(
    c.env,
    "SELECT count(*) n FROM users WHERE email LIKE ? OR display_name LIKE ?",
    `%${q}%`,
    `%${q}%`,
  );
  return c.json(
    pageResult(
      list.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.display_name,
        isAdmin: !!u.is_admin,
        isEmailVerified: !!u.email_verified,
        isSuspended: !!u.suspended,
        createdAt: u.created_at,
      })),
      count!.n,
      p,
    ),
  );
});
admin.patch("/users/:id/role", async (c) => {
  const u = requireAdmin(c);
  const v = await body(c, z.object({ isAdmin: z.boolean() }).strict());
  if (
    v.isAdmin &&
    !(await row(
      c.env,
      "SELECT id FROM users WHERE id=? AND email_verified=1 AND suspended=0",
      c.req.param("id"),
    ))
  )
    fail(400, "INVALID_USER", "Administrator must be verified and active.");
  await c.env.DB.batch([
    stmt(
      c.env,
      "UPDATE users SET is_admin=?,updated_at=? WHERE id=?",
      Number(v.isAdmin),
      now(),
      c.req.param("id"),
    ),
    audit(c.env, u.id, "admin_role_changed", "user", c.req.param("id")),
  ]);
  return c.json({ message: "Role updated." });
});
admin.post("/users/:id/suspend", async (c) => {
  const u = requireAdmin(c);
  if (u.id === c.req.param("id"))
    fail(400, "SELF_SUSPEND", "You cannot suspend yourself.");
  await c.env.DB.batch([
    stmt(
      c.env,
      "UPDATE users SET suspended=1,updated_at=? WHERE id=?",
      now(),
      c.req.param("id"),
    ),
    stmt(c.env, "DELETE FROM sessions WHERE user_id=?", c.req.param("id")),
    audit(c.env, u.id, "user_suspended", "user", c.req.param("id")),
  ]);
  return c.json({ message: "User suspended and sessions revoked." });
});
admin.post("/users/:id/unsuspend", async (c) => {
  const u = requireAdmin(c);
  await c.env.DB.batch([
    stmt(
      c.env,
      "UPDATE users SET suspended=0,updated_at=? WHERE id=?",
      now(),
      c.req.param("id"),
    ),
    audit(c.env, u.id, "user_unsuspended", "user", c.req.param("id")),
  ]);
  return c.json({ message: "User restored." });
});
admin.patch("/companies/:id/verify", async (c) => {
  const u = requireAdmin(c);
  const v = await body(c, z.object({ verified: z.boolean() }).strict());
  if (
    v.verified &&
    !(await row(
      c.env,
      "SELECT m.id FROM company_members m JOIN users u ON u.id=m.user_id WHERE m.company_id=? AND m.role='admin' AND u.email_verified=1 AND u.suspended=0",
      c.req.param("id"),
    ))
  )
    fail(
      400,
      "ADMIN_REQUIRED",
      "Company needs a verified administrator before it can be verified.",
    );
  await c.env.DB.batch([
    stmt(
      c.env,
      "UPDATE companies SET is_verified=?,updated_at=? WHERE id=?",
      Number(v.verified),
      now(),
      c.req.param("id"),
    ),
    audit(
      c.env,
      u.id,
      "company_verification_changed",
      "company",
      c.req.param("id"),
    ),
  ]);
  return c.json({ message: "Verification updated." });
});
admin.get("/moderation", async (c) => {
  const p = pagination(c);
  const status = z
    .enum(["pending", "approved", "rejected"])
    .catch("pending")
    .parse(c.req.query("status"));
  const list = await rows(
    c.env,
    "SELECT m.id,m.bug_id AS bugId,m.comment_id AS commentId,CASE WHEN cm.deleted_at IS NULL THEN cm.content ELSE NULL END AS commentContent,m.reason,m.status,m.created_at AS createdAt,b.title FROM moderation m JOIN bugs b ON b.id=m.bug_id LEFT JOIN comments cm ON cm.id=m.comment_id WHERE m.status=? ORDER BY m.created_at LIMIT ? OFFSET ?",
    status,
    p.limit,
    p.offset,
  );
  const total = await row<{ n: number }>(
    c.env,
    "SELECT count(*) n FROM moderation WHERE status=?",
    status,
  );
  return c.json(pageResult(list, total!.n, p));
});
admin.post("/moderation/:id", async (c) => {
  const u = requireAdmin(c);
  const v = await body(
    c,
    z.object({ action: z.enum(["approve", "reject", "delete"]) }).strict(),
  );
  const item = await row<{
    bug_id: string;
    comment_id: string | null;
    status: string;
  }>(
    c.env,
    "SELECT bug_id,comment_id,status FROM moderation WHERE id=?",
    c.req.param("id"),
  );
  if (!item) fail(404, "NOT_FOUND", "Moderation item not found.");
  if (item.status !== "pending")
    fail(409, "ALREADY_REVIEWED", "This item has already been reviewed.");
  const time = now();
  const operations = [
    stmt(
      c.env,
      "UPDATE moderation SET status=?,reviewed_at=? WHERE id=? AND status='pending'",
      v.action === "reject" ? "rejected" : "approved",
      time,
      c.req.param("id"),
    ),
    audit(
      c.env,
      u.id,
      `moderation_${v.action}`,
      item.comment_id ? "comment" : "bug",
      item.comment_id ?? item.bug_id,
    ),
  ];
  if (v.action === "delete")
    operations.unshift(
      stmt(
        c.env,
        `UPDATE ${item.comment_id ? "comments" : "bugs"} SET deleted_at=?,updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM moderation WHERE id=? AND status='pending')`,
        time,
        time,
        item.comment_id ?? item.bug_id,
        c.req.param("id"),
      ),
    );
  await c.env.DB.batch(operations);
  return c.json({ message: "Moderation saved." });
});
admin.get("/bugs/deleted", async (c) => {
  const p = pagination(c);
  const where =
    "deleted_at IS NOT NULL AND merged_into IS NULL AND deleted_at>?";
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  const items = await rows(
    c.env,
    `SELECT id,title,visibility,deleted_at AS deletedAt FROM bugs WHERE ${where} ORDER BY deleted_at DESC,id LIMIT ? OFFSET ?`,
    cutoff,
    p.limit,
    p.offset,
  );
  const count = await row<{ n: number }>(
    c.env,
    `SELECT count(*) n FROM bugs WHERE ${where}`,
    cutoff,
  );
  return c.json(pageResult(items, count!.n, p));
});
admin.post("/bugs/:id/restore", async (c) => {
  const u = requireAdmin(c);
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  const result = await stmt(
    c.env,
    "UPDATE bugs SET deleted_at=NULL,updated_at=? WHERE id=? AND deleted_at>? AND merged_into IS NULL RETURNING id",
    now(),
    c.req.param("id"),
    cutoff,
  ).first();
  if (!result)
    fail(404, "NOT_RESTORABLE", "Report is not available for restoration.");
  await audit(c.env, u.id, "bug_restored", "bug", c.req.param("id")).run();
  return c.json({
    message: "Report restored with its original visibility and ownership.",
  });
});
admin.post("/bugs/merge", async (c) => {
  const u = requireAdmin(c);
  const v = await body(
    c,
    z
      .object({
        primaryBugId: z.string().uuid(),
        duplicateBugIds: z.array(z.string().uuid()).min(1).max(20),
      })
      .strict(),
  );
  const primary = await getBug(c, v.primaryBugId);
  const ids = [...new Set(v.duplicateBugIds)];
  if (ids.includes(primary.id))
    fail(
      400,
      "INVALID_MERGE",
      "The primary report cannot also be a duplicate.",
    );
  const duplicates = await Promise.all(ids.map((id) => getBug(c, id)));
  if (
    duplicates.some(
      (b) =>
        b.visibility !== primary.visibility ||
        b.company_id !== primary.company_id ||
        (b.visibility === "private" && b.author_id !== primary.author_id),
    )
  )
    fail(
      400,
      "UNSAFE_MERGE",
      "Merge reports only when visibility, company and private-report owner match.",
    );
  const placeholders = ids.map(() => "?").join(",");
  const total = await row<{ n: number }>(
    c.env,
    `SELECT count(*) n FROM attachments WHERE bug_id IN (?,${placeholders})`,
    primary.id,
    ...ids,
  );
  if (total!.n > 5)
    fail(
      400,
      "ATTACHMENT_LIMIT",
      "Remove excess attachments before merging (maximum five).",
    );
  const time = now();
  await c.env.DB.batch([
    stmt(
      c.env,
      `INSERT INTO votes(bug_id,user_id,created_at) SELECT ?,user_id,min(created_at) FROM votes WHERE bug_id IN (${placeholders}) GROUP BY user_id ON CONFLICT DO NOTHING`,
      primary.id,
      ...ids,
    ),
    stmt(c.env, `DELETE FROM votes WHERE bug_id IN (${placeholders})`, ...ids),
    stmt(
      c.env,
      `UPDATE comments SET bug_id=? WHERE bug_id IN (${placeholders})`,
      primary.id,
      ...ids,
    ),
    stmt(
      c.env,
      `DELETE FROM moderation WHERE comment_id IS NULL AND bug_id IN (${placeholders}) AND reporter_id IN (SELECT reporter_id FROM moderation WHERE bug_id=? AND comment_id IS NULL)`,
      ...ids,
      primary.id,
    ),
    stmt(
      c.env,
      `DELETE FROM moderation WHERE comment_id IS NULL AND bug_id IN (${placeholders}) AND id NOT IN (SELECT min(id) FROM moderation WHERE comment_id IS NULL AND bug_id IN (${placeholders}) GROUP BY reporter_id)`,
      ...ids,
      ...ids,
    ),
    stmt(
      c.env,
      `UPDATE moderation SET bug_id=? WHERE bug_id IN (${placeholders})`,
      primary.id,
      ...ids,
    ),
    stmt(
      c.env,
      `UPDATE attachments SET bug_id=? WHERE bug_id IN (${placeholders})`,
      primary.id,
      ...ids,
    ),
    stmt(
      c.env,
      `UPDATE bugs SET deleted_at=?,updated_at=?,merged_into=? WHERE id IN (${placeholders})`,
      time,
      time,
      primary.id,
      ...ids,
    ),
    stmt(c.env, "UPDATE bugs SET updated_at=? WHERE id=?", time, primary.id),
    audit(c.env, u.id, "bugs_merged", "bug", primary.id),
  ]);
  return c.json(await bugDTO(c, await getBug(c, primary.id)));
});
admin.patch("/bugs/bulk/status", async (c) => {
  const u = requireAdmin(c);
  const v = await body(
    c,
    z
      .object({
        bugIds: z.array(z.string().uuid()).min(1).max(50),
        status: statusSchema,
      })
      .strict(),
  );
  await c.env.DB.batch([
    ...v.bugIds.map((id) =>
      stmt(
        c.env,
        "UPDATE bugs SET status=?,updated_at=?,resolved_at=CASE WHEN ? IN ('resolved','closed') THEN COALESCE(resolved_at,?) ELSE NULL END WHERE id=? AND deleted_at IS NULL",
        v.status,
        now(),
        v.status,
        now(),
        id,
      ),
    ),
    ...v.bugIds.map((id) =>
      audit(c.env, u.id, "bug_status_changed", "bug", id),
    ),
  ]);
  return c.json({ message: "Reports updated." });
});
admin.get("/audit-logs", async (c) => {
  const p = pagination(c);
  const list = await rows(
    c.env,
    "SELECT id,actor_id AS actorId,action,entity_type AS entityType,entity_id AS entityId,created_at AS createdAt FROM audit_logs ORDER BY created_at DESC LIMIT ? OFFSET ?",
    p.limit,
    p.offset,
  );
  const total = await row<{ n: number }>(
    c.env,
    "SELECT count(*) n FROM audit_logs",
  );
  return c.json(pageResult(list, total!.n, p));
});
export const csvCell = (v: unknown) =>
  `"${String(v ?? "")
    .replace(/^[=+\-@\t\r]/, "'$&")
    .replace(/"/g, '""')}"`;
admin.get("/export/audit-logs", async (c) => {
  const list = await rows<Record<string, unknown>>(
    c.env,
    "SELECT id,actor_id,action,entity_type,entity_id,created_at FROM audit_logs ORDER BY created_at DESC LIMIT 10000",
  );
  if (c.req.query("format") === "json") return c.json(list);
  const keys = [
    "id",
    "actor_id",
    "action",
    "entity_type",
    "entity_id",
    "created_at",
  ];
  return new Response(
    [
      keys.join(","),
      ...list.map((v) => keys.map((k) => csvCell(v[k])).join(",")),
    ].join("\r\n"),
    {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="bugrelay-audit.csv"',
        "Cache-Control": "no-store",
      },
    },
  );
});
export default admin;
