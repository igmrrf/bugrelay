import { env } from "cloudflare:workers";
import { applyD1Migrations, reset } from "cloudflare:test";
import { beforeEach, expect, test, vi } from "vitest";
import { app } from "../src/index";
import { digest, id, now, randomToken, stmt } from "../src/core";
import type { Env } from "../src/types";
import type { D1Migration } from "@cloudflare/vitest-plugin";
const base = env as unknown as Env & { MIGRATIONS: D1Migration[] };
let sent: { to: string; text: string }[] = [];
let bindings: Env;
beforeEach(async () => {
  await reset();
  await applyD1Migrations(base.DB, base.MIGRATIONS);
  sent = [];
  bindings = {
    ...base,
    EMAIL: {
      send: vi.fn(async (message: { to: string; text: string }) => {
        sent.push(message);
        return { messageId: id() };
      }),
    } as unknown as SendEmail,
  };
});
async function request(
  path: string,
  method = "GET",
  data?: unknown,
  cookie?: string,
  override?: Partial<Env>,
) {
  return app.request(
    `http://localhost:3000/api/v1${path}`,
    {
      method,
      headers: {
        Origin: "http://localhost:3000",
        ...(data instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body:
        data === undefined
          ? undefined
          : data instanceof FormData
            ? data
            : JSON.stringify(data),
    },
    { ...bindings, ...override },
  );
}
async function user(email = "reporter@example.com", admin = false) {
  const uid = id(),
    token = randomToken(),
    time = now();
  await stmt(
    bindings,
    "INSERT INTO users(id,email,display_name,is_admin,email_verified,created_at,updated_at) VALUES(?,?,?, ?,1,?,?)",
    uid,
    email,
    email.split("@")[0],
    Number(admin),
    time,
    time,
  ).run();
  await stmt(
    bindings,
    "INSERT INTO sessions(id,token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?,?)",
    id(),
    await digest(token),
    uid,
    new Date(Date.now() + 3600000).toISOString(),
    time,
  ).run();
  return { id: uid, cookie: `bugrelay_session=${token}` };
}
async function bug(cookie: string, extra: Record<string, unknown> = {}) {
  const r = await request(
    "/bugs",
    "POST",
    {
      title: "Login page fails repeatedly",
      description: "The login screen remains blank after submitting the form.",
      applicationName: "Example App",
      ...extra,
    },
    cookie,
  );
  expect(r.status).toBe(201);
  return (await r.json()) as {
    id: string;
    visibility: string;
    voteCount: number;
  };
}
const tokenFromMail = () =>
  new URL(sent.at(-1)!.text.match(/https?:\/\/\S+/)![0]).hash.split("=")[1];
test("registration, email confirmation, login and authoritative logout form one contract", async () => {
  const r = await request("/auth/register", "POST", {
    email: "new@example.com",
    displayName: "New user",
    password: "A long passphrase 123",
  });
  expect(r.status).toBe(201);
  const data = (await r.json()) as { user: { isEmailVerified: boolean } };
  expect(data.user.isEmailVerified).toBe(false);
  const cookie = r.headers.get("set-cookie")!.split(";")[0];
  expect(r.headers.get("set-cookie")).toContain("HttpOnly");
  expect(sent).toHaveLength(1);
  expect(
    (await request("/auth/profile", "GET", undefined, cookie)).status,
  ).toBe(200);
  expect(
    (
      await request(
        "/bugs",
        "POST",
        {
          title: "Private security",
          description: "A sufficiently long private report description",
          applicationName: "Example",
          category: "security",
        },
        cookie,
      )
    ).status,
  ).toBe(403);
  const token = tokenFromMail();
  expect(
    (await request("/auth/verify-email/confirm", "POST", { token }, cookie))
      .status,
  ).toBe(200);
  expect(
    (await request("/auth/verify-email/confirm", "POST", { token }, cookie))
      .status,
  ).toBe(400);
  await bug(cookie);
  expect((await request("/auth/logout", "POST", {}, cookie)).status).toBe(200);
  expect(
    (await request("/auth/profile", "GET", undefined, cookie)).status,
  ).toBe(401);
  const login = await request("/auth/login", "POST", {
    email: "new@example.com",
    password: "A long passphrase 123",
  });
  expect(login.status).toBe(200);
  expect(login.headers.get("set-cookie")).toContain("HttpOnly");
});
test("admin denial occurs before database mutation", async () => {
  const ordinary = await user();
  const target = await user("target@example.com");
  const before = await stmt(
    bindings,
    "SELECT count(*) n FROM audit_logs",
  ).first("n");
  for (const path of [
    "/admin/stats",
    "/admin/audit-logs",
    "/admin/export/audit-logs",
  ])
    expect(
      (await request(path, "GET", undefined, ordinary.cookie)).status,
    ).toBe(403);
  expect(
    (
      await request(
        `/admin/users/${target.id}/role`,
        "PATCH",
        { isAdmin: true },
        ordinary.cookie,
      )
    ).status,
  ).toBe(403);
  expect(
    await stmt(
      bindings,
      "SELECT is_admin FROM users WHERE id=?",
      target.id,
    ).first("is_admin"),
  ).toBe(0);
  expect(
    await stmt(bindings, "SELECT count(*) n FROM audit_logs").first("n"),
  ).toBe(before);
});
test("private reports disappear from detail, list, counts, search, comments, votes and attachments", async () => {
  const owner = await user(),
    stranger = await user("stranger@example.com");
  const privateBug = await bug(owner.cookie, {
    category: "security",
    visibility: "public",
  });
  expect(privateBug.visibility).toBe("private");
  await request(
    `/bugs/${privateBug.id}/comments`,
    "POST",
    { content: "Sensitive reproduction" },
    owner.cookie,
  );
  for (const cookie of [undefined, stranger.cookie]) {
    for (const path of [
      `/bugs/${privateBug.id}`,
      `/bugs/${privateBug.id}/comments`,
      `/bugs/${privateBug.id}/attachments/${id()}`,
    ])
      expect((await request(path, "GET", undefined, cookie)).status).toBe(404);
    const list = (await (
      await request("/bugs?q=Login", "GET", undefined, cookie)
    ).json()) as { total: number; items: unknown[] };
    expect(list).toMatchObject({ total: 0, items: [] });
    expect(
      await (
        await request(
          "/bugs/search-duplicates",
          "POST",
          { query: "Login page" },
          cookie,
        )
      ).json(),
    ).toEqual({ duplicates: [] });
  }
  expect(
    (await request(`/bugs/${privateBug.id}/vote`, "POST", {}, stranger.cookie))
      .status,
  ).toBe(404);
  expect(
    (
      await request(
        `/bugs/${privateBug.id}/comments`,
        "POST",
        { content: "Intrusion" },
        stranger.cookie,
      )
    ).status,
  ).toBe(404);
  expect(
    (await request(`/bugs/${privateBug.id}`, "GET", undefined, owner.cookie))
      .status,
  ).toBe(200);
});
test("company verification requires mailbox proof and independent approval; membership removal revokes access immediately", async () => {
  const owner = await user(),
    reviewer = await user("reviewer@example.com", true),
    claimer = await user("owner@acme.example"),
    member = await user("member@acme.example");
  const company = (await (
    await request(
      "/companies",
      "POST",
      { name: "Acme", domain: "acme.example" },
      claimer.cookie,
    )
  ).json()) as { id: string };
  const b = await bug(owner.cookie, {
    category: "security",
    companyId: company.id,
  });
  expect(
    (await request(`/bugs/${b.id}`, "GET", undefined, claimer.cookie)).status,
  ).toBe(404);
  const claim = await request(
    `/companies/${company.id}/claim`,
    "POST",
    {},
    claimer.cookie,
  );
  expect(claim.status).toBe(200);
  expect(await claim.text()).not.toContain("token");
  const token = tokenFromMail();
  expect(
    (
      await request(
        `/companies/${company.id}/verify`,
        "POST",
        { token },
        member.cookie,
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await request(
        `/companies/${company.id}/verify`,
        "POST",
        { token },
        claimer.cookie,
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await request(
        `/companies/${company.id}/verify`,
        "POST",
        { token },
        claimer.cookie,
      )
    ).status,
  ).toBe(400);
  expect(
    (await request(`/bugs/${b.id}`, "GET", undefined, claimer.cookie)).status,
  ).toBe(404);
  const pending = (await (
    await request(
      `/companies/${company.id}/claim`,
      "GET",
      undefined,
      claimer.cookie,
    )
  ).json()) as { claim: { id: string } };
  expect(
    (
      await request(
        `/admin/company-claims/${pending.claim.id}/review`,
        "POST",
        {
          decision: "approved",
          domainControlVerified: true,
          evidence:
            "Fixture: independent domain control and representative authority verified.",
        },
        reviewer.cookie,
      )
    ).status,
  ).toBe(200);
  expect(
    (await request(`/bugs/${b.id}`, "GET", undefined, claimer.cookie)).status,
  ).toBe(200);
  expect(
    (
      await request(
        `/companies/${company.id}/members`,
        "POST",
        { email: "member@acme.example" },
        claimer.cookie,
      )
    ).status,
  ).toBe(201);
  expect(
    (await request(`/bugs/${b.id}`, "GET", undefined, member.cookie)).status,
  ).toBe(200);
  const membership = await stmt(
    bindings,
    "SELECT id FROM company_members WHERE user_id=?",
    member.id,
  ).first<string>("id");
  expect(
    (
      await request(
        `/companies/${company.id}/members/${membership}`,
        "DELETE",
        undefined,
        claimer.cookie,
      )
    ).status,
  ).toBe(200);
  expect(
    (await request(`/bugs/${b.id}`, "GET", undefined, member.cookie)).status,
  ).toBe(404);
  const adminMembership = await stmt(
    bindings,
    "SELECT id FROM company_members WHERE user_id=?",
    claimer.id,
  ).first<string>("id");
  expect(
    (
      await request(
        `/companies/${company.id}/members/${adminMembership}`,
        "DELETE",
        undefined,
        claimer.cookie,
      )
    ).status,
  ).toBe(409);
});
test("password reset is single-use and revokes all existing sessions", async () => {
  const u = await user();
  expect(
    (
      await request("/auth/forgot-password", "POST", {
        email: "reporter@example.com",
      })
    ).status,
  ).toBe(200);
  const token = tokenFromMail();
  expect(
    (
      await request("/auth/reset-password", "POST", {
        token,
        password: "A brand new passphrase 456",
      })
    ).status,
  ).toBe(200);
  expect(
    (await request("/auth/profile", "GET", undefined, u.cookie)).status,
  ).toBe(401);
  expect(
    (
      await request("/auth/reset-password", "POST", {
        token,
        password: "Another long passphrase",
      })
    ).status,
  ).toBe(400);
});
test("votes are idempotent under concurrent requests and comments enforce ownership", async () => {
  const u = await user(),
    other = await user("other@example.com");
  const b = await bug(u.cookie);
  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      request(`/bugs/${b.id}/vote`, "POST", {}, u.cookie),
    ),
  );
  expect(results.every((r) => r.status === 200)).toBe(true);
  expect(
    await stmt(
      bindings,
      "SELECT count(*) n FROM votes WHERE bug_id=?",
      b.id,
    ).first("n"),
  ).toBe(1);
  const cm = (await (
    await request(
      `/bugs/${b.id}/comments`,
      "POST",
      { content: "My comment" },
      u.cookie,
    )
  ).json()) as { id: string };
  expect(
    (
      await request(
        `/bugs/${b.id}/comments/${cm.id}`,
        "DELETE",
        undefined,
        other.cookie,
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await request(
        `/bugs/${b.id}/comments/${cm.id}`,
        "PATCH",
        { content: "Updated comment" },
        u.cookie,
      )
    ).status,
  ).toBe(200);
});
test("unsafe merges are rejected before changing private report audiences", async () => {
  const owner = await user(),
    admin = await user("admin@example.com", true);
  const pub = await bug(owner.cookie),
    priv = await bug(owner.cookie, { category: "security" });
  expect(
    (
      await request(
        "/admin/bugs/merge",
        "POST",
        { primaryBugId: pub.id, duplicateBugIds: [priv.id] },
        admin.cookie,
      )
    ).status,
  ).toBe(400);
  expect(
    (await request(`/bugs/${priv.id}`, "GET", undefined, owner.cookie)).status,
  ).toBe(200);
  expect((await request(`/bugs/${priv.id}`)).status).toBe(404);
});
test("cross-origin mutations and production missing challenges fail closed", async () => {
  const u = await user();
  const cross = await app.request(
    "http://localhost:3000/api/v1/auth/logout",
    {
      method: "POST",
      headers: { Origin: "https://attacker.example", Cookie: u.cookie },
    },
    bindings,
  );
  expect(cross.status).toBe(403);
  expect(
    (await request("/auth/profile", "GET", undefined, u.cookie)).status,
  ).toBe(200);
  expect(
    (
      await request(
        "/auth/register",
        "POST",
        {
          email: "n@example.com",
          password: "Long password 123",
          displayName: "New",
        },
        undefined,
        { ENVIRONMENT: "production", APP_ORIGIN: "https://bugrelay.com" },
      )
    ).status,
  ).toBe(503);
});
test("R2 attachment fetch rechecks report authorization and rejects executable formats", async () => {
  const u = await user(),
    stranger = await user("stranger@example.com");
  const b = await bug(u.cookie, { category: "security" });
  const form = new FormData();
  form.set(
    "file",
    new File(['<svg onload="alert(1)"/>'], "image.svg", {
      type: "image/svg+xml",
    }),
  );
  expect(
    (await request(`/bugs/${b.id}/attachments`, "POST", form, u.cookie)).status,
  ).toBe(415);
  const png = new Uint8Array([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0,
    0, 0, 1,
  ]);
  const valid = new FormData();
  valid.set("file", new File([png], "proof.png", { type: "image/png" }));
  const uploaded = await request(
    `/bugs/${b.id}/attachments`,
    "POST",
    valid,
    u.cookie,
  );
  expect(uploaded.status).toBe(201);
  const a = (await uploaded.json()) as { id: string };
  expect(
    (
      await request(
        `/bugs/${b.id}/attachments/${a.id}`,
        "GET",
        undefined,
        stranger.cookie,
      )
    ).status,
  ).toBe(404);
  const download = await request(
    `/bugs/${b.id}/attachments/${a.id}`,
    "GET",
    undefined,
    u.cookie,
  );
  expect(download.status).toBe(200);
  expect(download.headers.get("cache-control")).toContain("no-store");
});
test("resetting a password invalidates every previously issued reset link", async () => {
  await user();
  await request("/auth/forgot-password", "POST", {
    email: "reporter@example.com",
  });
  const old = tokenFromMail();
  await request("/auth/forgot-password", "POST", {
    email: "reporter@example.com",
  });
  const latest = tokenFromMail();
  expect(
    (
      await request("/auth/reset-password", "POST", {
        token: latest,
        password: "Replacement passphrase 123",
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await request("/auth/reset-password", "POST", {
        token: old,
        password: "Unwanted passphrase 456",
      })
    ).status,
  ).toBe(400);
});
test("mail failures do not verify accounts or expose tokens and verification can be retried", async () => {
  const failing = {
    send: async () => {
      throw new Error("provider detail that must not leak");
    },
  } as unknown as SendEmail;
  const result = await request(
    "/auth/register",
    "POST",
    {
      email: "mail@example.com",
      displayName: "Mail User",
      password: "A sufficient password 123",
    },
    undefined,
    { EMAIL: failing },
  );
  expect(result.status).toBe(201);
  const data = (await result.json()) as {
    emailSent: boolean;
    user: { isEmailVerified: boolean };
  };
  expect(data.emailSent).toBe(false);
  expect(data.user.isEmailVerified).toBe(false);
  expect(
    await stmt(bindings, "SELECT count(*) n FROM action_tokens").first("n"),
  ).toBe(0);
  const cookie = result.headers.get("set-cookie")!.split(";")[0];
  expect(
    (await request("/auth/verify-email/request", "POST", {}, cookie)).status,
  ).toBe(200);
  expect(sent).toHaveLength(1);
});
test("role changes and account suspension affect existing cookies immediately", async () => {
  const root = await user("root@example.com", true),
    admin = await user("admin@example.com", true);
  expect(
    (
      await request(
        `/admin/users/${admin.id}/role`,
        "PATCH",
        { isAdmin: false },
        root.cookie,
      )
    ).status,
  ).toBe(200);
  expect(
    (await request("/admin/stats", "GET", undefined, admin.cookie)).status,
  ).toBe(403);
  expect(
    (await request(`/admin/users/${admin.id}/suspend`, "POST", {}, root.cookie))
      .status,
  ).toBe(200);
  expect(
    (await request("/auth/profile", "GET", undefined, admin.cookie)).status,
  ).toBe(401);
  expect(
    (
      await request(
        `/admin/users/${root.id}/role`,
        "PATCH",
        { isAdmin: false },
        root.cookie,
      )
    ).status,
  ).toBe(409);
});
test("public DTOs never include author emails or password hashes", async () => {
  const owner = await user();
  const b = await bug(owner.cookie);
  const response = await (await request(`/bugs/${b.id}`)).text();
  expect(response).not.toContain("reporter@example.com");
  expect(response).not.toContain("password_hash");
});
test("normal browsing cannot exhaust the submission rate bucket", async () => {
  const owner = await user();
  for (let i = 0; i < 15; i++)
    expect((await request("/bugs")).status).toBe(200);
  await bug(owner.cookie);
});
test("a safe merge deduplicates votes and moves comments atomically", async () => {
  const owner = await user(),
    admin = await user("admin@example.com", true);
  const first = await bug(owner.cookie),
    second = await bug(owner.cookie);
  await request(`/bugs/${first.id}/vote`, "POST", {}, owner.cookie);
  await request(`/bugs/${second.id}/vote`, "POST", {}, owner.cookie);
  await request(
    `/bugs/${second.id}/comments`,
    "POST",
    { content: "Comment on duplicate" },
    owner.cookie,
  );
  const result = await request(
    "/admin/bugs/merge",
    "POST",
    { primaryBugId: first.id, duplicateBugIds: [second.id] },
    admin.cookie,
  );
  expect(result.status).toBe(200);
  expect(await result.json()).toMatchObject({ voteCount: 1, commentCount: 1 });
  expect((await request(`/bugs/${second.id}`)).status).toBe(404);
});
test("anonymous public submissions stay usable while private submissions require verified identity", async () => {
  const input = {
    title: "An anonymous public report",
    description:
      "A sufficient public reproduction with no sensitive information.",
    applicationName: "Anonymous App",
  };
  const response = await request("/bugs", "POST", input);
  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({
    author: null,
    visibility: "public",
    canEdit: false,
  });
  expect(
    (await request("/bugs", "POST", { ...input, category: "security" })).status,
  ).toBe(401);
  expect(
    (await request("/bugs", "POST", { ...input, visibility: "private" }))
      .status,
  ).toBe(401);
});
