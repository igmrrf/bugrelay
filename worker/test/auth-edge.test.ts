import { beforeEach, expect, test, vi } from "vitest";
import bcrypt from "bcryptjs";
import {
  bindings,
  bug,
  production,
  request,
  sent,
  setup,
  tokenFromMail,
  user,
} from "./helpers";
import { app } from "../src/index";
import { digest, stmt } from "../src/core";
beforeEach(setup);
test("production Turnstile missing, false or wrong-host proofs cannot cause signup side effects", async () => {
  const input = {
    email: "secure@example.com",
    displayName: "Secure user",
    password: "A secure testing passphrase",
  };
  expect(
    (await request("/auth/register", "POST", input, undefined, production))
      .status,
  ).toBe(400);
  const fetch = vi.spyOn(globalThis, "fetch");
  for (const result of [
    { success: false, hostname: "bugrelay.com" },
    { success: true, hostname: "attacker.example" },
  ]) {
    fetch.mockResolvedValueOnce(Response.json(result));
    expect(
      (
        await request(
          "/auth/register",
          "POST",
          { ...input, turnstileToken: "proof" },
          undefined,
          production,
        )
      ).status,
    ).toBe(400);
  }
  expect(await stmt(bindings, "SELECT count(*) n FROM users").first("n")).toBe(
    0,
  );
  fetch.mockResolvedValueOnce(
    Response.json({ success: true, hostname: "bugrelay.com" }),
  );
  const response = await request(
    "/auth/register",
    "POST",
    { ...input, turnstileToken: "proof" },
    undefined,
    production,
  );
  expect(response.status).toBe(201);
  const header = response.headers.get("set-cookie")!;
  expect(header).toContain("__Host-bugrelay_session=");
  expect(header).toContain("HttpOnly");
  expect(header).toContain("Secure");
  expect(header).toContain("SameSite=Lax");
  expect(header).toContain("Path=/");
  expect(header.toLowerCase()).not.toContain("domain=");
  const cookie = header.split(";")[0];
  expect(
    (await request("/auth/profile", "GET", undefined, cookie, production))
      .status,
  ).toBe(200);
  await request("/auth/logout", "POST", {}, cookie, production);
  expect(
    (await request("/auth/profile", "GET", undefined, cookie, production))
      .status,
  ).toBe(401);
});
test("all unsafe methods reject absent, null, lookalike and cross-site Origin before writes", async () => {
  const u = await user(),
    b = await bug(u.cookie);
  for (const method of ["POST", "PATCH", "DELETE", "PUT"])
    for (const origin of [
      undefined,
      "null",
      "https://bugrelay.com.attacker.example",
      "https://attacker.example",
    ]) {
      const headers: Record<string, string> = {
        Cookie: u.cookie,
        "Content-Type": "application/json",
      };
      if (origin) headers.Origin = origin;
      const r = await app.request(
        `${bindings.APP_ORIGIN}/api/v1/bugs/${b.id}`,
        { method, headers, body: "{}" },
        bindings,
      );
      expect(r.status).toBe(403);
    }
  expect(
    await stmt(bindings, "SELECT deleted_at FROM bugs WHERE id=?", b.id).first(
      "deleted_at",
    ),
  ).toBe(null);
});
test("revoked or expired cookies never silently turn signed submissions into anonymous reports", async () => {
  const u = await user();
  await stmt(bindings, "DELETE FROM sessions WHERE id=?", u.sessionId).run();
  const input = {
    title: "Should not be anonymous",
    description:
      "The revoked account must not submit with anonymous attribution.",
    applicationName: "Test",
  };
  expect((await request("/bugs", "POST", input, u.cookie)).status).toBe(401);
  const second = await user("second@example.com");
  await stmt(
    bindings,
    "UPDATE sessions SET expires_at=? WHERE id=?",
    "2000-01-01T00:00:00.000Z",
    second.sessionId,
  ).run();
  expect((await request("/bugs", "POST", input, second.cookie)).status).toBe(
    401,
  );
  expect(await stmt(bindings, "SELECT count(*) n FROM bugs").first("n")).toBe(
    0,
  );
});
test("verification and reset tokens are hashed, purpose-bound, expiring and never returned", async () => {
  const u = await user();
  await stmt(
    bindings,
    "UPDATE users SET email_verified=0 WHERE id=?",
    u.id,
  ).run();
  const result = await request(
    "/auth/verify-email/request",
    "POST",
    {},
    u.cookie,
  );
  const token = tokenFromMail();
  expect(await result.text()).not.toContain(token);
  expect(
    await stmt(bindings, "SELECT token_hash FROM action_tokens").first(
      "token_hash",
    ),
  ).toBe(await digest(token));
  expect(
    (
      await request("/auth/reset-password", "POST", {
        token,
        password: "A replacement passphrase",
      })
    ).status,
  ).toBe(400);
  await stmt(
    bindings,
    "UPDATE action_tokens SET expires_at=?",
    "2000-01-01T00:00:00.000Z",
  ).run();
  expect(
    (await request("/auth/verify-email/confirm", "POST", { token })).status,
  ).toBe(400);
  expect(
    await stmt(
      bindings,
      "SELECT email_verified FROM users WHERE id=?",
      u.id,
    ).first("email_verified"),
  ).toBe(0);
  expect(sent).toHaveLength(1);
});
test("concurrent verification and recovery accept exactly one token consumer", async () => {
  const u = await user();
  await stmt(
    bindings,
    "UPDATE users SET email_verified=0 WHERE id=?",
    u.id,
  ).run();
  await request("/auth/verify-email/request", "POST", {}, u.cookie);
  const verify = tokenFromMail();
  const vr = await Promise.all([
    request("/auth/verify-email/confirm", "POST", { token: verify }),
    request("/auth/verify-email/confirm", "POST", { token: verify }),
  ]);
  expect(vr.map((r) => r.status).sort()).toEqual([200, 400]);
  await request("/auth/forgot-password", "POST", {
    email: "reporter@example.com",
  });
  const reset = tokenFromMail();
  const rr = await Promise.all([
    request("/auth/reset-password", "POST", {
      token: reset,
      password: "First replacement passphrase",
    }),
    request("/auth/reset-password", "POST", {
      token: reset,
      password: "Second replacement passphrase",
    }),
  ]);
  expect(rr.map((r) => r.status).sort()).toEqual([200, 400]);
  expect(
    await stmt(bindings, "SELECT count(*) n FROM sessions").first("n"),
  ).toBe(0);
});
test("changing a password revokes old sessions and outstanding recovery links", async () => {
  const u = await user();
  await stmt(
    bindings,
    "UPDATE users SET password_hash=? WHERE id=?",
    await bcrypt.hash("Original testing passphrase", 12),
    u.id,
  ).run();
  await request("/auth/forgot-password", "POST", {
    email: "reporter@example.com",
  });
  const token = tokenFromMail();
  expect(
    (
      await request(
        "/auth/change-password",
        "POST",
        {
          currentPassword: "Original testing passphrase",
          password: "New testing passphrase 456",
        },
        u.cookie,
      )
    ).status,
  ).toBe(200);
  expect(
    (await request("/auth/profile", "GET", undefined, u.cookie)).status,
  ).toBe(401);
  expect(
    (
      await request("/auth/reset-password", "POST", {
        token,
        password: "Unwanted replacement passphrase",
      })
    ).status,
  ).toBe(400);
});
test("session deletion is scoped to its owner and token values never appear in session lists", async () => {
  const u = await user(),
    other = await user("other@example.com");
  await request(
    `/auth/sessions/${u.sessionId}`,
    "DELETE",
    undefined,
    other.cookie,
  );
  expect(
    (await request("/auth/profile", "GET", undefined, u.cookie)).status,
  ).toBe(200);
  const list = await (
    await request("/auth/sessions", "GET", undefined, u.cookie)
  ).text();
  expect(list).not.toContain(u.token);
  expect(list).not.toContain(await digest(u.token));
});
test("bad JSON, overlong passwords and privilege fields are rejected without writes", async () => {
  const common = {
    email: "test@example.com",
    displayName: "Test",
    password: "Long testing passphrase",
  };
  for (const input of [
    { ...common, isAdmin: true },
    { ...common, password: "é".repeat(40) },
  ])
    expect((await request("/auth/register", "POST", input)).status).toBe(400);
  const response = await app.request(
    `${bindings.APP_ORIGIN}/api/v1/auth/register`,
    {
      method: "POST",
      headers: {
        Origin: bindings.APP_ORIGIN,
        "Content-Type": "application/json",
      },
      body: "{",
    },
    bindings,
  );
  expect(response.status).toBe(400);
  expect(await stmt(bindings, "SELECT count(*) n FROM users").first("n")).toBe(
    0,
  );
});
