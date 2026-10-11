import { Hono } from "hono";
import { z } from "zod";
import type { CompanyClaimReview } from "@bugrelay/contracts";
import {
  body,
  fail,
  id,
  now,
  pageResult,
  pagination,
  requireAdmin,
  row,
  rows,
  stmt,
} from "./core";
import type { AppEnv } from "./types";

// Mounted beneath the pre-dispatch administrator guard.
const claims = new Hono<AppEnv>();
claims.get("/", async (c) => {
  requireAdmin(c);
  const p = pagination(c);
  const items = await rows<CompanyClaimReview>(
    c.env,
    "SELECT cl.id,cl.company_id AS companyId,cl.user_id AS userId,cl.email,cl.status,cl.mailbox_verified_at AS mailboxVerifiedAt,cl.reviewed_at AS reviewedAt,co.name AS companyName,co.domain AS companyDomain FROM company_claims cl JOIN companies co ON co.id=cl.company_id WHERE cl.status='pending' ORDER BY cl.mailbox_verified_at,cl.id LIMIT ? OFFSET ?",
    p.limit,
    p.offset,
  );
  const count = await row<{ n: number }>(
    c.env,
    "SELECT count(*) n FROM company_claims WHERE status='pending'",
  );
  return c.json(pageResult(items, count!.n, p));
});
claims.post("/:id/review", async (c) => {
  const reviewer = requireAdmin(c);
  const v = await body(
    c,
    z
      .object({
        decision: z.enum(["approved", "rejected"]),
        evidence: z.string().trim().min(20).max(2000),
        domainControlVerified: z.boolean().optional(),
      })
      .strict()
      .refine(
        (v) => v.decision !== "approved" || v.domainControlVerified === true,
        "Confirm independently verified domain control before approving.",
      ),
  );
  const time = now(),
    operation = id(),
    claimId = c.req.param("id");
  // All checks, claim transition, authority grant and audit share one D1
  // transaction. The random operation ID makes subsequent writes conditional
  // on this exact reviewer winning, even when two reviews arrive together.
  const result = await c.env.DB.batch([
    stmt(
      c.env,
      "UPDATE company_claims SET status=?,reviewed_by=?,reviewed_at=?,review_note=?,review_id=? WHERE id=? AND status='pending' AND user_id!=? AND EXISTS(SELECT 1 FROM users r JOIN sessions s ON s.user_id=r.id WHERE r.id=? AND r.is_admin=1 AND r.email_verified=1 AND r.suspended=0 AND s.id=? AND s.expires_at>?) AND (?='rejected' OR EXISTS(SELECT 1 FROM companies co JOIN users u ON u.id=company_claims.user_id WHERE co.id=company_claims.company_id AND co.is_verified=0 AND u.email=company_claims.email AND u.email_verified=1 AND u.suspended=0 AND substr(u.email,instr(u.email,'@')+1)=co.domain AND NOT EXISTS(SELECT 1 FROM company_members WHERE company_id=co.id))) RETURNING id",
      v.decision,
      reviewer.id,
      time,
      v.evidence,
      operation,
      claimId,
      reviewer.id,
      reviewer.id,
      c.get("session")!.id,
      time,
      v.decision,
    ),
    stmt(
      c.env,
      "INSERT INTO company_members(id,company_id,user_id,role,created_at) SELECT ?,company_id,user_id,'admin',? FROM company_claims WHERE id=? AND status='approved' AND review_id=?",
      id(),
      time,
      claimId,
      operation,
    ),
    stmt(
      c.env,
      "UPDATE companies SET is_verified=1,updated_at=? WHERE id=(SELECT company_id FROM company_claims WHERE id=? AND status='approved' AND review_id=?)",
      time,
      claimId,
      operation,
    ),
    stmt(
      c.env,
      "UPDATE company_claims SET status='rejected',reviewed_by=?,reviewed_at=?,review_note='Another representative was approved.' WHERE status='pending' AND company_id=(SELECT company_id FROM company_claims WHERE id=? AND status='approved' AND review_id=?)",
      reviewer.id,
      time,
      claimId,
      operation,
    ),
    stmt(
      c.env,
      "UPDATE action_tokens SET consumed_at=? WHERE purpose='claim' AND company_id=(SELECT company_id FROM company_claims WHERE id=? AND status='approved' AND review_id=?)",
      time,
      claimId,
      operation,
    ),
    stmt(
      c.env,
      "INSERT INTO audit_logs(id,actor_id,action,entity_type,entity_id,created_at) SELECT ?,?,?,'company_claim',?,? WHERE EXISTS(SELECT 1 FROM company_claims WHERE id=? AND review_id=?)",
      id(),
      reviewer.id,
      `company_claim_${v.decision}`,
      claimId,
      time,
      claimId,
      operation,
    ),
  ]);
  if (!result[0].results.length)
    fail(
      409,
      "CLAIM_NOT_REVIEWABLE",
      "The claim or reviewer is no longer eligible. You cannot review your own claim.",
    );
  return c.json({
    message:
      v.decision === "approved"
        ? "Company claim approved. Company administrator access granted."
        : "Company claim rejected. No company access granted.",
  });
});
export default claims;
