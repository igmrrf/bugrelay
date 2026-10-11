import { beforeEach, expect, test } from "vitest";
import {
  bindings,
  base,
  bug,
  company,
  request,
  sent,
  setup,
  tokenFromMail,
  upload,
  user,
} from "./helpers";
import { digest, id, now, stmt } from "../src/core";
import { applyD1Migrations, reset } from "cloudflare:test";
beforeEach(setup);

test.each(["mail.com", "email.com"])(
  "a public %s mailbox cannot claim the provider company",
  async (domain) => {
    const customer = await user(`customer@${domain}`);
    const company = (await (
      await request(
        "/companies",
        "POST",
        { name: "Mail provider", domain },
        customer.cookie,
      )
    ).json()) as { id: string };
    expect(
      (
        await request(
          `/companies/${company.id}/claim`,
          "POST",
          {},
          customer.cookie,
        )
      ).status,
    ).toBe(403);
    expect(sent).toHaveLength(0);
    expect(
      await stmt(bindings, "SELECT count(*) n FROM company_members").first("n"),
    ).toBe(0);
    const token = "a".repeat(64);
    await stmt(
      bindings,
      "INSERT INTO action_tokens(token_hash,purpose,user_id,company_id,email,expires_at,created_at) VALUES(?,'claim',?,?,?,?,?)",
      await digest(token),
      customer.id,
      company.id,
      `customer@${domain}`,
      new Date(Date.now() + 3600000).toISOString(),
      now(),
    ).run();
    expect(
      (
        await request(
          `/companies/${company.id}/verify`,
          "POST",
          { token },
          customer.cookie,
        )
      ).status,
    ).toBe(403);
    expect(
      await stmt(
        bindings,
        "SELECT is_verified FROM companies WHERE id=?",
        company.id,
      ).first("is_verified"),
    ).toBe(0);
  },
);

test("mailbox confirmation alone cannot expose private reports or attachments, including an unclassified public provider", async () => {
  const applicant = await user("customer@unclassified-provider.example");
  const reporter = await user("reporter@example.com");
  const company = (await (
    await request(
      "/companies",
      "POST",
      {
        name: "Unclassified provider",
        domain: "unclassified-provider.example",
      },
      applicant.cookie,
    )
  ).json()) as { id: string };
  const report = await bug(reporter.cookie, {
    category: "security",
    companyId: company.id,
  });
  const attachment = (await (
    await request(
      `/bugs/${report.id}/attachments`,
      "POST",
      upload(),
      reporter.cookie,
    )
  ).json()) as { id: string };
  expect(
    (
      await request(
        `/companies/${company.id}/claim`,
        "POST",
        {},
        applicant.cookie,
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await request(
        `/companies/${company.id}/verify`,
        "POST",
        { token: tokenFromMail() },
        applicant.cookie,
      )
    ).status,
  ).toBe(200);
  expect(
    (await request(`/bugs/${report.id}`, "GET", undefined, applicant.cookie))
      .status,
  ).toBe(404);
  expect(
    (
      await request(
        `/bugs/${report.id}/attachments/${attachment.id}`,
        "GET",
        undefined,
        applicant.cookie,
      )
    ).status,
  ).toBe(404);
  expect(
    await stmt(bindings, "SELECT count(*) n FROM company_members").first("n"),
  ).toBe(0);
  expect(
    await stmt(
      bindings,
      "SELECT is_verified FROM companies WHERE id=?",
      company.id,
    ).first("is_verified"),
  ).toBe(0);
  expect(
    (
      await request(
        `/companies/${company.id}/members`,
        "GET",
        undefined,
        applicant.cookie,
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await request(
        `/companies/${company.id}/analytics`,
        "GET",
        undefined,
        applicant.cookie,
      )
    ).status,
  ).toBe(403);
  expect(
    (
      (await (
        await request(
          `/companies/${company.id}/bugs`,
          "GET",
          undefined,
          applicant.cookie,
        )
      ).json()) as { total: number }
    ).total,
  ).toBe(0);
  expect(
    (
      (await (
        await request(
          `/companies/${company.id}/claim`,
          "GET",
          undefined,
          applicant.cookie,
        )
      ).json()) as { claim: { status: string } }
    ).claim.status,
  ).toBe("pending");
  expect(
    (
      (await (
        await request(
          `/companies/${company.id}/claim`,
          "GET",
          undefined,
          reporter.cookie,
        )
      ).json()) as { claim: unknown }
    ).claim,
  ).toBeNull();
});

const approval = {
  decision: "approved",
  domainControlVerified: true,
  evidence:
    "Fixture: DNS control and company representative authority checked independently.",
};
async function pendingClaim(email = "owner@acme.example") {
  const applicant = await user(email);
  const company = (await (
    await request(
      "/companies",
      "POST",
      { name: "Acme", domain: email.split("@")[1] },
      applicant.cookie,
    )
  ).json()) as { id: string };
  expect(
    (
      await request(
        `/companies/${company.id}/claim`,
        "POST",
        {},
        applicant.cookie,
      )
    ).status,
  ).toBe(200);
  const verified = await request(
    `/companies/${company.id}/verify`,
    "POST",
    { token: tokenFromMail() },
    applicant.cookie,
  );
  expect(verified.status).toBe(200);
  const result = (await verified.json()) as { claim: { id: string } };
  return { applicant, company, claim: result.claim };
}
test("only an independent live platform administrator with recorded domain evidence can approve a pending claim", async () => {
  const { applicant, company, claim } = await pendingClaim();
  const reviewer = await user("reviewer@example.com", true);
  const reporter = await user("reporter@example.com");
  const report = await bug(reporter.cookie, {
    category: "security",
    companyId: company.id,
  });
  const attachment = (await (
    await request(
      `/bugs/${report.id}/attachments`,
      "POST",
      upload(),
      reporter.cookie,
    )
  ).json()) as { id: string };
  const path = `/admin/company-claims/${claim.id}/review`;
  expect((await request(path, "POST", approval)).status).toBe(401);
  expect((await request(path, "POST", approval, applicant.cookie)).status).toBe(
    403,
  );
  expect(
    (await request("/admin/company-claims", "GET", undefined, applicant.cookie))
      .status,
  ).toBe(403);
  for (const value of [
    { ...approval, domainControlVerified: false },
    { ...approval, evidence: "mailbox only" },
    { ...approval, userId: applicant.id },
  ])
    expect((await request(path, "POST", value, reviewer.cookie)).status).toBe(
      400,
    );
  expect(
    (await request(`/bugs/${report.id}`, "GET", undefined, applicant.cookie))
      .status,
  ).toBe(404);
  const reviews = await Promise.all([
    request(path, "POST", approval, reviewer.cookie),
    request(path, "POST", approval, reviewer.cookie),
  ]);
  expect(reviews.map((r) => r.status).sort()).toEqual([200, 409]);
  expect(
    (await request(`/bugs/${report.id}`, "GET", undefined, applicant.cookie))
      .status,
  ).toBe(200);
  expect(
    (
      await request(
        `/bugs/${report.id}/attachments/${attachment.id}`,
        "GET",
        undefined,
        applicant.cookie,
      )
    ).status,
  ).toBe(200);
  expect(
    await stmt(
      bindings,
      "SELECT count(*) n FROM company_members WHERE company_id=?",
      company.id,
    ).first("n"),
  ).toBe(1);
  expect(
    await stmt(
      bindings,
      "SELECT count(*) n FROM audit_logs WHERE action='company_claim_approved' AND actor_id=? AND entity_id=?",
      reviewer.id,
      claim.id,
    ).first("n"),
  ).toBe(1);
  expect(
    await stmt(
      bindings,
      "SELECT review_note FROM company_claims WHERE id=?",
      claim.id,
    ).first("review_note"),
  ).toBe(approval.evidence);
});
test("self approval is denied even for platform administrators; rejection permits a new verified request", async () => {
  const { applicant, company, claim } = await pendingClaim();
  await stmt(
    bindings,
    "UPDATE users SET is_admin=1 WHERE id=?",
    applicant.id,
  ).run();
  expect(
    (
      await request(
        `/admin/company-claims/${claim.id}/review`,
        "POST",
        approval,
        applicant.cookie,
      )
    ).status,
  ).toBe(409);
  const reviewer = await user("reviewer@example.com", true);
  expect(
    (
      await request(
        `/admin/company-claims/${claim.id}/review`,
        "POST",
        {
          decision: "rejected",
          evidence: "No independent domain-control proof was provided.",
        },
        reviewer.cookie,
      )
    ).status,
  ).toBe(200);
  expect(
    await stmt(bindings, "SELECT count(*) n FROM company_members").first("n"),
  ).toBe(0);
  expect(
    (
      (await (
        await request(
          `/companies/${company.id}/claim`,
          "GET",
          undefined,
          applicant.cookie,
        )
      ).json()) as { claim: { status: string } }
    ).claim.status,
  ).toBe("rejected");
  expect(
    (
      await request(
        `/companies/${company.id}/claim`,
        "POST",
        {},
        applicant.cookie,
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await request(
        `/companies/${company.id}/verify`,
        "POST",
        { token: tokenFromMail() },
        applicant.cookie,
      )
    ).status,
  ).toBe(200);
  expect(
    await stmt(
      bindings,
      "SELECT count(*) n FROM company_claims WHERE status='pending'",
    ).first("n"),
  ).toBe(1);
});
test.each(["suspended", "email-unverified", "email-changed"])(
  "approval rechecks %s claimant state atomically",
  async (change) => {
    const { applicant, claim } = await pendingClaim();
    const reviewer = await user("reviewer@example.com", true);
    if (change === "suspended")
      await stmt(
        bindings,
        "UPDATE users SET suspended=1 WHERE id=?",
        applicant.id,
      ).run();
    else if (change === "email-unverified")
      await stmt(
        bindings,
        "UPDATE users SET email_verified=0 WHERE id=?",
        applicant.id,
      ).run();
    else
      await stmt(
        bindings,
        "UPDATE users SET email='other@acme.example' WHERE id=?",
        applicant.id,
      ).run();
    expect(
      (
        await request(
          `/admin/company-claims/${claim.id}/review`,
          "POST",
          approval,
          reviewer.cookie,
        )
      ).status,
    ).toBe(409);
    expect(
      await stmt(bindings, "SELECT count(*) n FROM company_members").first("n"),
    ).toBe(0);
  },
);
test("two simultaneous claims cannot grant competing company administrators", async () => {
  const { applicant, company, claim } = await pendingClaim();
  const other = await user("other@acme.example");
  await request(`/companies/${company.id}/claim`, "POST", {}, other.cookie);
  const second = (await (
    await request(
      `/companies/${company.id}/verify`,
      "POST",
      { token: tokenFromMail() },
      other.cookie,
    )
  ).json()) as { claim: { id: string } };
  const reviewer = await user("reviewer@example.com", true);
  const results = await Promise.all(
    [claim.id, second.claim.id].map((cid) =>
      request(
        `/admin/company-claims/${cid}/review`,
        "POST",
        approval,
        reviewer.cookie,
      ),
    ),
  );
  expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  expect(
    await stmt(
      bindings,
      "SELECT count(*) n FROM company_members WHERE company_id=?",
      company.id,
    ).first("n"),
  ).toBe(1);
  const winner = await stmt(
    bindings,
    "SELECT user_id FROM company_members WHERE company_id=?",
    company.id,
  ).first("user_id");
  expect([applicant.id, other.id]).toContain(winner);
  expect(
    await stmt(
      bindings,
      "SELECT count(*) n FROM company_claims WHERE status='pending'",
    ).first("n"),
  ).toBe(0);
});
test.each([true, false])(
  "upgrade revokes prior owners and invites regardless of claim audit presence (%s)",
  async (hasAudit) => {
    await reset();
    await applyD1Migrations(base.DB, base.MIGRATIONS.slice(0, 6));
    const owner = await user("owner@acme.example"),
      invited = await user("invited@acme.example"),
      reporter = await user();
    const cid = await company(owner, "acme.example");
    await stmt(
      bindings,
      "INSERT INTO company_members(id,company_id,user_id,role,created_at) VALUES(?,?,?,'member',?)",
      id(),
      cid,
      invited.id,
      now(),
    ).run();
    if (hasAudit)
      await stmt(
        bindings,
        "INSERT INTO audit_logs(id,actor_id,action,entity_type,entity_id,created_at) VALUES(?,?,'company_verified','company',?,?)",
        id(),
        owner.id,
        cid,
        now(),
      ).run();
    const report = await bug(reporter.cookie, {
      category: "security",
      companyId: cid,
    });
    expect(
      (await request(`/bugs/${report.id}`, "GET", undefined, owner.cookie))
        .status,
    ).toBe(200);
    await applyD1Migrations(base.DB, base.MIGRATIONS.slice(6));
    expect(
      (await request(`/bugs/${report.id}`, "GET", undefined, owner.cookie))
        .status,
    ).toBe(404);
    expect(
      (await request(`/bugs/${report.id}`, "GET", undefined, invited.cookie))
        .status,
    ).toBe(404);
    expect(
      await stmt(
        bindings,
        "SELECT count(*) n FROM company_members WHERE company_id=?",
        cid,
      ).first("n"),
    ).toBe(0);
    expect(
      await stmt(
        bindings,
        "SELECT is_verified FROM companies WHERE id=?",
        cid,
      ).first("is_verified"),
    ).toBe(0);
    expect(
      await stmt(
        bindings,
        "SELECT status FROM company_claims WHERE company_id=? AND user_id=?",
        cid,
        owner.id,
      ).first("status"),
    ).toBe("pending");
  },
);

test("upgrade clears dormant memberships and verified flags even without an eligible former administrator", async () => {
  await reset();
  await applyD1Migrations(base.DB, base.MIGRATIONS.slice(0, 6));
  const former = await user("former@different.example");
  const dormant = await company(former, "dormant.example");
  await stmt(
    bindings,
    "UPDATE companies SET is_verified=0 WHERE id=?",
    dormant,
  ).run();
  for (const domain of ["member-only.example", "ownerless.example"]) {
    const cid = id();
    await stmt(
      bindings,
      "INSERT INTO companies(id,name,domain,is_verified,created_at,updated_at) VALUES(?,?,?,1,?,?)",
      cid,
      domain,
      domain,
      now(),
      now(),
    ).run();
    if (domain === "member-only.example")
      await stmt(
        bindings,
        "INSERT INTO company_members(id,company_id,user_id,role,created_at) VALUES(?,?,?,'member',?)",
        id(),
        cid,
        former.id,
        now(),
      ).run();
  }
  expect(
    await stmt(bindings, "SELECT count(*) n FROM audit_logs").first("n"),
  ).toBe(0);
  await applyD1Migrations(base.DB, base.MIGRATIONS.slice(6));
  expect(
    await stmt(bindings, "SELECT count(*) n FROM company_members").first("n"),
  ).toBe(0);
  expect(
    await stmt(
      bindings,
      "SELECT count(*) n FROM companies WHERE is_verified=1",
    ).first("n"),
  ).toBe(0);
  expect(
    await stmt(bindings, "SELECT count(*) n FROM company_claims").first("n"),
  ).toBe(0);
  expect(
    await stmt(
      bindings,
      "SELECT count(*) n FROM audit_logs WHERE action='company_authorization_review_required'",
    ).first("n"),
  ).toBe(3);
});

test("revoking the reviewer session after dispatch but before the batch prevents all approval side effects", async () => {
  const { claim } = await pendingClaim();
  const reviewer = await user("reviewer@example.com", true);
  const db = new Proxy(bindings.DB, {
    get(target, key) {
      if (key === "batch")
        return async (statements: D1PreparedStatement[]) => {
          await stmt(
            bindings,
            "DELETE FROM sessions WHERE id=?",
            reviewer.sessionId,
          ).run();
          return target.batch(statements);
        };
      const value = Reflect.get(target, key, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  expect(
    (
      await request(
        `/admin/company-claims/${claim.id}/review`,
        "POST",
        approval,
        reviewer.cookie,
        { DB: db },
      )
    ).status,
  ).toBe(409);
  expect(
    await stmt(
      bindings,
      "SELECT status FROM company_claims WHERE id=?",
      claim.id,
    ).first("status"),
  ).toBe("pending");
  expect(
    await stmt(bindings, "SELECT count(*) n FROM company_members").first("n"),
  ).toBe(0);
  expect(
    await stmt(
      bindings,
      "SELECT count(*) n FROM audit_logs WHERE action='company_claim_approved'",
    ).first("n"),
  ).toBe(0);
});
