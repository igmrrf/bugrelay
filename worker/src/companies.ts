import { Hono } from "hono";
import { z } from "zod";
import { companyInputSchema, emailSchema } from "@bugrelay/contracts";
import type { Company } from "@bugrelay/contracts";
import {
  audit,
  body,
  digest,
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
import { companyMember, listBugs, visibility } from "./bugs";
import { sendActionEmail } from "./email";
import type { AppEnv, Ctx, UserRow } from "./types";
interface CompanyRow {
  id: string;
  name: string;
  domain: string;
  description: string;
  is_verified: number;
  created_at: string;
  updated_at: string;
  bug_count: number;
}
export function companyDTO(v: CompanyRow): Company {
  return {
    id: v.id,
    name: v.name,
    domain: v.domain,
    description: v.description,
    isVerified: !!v.is_verified,
    createdAt: v.created_at,
    updatedAt: v.updated_at,
    bugCount: v.bug_count ?? 0,
  };
}
export async function getCompany(c: Ctx, companyId: string) {
  const a = visibility(c.get("user"));
  const v = await row<CompanyRow>(
    c.env,
    `SELECT c.*,(SELECT count(*) FROM bugs b WHERE b.company_id=c.id AND ${a.sql}) bug_count FROM companies c WHERE c.id=?`,
    ...a.args,
    companyId,
  );
  if (!v) fail(404, "NOT_FOUND", "Company not found.");
  return v;
}
async function requireCompanyAdmin(c: Ctx, companyId: string) {
  const u = requireUser(c);
  await getCompany(c, companyId);
  if (!u.is_admin && !(await companyMember(c, companyId, true)))
    fail(403, "FORBIDDEN", "Company administrator access required.");
  return u;
}
const companies = new Hono<AppEnv>();
companies.get("/", async (c) => {
  const p = pagination(c);
  const q = c.req.query("q")?.trim().slice(0, 200) ?? "";
  const a = visibility(c.get("user"));
  const filter = q ? " WHERE (c.name LIKE ? OR c.domain LIKE ?)" : "";
  const qargs = q ? [`%${q}%`, `%${q}%`] : [];
  const list = await rows<CompanyRow>(
    c.env,
    `SELECT c.*,(SELECT count(*) FROM bugs b WHERE b.company_id=c.id AND ${a.sql}) bug_count FROM companies c${filter} ORDER BY c.name,c.id LIMIT ? OFFSET ?`,
    ...a.args,
    ...qargs,
    p.limit,
    p.offset,
  );
  const total = await row<{ n: number }>(
    c.env,
    `SELECT count(*) n FROM companies c${filter}`,
    ...qargs,
  );
  return c.json(pageResult(list.map(companyDTO), total!.n, p));
});
companies.post("/", async (c) => {
  const u = requireUser(c);
  await rateLimit(c, "create-company", 5, 3600, u.id);
  const v = await body(c, companyInputSchema);
  const existing = await row<{ id: string }>(
    c.env,
    "SELECT id FROM companies WHERE domain=?",
    v.domain,
  );
  if (existing) return c.json(companyDTO(await getCompany(c, existing.id)));
  const cid = id(),
    time = now();
  await c.env.DB.batch([
    stmt(
      c.env,
      "INSERT INTO companies(id,name,domain,description,created_at,updated_at) VALUES(?,?,?,?,?,?)",
      cid,
      v.name,
      v.domain,
      v.description,
      time,
      time,
    ),
    audit(c.env, u.id, "company_created", "company", cid),
  ]);
  return c.json(companyDTO(await getCompany(c, cid)), 201);
});
companies.get("/:id", async (c) =>
  c.json(companyDTO(await getCompany(c, c.req.param("id")))),
);
companies.get("/:id/bugs", (c) => listBugs(c, c.req.param("id")));
companies.post("/:id/claim", async (c) => {
  const u = requireUser(c);
  const company = await getCompany(c, c.req.param("id"));
  await rateLimit(c, "company-claim", 3, 3600, u.id);
  if (
    company.is_verified ||
    (await row(
      c.env,
      "SELECT id FROM company_members WHERE company_id=? LIMIT 1",
      company.id,
    ))
  )
    fail(
      409,
      "ALREADY_CLAIMED",
      "This company is already verified. Ask its administrator to invite you.",
    );
  requireWorkMailbox(u, company.domain);
  if (
    await row(
      c.env,
      "SELECT id FROM company_claims WHERE company_id=? AND user_id=? AND status='pending'",
      company.id,
      u.id,
    )
  )
    fail(
      409,
      "CLAIM_PENDING",
      "Your mailbox is verified. Your company claim is awaiting administrator review.",
    );
  await sendActionEmail(c.env, u, "claim", company.id);
  return c.json({
    message: "A verification link has been sent to your work email.",
  });
});
// This is a small abuse filter only. The administrator review below is the
// authorization boundary even for public-mail domains missing from this list.
function requireWorkMailbox(u: UserRow, domain: string) {
  const publicDomains = new Set([
    "gmail.com",
    "googlemail.com",
    "outlook.com",
    "hotmail.com",
    "live.com",
    "yahoo.com",
    "icloud.com",
    "proton.me",
    "protonmail.com",
    "aol.com",
    "mail.com",
    "email.com",
  ]);
  if (u.email.split("@")[1] !== domain || publicDomains.has(domain))
    fail(
      403,
      "DOMAIN_REQUIRED",
      "Use a verified work email matching the company domain. Public email accounts cannot establish company authority.",
    );
}
companies.get("/:id/claim", async (c) => {
  const u = requireUser(c);
  const claim = await row(
    c.env,
    "SELECT id,company_id AS companyId,status,mailbox_verified_at AS mailboxVerifiedAt,reviewed_at AS reviewedAt FROM company_claims WHERE company_id=? AND user_id=? ORDER BY mailbox_verified_at DESC,id DESC LIMIT 1",
    c.req.param("id"),
    u.id,
  );
  return c.json({ claim });
});
companies.post("/:id/verify", async (c) => {
  const u = requireUser(c);
  await rateLimit(c, "claim-verify", 10, 900, u.id);
  const company = await getCompany(c, c.req.param("id"));
  requireWorkMailbox(u, company.domain);
  const v = await body(
    c,
    z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
  );
  const hash = await digest(v.token),
    time = now(),
    claimId = id();
  // Mailbox proof only creates an inert review request. No membership or
  // company verification is written here, even for an unknown public provider.
  const results = await c.env.DB.batch([
    stmt(
      c.env,
      "INSERT INTO company_claims(id,company_id,user_id,email,mailbox_verified_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM action_tokens t JOIN users u ON u.id=t.user_id JOIN companies co ON co.id=t.company_id WHERE t.token_hash=? AND t.purpose='claim' AND t.user_id=? AND t.company_id=? AND t.email=u.email AND u.email_verified=1 AND u.suspended=0 AND t.consumed_at IS NULL AND t.expires_at>? AND co.is_verified=0 AND NOT EXISTS(SELECT 1 FROM company_members WHERE company_id=co.id)) ON CONFLICT DO NOTHING RETURNING id",
      claimId,
      company.id,
      u.id,
      u.email,
      time,
      hash,
      u.id,
      company.id,
      time,
    ),
    stmt(
      c.env,
      "UPDATE action_tokens SET consumed_at=?,consumed_by=? WHERE token_hash=? AND EXISTS(SELECT 1 FROM company_claims WHERE id=?)",
      time,
      claimId,
      hash,
      claimId,
    ),
    stmt(
      c.env,
      "INSERT INTO audit_logs(id,actor_id,action,entity_type,entity_id,created_at) SELECT ?,?,'company_claim_submitted','company_claim',?,? WHERE EXISTS(SELECT 1 FROM company_claims WHERE id=?)",
      id(),
      u.id,
      claimId,
      time,
      claimId,
    ),
  ]);
  if (!results[0].results.length)
    fail(
      400,
      "INVALID_TOKEN",
      "This claim link is invalid, expired, already used, or a claim is already pending.",
    );
  return c.json({
    claim: {
      id: claimId,
      companyId: company.id,
      status: "pending",
      mailboxVerifiedAt: time,
      reviewedAt: null,
    },
    message:
      "Mailbox verified. Your company claim is pending administrator review. Private reports remain unavailable until approval.",
  });
});
companies.get("/:id/members", async (c) => {
  const cid = c.req.param("id");
  const u = requireUser(c);
  if (!u.is_admin && !(await companyMember(c, cid)))
    fail(403, "FORBIDDEN", "Company membership required.");
  const list = await rows<{
    id: string;
    company_id: string;
    user_id: string;
    role: "admin" | "member";
    display_name: string;
    email: string;
    created_at: string;
  }>(
    c.env,
    "SELECT m.*,u.display_name,u.email FROM company_members m JOIN users u ON u.id=m.user_id WHERE company_id=? ORDER BY m.created_at",
    cid,
  );
  return c.json({
    members: list.map((v) => ({
      id: v.id,
      companyId: v.company_id,
      userId: v.user_id,
      role: v.role,
      user: { id: v.user_id, displayName: v.display_name, email: v.email },
      addedAt: v.created_at,
    })),
  });
});
companies.post("/:id/members", async (c) => {
  const cid = c.req.param("id");
  const u = await requireCompanyAdmin(c, cid);
  const v = await body(
    c,
    z
      .object({
        email: emailSchema,
        role: z.enum(["admin", "member"]).default("member"),
      })
      .strict(),
  );
  const member = await row<UserRow>(
    c.env,
    "SELECT * FROM users WHERE email=? AND email_verified=1 AND suspended=0",
    v.email,
  );
  if (!member)
    fail(
      400,
      "USER_UNAVAILABLE",
      "Ask this person to register and verify their email first.",
    );
  await c.env.DB.batch([
    stmt(
      c.env,
      "INSERT INTO company_members(id,company_id,user_id,role,created_at) VALUES(?,?,?,?,?) ON CONFLICT(company_id,user_id) DO NOTHING",
      id(),
      cid,
      member.id,
      v.role,
      now(),
    ),
    audit(c.env, u.id, "company_member_added", "company", cid),
  ]);
  return c.json({ message: "Member added." }, 201);
});
companies.patch("/:id/members/:memberId", async (c) => {
  const cid = c.req.param("id");
  const u = await requireCompanyAdmin(c, cid);
  const v = await body(
    c,
    z.object({ role: z.enum(["admin", "member"]) }).strict(),
  );
  await c.env.DB.batch([
    stmt(
      c.env,
      "UPDATE company_members SET role=? WHERE id=? AND company_id=?",
      v.role,
      c.req.param("memberId"),
      cid,
    ),
    audit(c.env, u.id, "company_member_role_changed", "company", cid),
  ]);
  return c.json({ message: "Role updated." });
});
companies.delete("/:id/members/:memberId", async (c) => {
  const cid = c.req.param("id");
  const u = await requireCompanyAdmin(c, cid);
  await c.env.DB.batch([
    stmt(
      c.env,
      "DELETE FROM company_members WHERE id=? AND company_id=?",
      c.req.param("memberId"),
      cid,
    ),
    audit(c.env, u.id, "company_member_removed", "company", cid),
  ]);
  return c.json({ message: "Member removed." });
});
companies.patch("/:id/settings", async (c) => {
  const cid = c.req.param("id");
  const u = await requireCompanyAdmin(c, cid);
  const v = await body(
    c,
    z
      .object({
        name: z.string().trim().min(2).max(120),
        description: z.string().max(5000),
      })
      .strict(),
  );
  await c.env.DB.batch([
    stmt(
      c.env,
      "UPDATE companies SET name=?,description=?,updated_at=? WHERE id=?",
      v.name,
      v.description,
      now(),
      cid,
    ),
    audit(c.env, u.id, "company_updated", "company", cid),
  ]);
  return c.json(companyDTO(await getCompany(c, cid)));
});
companies.get("/:id/analytics", async (c) => {
  const cid = c.req.param("id");
  const u = requireUser(c);
  if (!u.is_admin && !(await companyMember(c, cid)))
    fail(403, "FORBIDDEN", "Company membership required.");
  const a = visibility(u);
  const counts = await rows<{ status: string; count: number }>(
    c.env,
    `SELECT b.status,count(*) count FROM bugs b WHERE b.company_id=? AND ${a.sql} GROUP BY b.status`,
    cid,
    ...a.args,
  );
  const resolution = await row<{
    resolvedBugCount: number;
    averageResolutionHours: number | null;
  }>(
    c.env,
    `SELECT count(*) AS resolvedBugCount,avg(max(0,(julianday(b.resolved_at)-julianday(b.created_at))*24)) AS averageResolutionHours FROM bugs b WHERE b.company_id=? AND b.resolved_at IS NOT NULL AND b.status IN ('resolved','closed') AND ${a.sql}`,
    cid,
    ...a.args,
  );
  return c.json({
    ...resolution,
    totalBugs: counts.reduce((n, v) => n + v.count, 0),
    byStatus: counts,
  });
});
export default companies;
