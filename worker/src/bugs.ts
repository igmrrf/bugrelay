import { Hono } from "hono";
import { z } from "zod";
import {
  bugInputSchema,
  commentInputSchema,
  statusSchema,
} from "@bugrelay/contracts";
import type { Bug, Comment } from "@bugrelay/contracts";
import {
  audit,
  body,
  challenge,
  fail,
  id,
  now,
  pageResult,
  pagination,
  rateLimit,
  requireUser,
  row,
  rows,
  stmt,
} from "./core";
import type { AppEnv, Ctx, UserRow } from "./types";

export interface BugRow {
  id: string;
  title: string;
  description: string;
  application_id: string;
  application_name: string;
  company_id: string | null;
  company_name: string | null;
  author_id: string | null;
  author_name: string | null;
  category: Bug["category"];
  severity: Bug["severity"];
  visibility: Bug["visibility"];
  status: Bug["status"];
  steps_to_reproduce: string;
  expected_behavior: string;
  actual_behavior: string;
  environment: string;
  created_at: string;
  updated_at: string;
  vote_count: number;
  comment_count: number;
  has_voted: number;
}
export const bugSelect = `SELECT b.*,a.name AS application_name,c.name AS company_name,u.display_name AS author_name,(SELECT count(*) FROM votes v WHERE v.bug_id=b.id) AS vote_count,(SELECT count(*) FROM comments cm WHERE cm.bug_id=b.id AND cm.deleted_at IS NULL) AS comment_count FROM bugs b JOIN applications a ON a.id=b.application_id LEFT JOIN companies c ON c.id=b.company_id LEFT JOIN users u ON u.id=b.author_id`;
// Reused before LIMIT/OFFSET and aggregate counts, never filtered after retrieval.
export function visibility(
  u: UserRow | null,
  alias = "b",
): { sql: string; args: unknown[] } {
  if (u?.is_admin) return { sql: `${alias}.deleted_at IS NULL`, args: [] };
  return {
    sql: `${alias}.deleted_at IS NULL AND (${alias}.visibility='public' OR ${alias}.author_id=? OR EXISTS(SELECT 1 FROM company_members acl JOIN companies ac ON ac.id=acl.company_id WHERE acl.company_id=${alias}.company_id AND acl.user_id=? AND ac.is_verified=1))`,
    args: [u?.id ?? "", u?.email_verified ? u.id : ""],
  };
}
export async function getBug(c: Ctx, bugId: string) {
  const access = visibility(c.get("user"));
  const b = await row<BugRow>(
    c.env,
    `${bugSelect} WHERE b.id=? AND ${access.sql}`,
    bugId,
    ...access.args,
  );
  if (!b) fail(404, "NOT_FOUND", "Report not found.");
  return b;
}
export async function companyMember(
  c: Ctx,
  companyId: string | null,
  admin = false,
) {
  const u = c.get("user");
  if (!u?.email_verified || !companyId) return false;
  return !!(await row(
    c.env,
    `SELECT m.id FROM company_members m JOIN companies c ON c.id=m.company_id WHERE m.company_id=? AND m.user_id=? AND c.is_verified=1 ${admin ? "AND m.role='admin'" : ""}`,
    companyId,
    u.id,
  ));
}
export async function canManage(c: Ctx, b: BugRow) {
  const u = c.get("user");
  return !!u && (!!u.is_admin || (await companyMember(c, b.company_id)));
}
export function canEdit(c: Ctx, b: BugRow) {
  const u = c.get("user");
  return !!u && (!!u.is_admin || u.id === b.author_id);
}
export async function bugDTO(c: Ctx, b: BugRow): Promise<Bug> {
  const [tags, attachments, vote, manage] = await Promise.all([
    rows<{ tag: string }>(
      c.env,
      "SELECT tag FROM bug_tags WHERE bug_id=? ORDER BY tag",
      b.id,
    ),
    rows<{ id: string; name: string; size: number; content_type: string }>(
      c.env,
      "SELECT id,name,size,content_type FROM attachments WHERE bug_id=?",
      b.id,
    ),
    c.get("user")
      ? row(
          c.env,
          "SELECT 1 FROM votes WHERE bug_id=? AND user_id=?",
          b.id,
          c.get("user")!.id,
        )
      : Promise.resolve(null),
    canManage(c, b),
  ]);
  return {
    id: b.id,
    title: b.title,
    description: b.description,
    applicationName: b.application_name,
    companyId: b.company_id,
    companyName: b.company_name,
    category: b.category,
    severity: b.severity,
    visibility: b.visibility,
    status: b.status,
    stepsToReproduce: b.steps_to_reproduce,
    expectedBehavior: b.expected_behavior,
    actualBehavior: b.actual_behavior,
    environment: b.environment,
    tags: tags.map((t) => t.tag),
    voteCount: b.vote_count,
    commentCount: b.comment_count,
    hasUserVoted: !!vote,
    author: b.author_id
      ? { id: b.author_id, displayName: b.author_name ?? "User" }
      : null,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
    attachments: attachments.map((a) => ({
      id: a.id,
      name: a.name,
      size: a.size,
      contentType: a.content_type,
      url: `/api/v1/bugs/${b.id}/attachments/${a.id}`,
    })),
    canEdit: canEdit(c, b),
    canManage: manage,
  };
}
export async function listBugs(c: Ctx, companyId?: string) {
  const p = pagination(c);
  const access = visibility(c.get("user"));
  const conditions = [access.sql];
  const args = [...access.args];
  if (companyId) {
    conditions.push("b.company_id=?");
    args.push(companyId);
  }
  const q = c.req.query("q")?.trim().slice(0, 200);
  if (q) {
    conditions.push(
      "(b.title LIKE ? ESCAPE '\\' OR b.description LIKE ? ESCAPE '\\' OR a.name LIKE ? ESCAPE '\\' OR c.name LIKE ? ESCAPE '\\')",
    );
    const match = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    args.push(match, match, match, match);
  }
  const status = c.req.query("status");
  if (status && statusSchema.safeParse(status).success) {
    conditions.push("b.status=?");
    args.push(status);
  }
  if (c.req.query("mine") === "true") {
    conditions.push("b.author_id=?");
    args.push(requireUser(c, false).id);
  }
  const tag = c.req.query("tag")?.trim().slice(0, 40);
  if (tag) {
    conditions.push(
      "EXISTS(SELECT 1 FROM bug_tags bt WHERE bt.bug_id=b.id AND lower(bt.tag)=lower(?))",
    );
    args.push(tag);
  }
  const companyFilter = c.req.query("companyId");
  if (companyFilter) {
    conditions.push("b.company_id=?");
    args.push(companyFilter);
  }
  const where = conditions.join(" AND ");
  const order =
    c.req.query("sort") === "votes"
      ? "vote_count DESC,b.created_at DESC,b.id DESC"
      : "b.created_at DESC,b.id DESC";
  const [items, total] = await Promise.all([
    rows<BugRow>(
      c.env,
      `${bugSelect} WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
      ...args,
      p.limit,
      p.offset,
    ),
    row<{ n: number }>(
      c.env,
      `SELECT count(*) n FROM bugs b JOIN applications a ON a.id=b.application_id LEFT JOIN companies c ON c.id=b.company_id WHERE ${where}`,
      ...args,
    ),
  ]);
  return c.json(
    pageResult(
      await Promise.all(items.map((b) => bugDTO(c, b))),
      total?.n ?? 0,
      p,
    ),
  );
}
const bugs = new Hono<AppEnv>();
bugs.get("/", (c) => listBugs(c));
bugs.post("/search-duplicates", async (c) => {
  await rateLimit(c, "search", 60, 60);
  const input = await body(
    c,
    z
      .object({
        query: z.string().trim().min(3).max(200),
        companyId: z.string().uuid().optional(),
      })
      .strict(),
  );
  const access = visibility(c.get("user"));
  const words = input.query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 6);
  if (!words.length) return c.json({ duplicates: [] });
  const args: unknown[] = [...access.args];
  let filter = "";
  if (input.companyId) {
    filter = " AND b.company_id=?";
    args.push(input.companyId);
  }
  for (const w of words) args.push(`%${w.replace(/[\\%_]/g, "\\$&")}%`);
  const found = await rows<BugRow>(
    c.env,
    `${bugSelect} WHERE ${access.sql}${filter} AND (${words.map(() => "lower(b.title) LIKE ? ESCAPE '\\'").join(" OR ")}) ORDER BY b.created_at DESC LIMIT 10`,
    ...args,
  );
  return c.json({
    duplicates: found.map((b) => ({
      id: b.id,
      title: b.title,
      status: b.status,
      voteCount: b.vote_count,
      createdAt: b.created_at,
      matchScore:
        words.filter((w) => b.title.toLowerCase().includes(w)).length /
        words.length,
    })),
  });
});
bugs.post("/", async (c) => {
  const u = c.get("user");
  const input = await body(c, bugInputSchema);
  if (input.visibility === "private") requireUser(c);
  await rateLimit(c, "submit", u?.email_verified ? 10 : 5, 3600, u?.id);
  await challenge(c, input.turnstileToken);
  if (
    input.companyId &&
    !(await row(c.env, "SELECT id FROM companies WHERE id=?", input.companyId))
  )
    fail(400, "INVALID_COMPANY", "Company not found.");
  const appId = id(),
    bugId = id(),
    created = now();
  const normalized = input.applicationName.toLowerCase();
  // A product name never grants its reporter ownership of the company.
  const operations = [
    stmt(
      c.env,
      "INSERT INTO applications(id,name,normalized_name,created_at) VALUES(?,?,?,?) ON CONFLICT(normalized_name) DO NOTHING",
      appId,
      input.applicationName,
      normalized,
      created,
    ),
    stmt(
      c.env,
      `INSERT INTO bugs(id,title,description,application_id,company_id,author_id,category,severity,visibility,steps_to_reproduce,expected_behavior,actual_behavior,environment,created_at,updated_at) VALUES(?,?,?,(SELECT id FROM applications WHERE normalized_name=?),?,?,?,?,?,?,?,?,?,?,?)`,
      bugId,
      input.title,
      input.description,
      normalized,
      input.companyId ?? null,
      u?.id ?? null,
      input.category,
      input.severity,
      input.visibility,
      input.stepsToReproduce,
      input.expectedBehavior,
      input.actualBehavior,
      input.environment,
      created,
      created,
    ),
    ...Array.from(new Set(input.tags)).map((tag) =>
      stmt(c.env, "INSERT INTO bug_tags(bug_id,tag) VALUES(?,?)", bugId, tag),
    ),
    audit(c.env, u?.id ?? null, "bug_created", "bug", bugId),
  ];
  await c.env.DB.batch(operations);
  return c.json(await bugDTO(c, await getBug(c, bugId)), 201);
});
bugs.get("/:id", async (c) =>
  c.json(await bugDTO(c, await getBug(c, c.req.param("id")))),
);
bugs.patch("/:id", async (c) => {
  const u = requireUser(c);
  const b = await getBug(c, c.req.param("id"));
  if (!canEdit(c, b))
    fail(
      403,
      "FORBIDDEN",
      "Only the reporter or an administrator can edit this report.",
    );
  const v = await body(
    c,
    z
      .object({
        title: z.string().trim().min(5).max(200).optional(),
        description: z.string().trim().min(20).max(20000).optional(),
        stepsToReproduce: z.string().max(10000).optional(),
        expectedBehavior: z.string().max(5000).optional(),
        actualBehavior: z.string().max(5000).optional(),
        environment: z.string().max(2000).optional(),
      })
      .strict(),
  );
  await c.env.DB.batch([
    stmt(
      c.env,
      "UPDATE bugs SET title=?,description=?,steps_to_reproduce=?,expected_behavior=?,actual_behavior=?,environment=?,updated_at=? WHERE id=?",
      v.title ?? b.title,
      v.description ?? b.description,
      v.stepsToReproduce ?? b.steps_to_reproduce,
      v.expectedBehavior ?? b.expected_behavior,
      v.actualBehavior ?? b.actual_behavior,
      v.environment ?? b.environment,
      now(),
      b.id,
    ),
    audit(c.env, u.id, "bug_updated", "bug", b.id),
  ]);
  return c.json(await bugDTO(c, await getBug(c, b.id)));
});
bugs.delete("/:id", async (c) => {
  const u = requireUser(c);
  const b = await getBug(c, c.req.param("id"));
  if (!canEdit(c, b))
    fail(
      403,
      "FORBIDDEN",
      "Only the reporter or an administrator can delete this report.",
    );
  await c.env.DB.batch([
    stmt(
      c.env,
      "UPDATE bugs SET deleted_at=?,updated_at=? WHERE id=?",
      now(),
      now(),
      b.id,
    ),
    audit(c.env, u.id, "bug_deleted", "bug", b.id),
  ]);
  return c.json({ message: "Report deleted." });
});
bugs.patch("/:id/status", async (c) => {
  const u = requireUser(c);
  const b = await getBug(c, c.req.param("id"));
  if (!(await canManage(c, b)))
    fail(403, "FORBIDDEN", "Company membership required.");
  const v = await body(
    c,
    z
      .object({
        status: statusSchema,
        response: z.string().max(10000).optional(),
      })
      .strict(),
  );
  const time = now();
  const operations = [
    stmt(
      c.env,
      "UPDATE bugs SET status=?,updated_at=? WHERE id=?",
      v.status,
      time,
      b.id,
    ),
    audit(c.env, u.id, "bug_status_changed", "bug", b.id),
  ];
  if (v.response?.trim())
    operations.push(
      stmt(
        c.env,
        "INSERT INTO comments(id,bug_id,author_id,content,created_at,updated_at) VALUES(?,?,?,?,?,?)",
        id(),
        b.id,
        u.id,
        v.response.trim(),
        time,
        time,
      ),
    );
  await c.env.DB.batch(operations);
  return c.json(await bugDTO(c, await getBug(c, b.id)));
});
for (const method of ["post", "delete"] as const)
  bugs[method]("/:id/vote", async (c) => {
    const u = requireUser(c);
    const b = await getBug(c, c.req.param("id"));
    await rateLimit(c, "vote", 100, 60, u.id);
    await (
      method === "post"
        ? stmt(
            c.env,
            "INSERT INTO votes(bug_id,user_id,created_at) VALUES(?,?,?) ON CONFLICT DO NOTHING",
            b.id,
            u.id,
            now(),
          )
        : stmt(
            c.env,
            "DELETE FROM votes WHERE bug_id=? AND user_id=?",
            b.id,
            u.id,
          )
    ).run();
    return c.json({
      voteCount: (await row<{ n: number }>(
        c.env,
        "SELECT count(*) n FROM votes WHERE bug_id=?",
        b.id,
      ))!.n,
      hasUserVoted: method === "post",
    });
  });
interface CommentRow {
  id: string;
  bug_id: string;
  author_id: string;
  display_name: string;
  content: string;
  created_at: string;
  updated_at: string;
}
const commentDTO = (c: Ctx, v: CommentRow): Comment => ({
  id: v.id,
  bugId: v.bug_id,
  content: v.content,
  author: { id: v.author_id, displayName: v.display_name },
  createdAt: v.created_at,
  updatedAt: v.updated_at,
  canEdit: c.get("user")?.id === v.author_id || !!c.get("user")?.is_admin,
});
bugs.get("/:id/comments", async (c) => {
  const b = await getBug(c, c.req.param("id"));
  const p = pagination(c);
  const items = await rows<CommentRow>(
    c.env,
    "SELECT cm.*,u.display_name FROM comments cm JOIN users u ON u.id=cm.author_id WHERE bug_id=? AND deleted_at IS NULL ORDER BY created_at,id LIMIT ? OFFSET ?",
    b.id,
    p.limit,
    p.offset,
  );
  return c.json(
    pageResult(
      items.map((v) => commentDTO(c, v)),
      b.comment_count,
      p,
    ),
  );
});
bugs.post("/:id/comments", async (c) => {
  const u = requireUser(c);
  const b = await getBug(c, c.req.param("id"));
  await rateLimit(c, "comment", 30, 3600, u.id);
  const v = await body(c, commentInputSchema);
  const cid = id(),
    time = now();
  await stmt(
    c.env,
    "INSERT INTO comments(id,bug_id,author_id,content,created_at,updated_at) VALUES(?,?,?,?,?,?)",
    cid,
    b.id,
    u.id,
    v.content,
    time,
    time,
  ).run();
  return c.json(
    commentDTO(c, {
      id: cid,
      bug_id: b.id,
      author_id: u.id,
      display_name: u.display_name,
      content: v.content,
      created_at: time,
      updated_at: time,
    }),
    201,
  );
});
for (const method of ["patch", "delete"] as const)
  bugs[method]("/:id/comments/:commentId", async (c) => {
    const u = requireUser(c);
    const b = await getBug(c, c.req.param("id"));
    const cm = await row<CommentRow>(
      c.env,
      "SELECT cm.*,u.display_name FROM comments cm JOIN users u ON u.id=cm.author_id WHERE cm.id=? AND cm.bug_id=? AND cm.deleted_at IS NULL",
      c.req.param("commentId"),
      b.id,
    );
    if (!cm) fail(404, "NOT_FOUND", "Comment not found.");
    if (cm.author_id !== u.id && !u.is_admin)
      fail(403, "FORBIDDEN", "You cannot change this comment.");
    if (method === "delete") {
      await stmt(
        c.env,
        "UPDATE comments SET deleted_at=? WHERE id=?",
        now(),
        cm.id,
      ).run();
      return c.json({ message: "Comment deleted." });
    }
    const v = await body(c, commentInputSchema);
    await stmt(
      c.env,
      "UPDATE comments SET content=?,updated_at=? WHERE id=?",
      v.content,
      now(),
      cm.id,
    ).run();
    return c.json(
      commentDTO(c, { ...cm, content: v.content, updated_at: now() }),
    );
  });
bugs.post("/:id/report", async (c) => {
  const u = requireUser(c);
  const b = await getBug(c, c.req.param("id"));
  await rateLimit(c, "report", 10, 3600, u.id);
  const v = await body(
    c,
    z.object({ reason: z.string().trim().min(5).max(1000) }).strict(),
  );
  await stmt(
    c.env,
    "INSERT INTO moderation(id,bug_id,reporter_id,reason,created_at) VALUES(?,?,?,?,?) ON CONFLICT(bug_id,reporter_id) DO NOTHING",
    id(),
    b.id,
    u.id,
    v.reason,
    now(),
  ).run();
  return c.json({ message: "Report sent for moderation." });
});
export default bugs;
