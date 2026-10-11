import { beforeEach, expect, test, vi } from "vitest";
import { bindings, request, setup, user } from "./helpers";
import { digest, stmt } from "../src/core";
import type { Env } from "../src/types";
beforeEach(setup);
const credentials: Partial<Env> = {
  GOOGLE_CLIENT_ID: "test-client-id",
  GOOGLE_CLIENT_SECRET: "test-client-secret",
  GITHUB_CLIENT_ID: "test-github-id",
  GITHUB_CLIENT_SECRET: "test-github-secret",
};
async function start(provider = "google") {
  const r = await request(
    `/auth/oauth/${provider}`,
    "GET",
    undefined,
    undefined,
    credentials,
  );
  expect(r.status).toBe(302);
  const url = new URL(r.headers.get("location")!);
  return {
    state: url.searchParams.get("state")!,
    challenge: url.searchParams.get("code_challenge")!,
    cookie: r.headers.get("set-cookie")!.split(";")[0],
  };
}
function providerMock(email = "new@example.com", verified: unknown = true) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (
      url === "https://oauth2.googleapis.com/token" ||
      url === "https://github.com/login/oauth/access_token"
    )
      return Response.json({ access_token: "test-access-token" });
    if (url === "https://openidconnect.googleapis.com/v1/userinfo")
      return Response.json({
        sub: "google-subject",
        email,
        email_verified: verified,
        name: "Provider User",
      });
    if (url === "https://api.github.com/user")
      return Response.json({ id: 1234, login: "provider-user", name: null });
    if (url === "https://api.github.com/user/emails")
      return Response.json([{ email, primary: true, verified }]);
    throw new Error("Unexpected outbound request");
  });
}
test("OAuth state is browser-bound, provider-bound and PKCE challenge matches the exchanged verifier", async () => {
  const flow = await start(),
    fetch = providerMock();
  expect(
    (
      await request(
        `/auth/oauth/google/callback?state=${flow.state}&code=code`,
        "GET",
        undefined,
        "bugrelay_oauth=wrong",
        credentials,
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await request(
        `/auth/oauth/github/callback?state=${flow.state}&code=code`,
        "GET",
        undefined,
        flow.cookie,
        credentials,
      )
    ).status,
  ).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
  const response = await request(
    `/auth/oauth/google/callback?state=${flow.state}&code=code`,
    "GET",
    undefined,
    flow.cookie,
    credentials,
  );
  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe(
    "http://localhost:3000/dashboard",
  );
  expect(response.headers.get("set-cookie")).toContain("bugrelay_session=");
  const params = fetch.mock.calls[0][1]!.body as URLSearchParams;
  const bytes = Uint8Array.from(
    (await digest(params.get("code_verifier")!)).match(/.{2}/g)!,
    (v) => parseInt(v, 16),
  );
  const challenge = btoa(String.fromCharCode(...bytes))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  expect(challenge).toBe(flow.challenge);
  expect(params.get("redirect_uri")).toBe(
    "http://localhost:3000/api/v1/auth/oauth/google/callback",
  );
  expect(
    (
      await request(
        `/auth/oauth/google/callback?state=${flow.state}&code=code`,
        "GET",
        undefined,
        flow.cookie,
        credentials,
      )
    ).status,
  ).toBe(400);
  expect(fetch).toHaveBeenCalledTimes(2);
});
test.each(["google", "github"])(
  "%s rejects unverified email and does not create a session",
  async (provider) => {
    const flow = await start(provider);
    providerMock("unverified@example.com", false);
    expect(
      (
        await request(
          `/auth/oauth/${provider}/callback?state=${flow.state}&code=code`,
          "GET",
          undefined,
          flow.cookie,
          credentials,
        )
      ).status,
    ).toBe(400);
    expect(
      await stmt(bindings, "SELECT count(*) n FROM users").first("n"),
    ).toBe(0);
    expect(
      await stmt(bindings, "SELECT count(*) n FROM sessions").first("n"),
    ).toBe(0);
  },
);
test("a string pretending to be a verification boolean is rejected", async () => {
  const flow = await start();
  providerMock("unverified@example.com", "false");
  expect(
    (
      await request(
        `/auth/oauth/google/callback?state=${flow.state}&code=code`,
        "GET",
        undefined,
        flow.cookie,
        credentials,
      )
    ).status,
  ).toBe(400);
});
test("matching an existing email cannot link or take over an account", async () => {
  const existing = await user("existing@example.com");
  const flow = await start();
  providerMock("existing@example.com");
  expect(
    (
      await request(
        `/auth/oauth/google/callback?state=${flow.state}&code=code`,
        "GET",
        undefined,
        flow.cookie,
        credentials,
      )
    ).status,
  ).toBe(409);
  expect(
    await stmt(bindings, "SELECT count(*) n FROM oauth_accounts").first("n"),
  ).toBe(0);
  expect(
    await stmt(
      bindings,
      "SELECT count(*) n FROM sessions WHERE user_id=?",
      existing.id,
    ).first("n"),
  ).toBe(1);
});
test("expired state is rejected before contacting any provider", async () => {
  const flow = await start(),
    fetch = providerMock();
  await stmt(
    bindings,
    "UPDATE oauth_states SET expires_at=?",
    "2000-01-01T00:00:00.000Z",
  ).run();
  expect(
    (
      await request(
        `/auth/oauth/google/callback?state=${flow.state}&code=code`,
        "GET",
        undefined,
        flow.cookie,
        credentials,
      )
    ).status,
  ).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
});
test("GitHub success uses verified primary email; a suspended linked user cannot obtain a session", async () => {
  let flow = await start("github");
  providerMock();
  expect(
    (
      await request(
        `/auth/oauth/github/callback?state=${flow.state}&code=code`,
        "GET",
        undefined,
        flow.cookie,
        credentials,
      )
    ).status,
  ).toBe(302);
  await stmt(bindings, "UPDATE users SET suspended=1").run();
  await stmt(bindings, "DELETE FROM sessions").run();
  flow = await start("github");
  expect(
    (
      await request(
        `/auth/oauth/github/callback?state=${flow.state}&code=code`,
        "GET",
        undefined,
        flow.cookie,
        credentials,
      )
    ).status,
  ).toBe(403);
  expect(
    await stmt(bindings, "SELECT count(*) n FROM sessions").first("n"),
  ).toBe(0);
});
async function linkStart(
  cookie: string,
  provider = "google",
  currentPassword?: string,
) {
  const response = await request(
    `/auth/oauth/${provider}/link`,
    "POST",
    currentPassword ? { currentPassword } : {},
    cookie,
    credentials,
  );
  expect(response.status).toBe(200);
  const url = new URL(((await response.json()) as { url: string }).url);
  return {
    state: url.searchParams.get("state")!,
    cookie: `${cookie}; ${response.headers.get("set-cookie")!.split(";")[0]}`,
  };
}
test("linking requires explicit verified authentication, password proof and a strict body", async () => {
  expect(
    (
      await request(
        "/auth/oauth/google/link",
        "POST",
        {},
        undefined,
        credentials,
      )
    ).status,
  ).toBe(401);
  const u = await user(
    "password@example.com",
    false,
    "A strong current password",
  );
  expect(
    (
      await request(
        "/auth/oauth/google/link",
        "POST",
        {},
        u.cookie,
        credentials,
      )
    ).status,
  ).toBe(401);
  expect(
    (
      await request(
        "/auth/oauth/google/link",
        "POST",
        { currentPassword: "wrong" },
        u.cookie,
        credentials,
      )
    ).status,
  ).toBe(401);
  expect(
    (
      await request(
        "/auth/oauth/google/link",
        "POST",
        { currentPassword: "A strong current password", userId: "injected" },
        u.cookie,
        credentials,
      )
    ).status,
  ).toBe(400);
  const flow = await linkStart(u.cookie, "google", "A strong current password");
  providerMock("different-verified@example.com");
  const response = await request(
    `/auth/oauth/google/callback?state=${flow.state}&code=code`,
    "GET",
    undefined,
    flow.cookie,
    credentials,
  );
  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe(
    "http://localhost:3000/profile",
  );
  expect(
    await stmt(bindings, "SELECT user_id FROM oauth_accounts").first("user_id"),
  ).toBe(u.id);
  expect(
    await stmt(bindings, "SELECT email FROM users WHERE id=?", u.id).first(
      "email",
    ),
  ).toBe("password@example.com");
  expect(await stmt(bindings, "SELECT count(*) n FROM users").first("n")).toBe(
    1,
  );
  expect(
    await stmt(bindings, "SELECT count(*) n FROM sessions").first("n"),
  ).toBe(1);
  expect(
    (
      await request(
        `/auth/oauth/google/callback?state=${flow.state}&code=code`,
        "GET",
        undefined,
        flow.cookie,
        credentials,
      )
    ).status,
  ).toBe(400);
});
test("link intent is bound to the original live session and cannot link to a different signed-in user", async () => {
  const u = await user(),
    other = await user("other@example.com"),
    flow = await linkStart(u.cookie),
    fetch = providerMock();
  const wrong = flow.cookie.replace(u.cookie, other.cookie);
  expect(
    (
      await request(
        `/auth/oauth/google/callback?state=${flow.state}&code=code`,
        "GET",
        undefined,
        wrong,
        credentials,
      )
    ).status,
  ).toBe(401);
  expect(fetch).not.toHaveBeenCalled();
  expect(
    await stmt(bindings, "SELECT count(*) n FROM oauth_accounts").first("n"),
  ).toBe(0);
  const revoked = await linkStart(u.cookie);
  await stmt(bindings, "DELETE FROM sessions WHERE id=?", u.sessionId).run();
  expect(
    (
      await request(
        `/auth/oauth/google/callback?state=${revoked.state}&code=code`,
        "GET",
        undefined,
        revoked.cookie,
        credentials,
      )
    ).status,
  ).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
});
test("provider identity already owned by another user cannot be reassigned, even with the same verified email", async () => {
  const owner = await user(),
    other = await user("other@example.com");
  await stmt(
    bindings,
    "INSERT INTO oauth_accounts(provider,subject,user_id) VALUES('google','google-subject',?)",
    owner.id,
  ).run();
  const flow = await linkStart(other.cookie);
  providerMock("other@example.com");
  expect(
    (
      await request(
        `/auth/oauth/google/callback?state=${flow.state}&code=code`,
        "GET",
        undefined,
        flow.cookie,
        credentials,
      )
    ).status,
  ).toBe(409);
  expect(
    await stmt(
      bindings,
      "SELECT user_id FROM oauth_accounts WHERE provider='google'",
    ).first("user_id"),
  ).toBe(owner.id);
});
test("linking rejects unverified provider identity and suspension during the provider request", async () => {
  const u = await user();
  let flow = await linkStart(u.cookie);
  providerMock("user@example.com", false);
  expect(
    (
      await request(
        `/auth/oauth/google/callback?state=${flow.state}&code=code`,
        "GET",
        undefined,
        flow.cookie,
        credentials,
      )
    ).status,
  ).toBe(400);
  vi.restoreAllMocks();
  flow = await linkStart(u.cookie);
  const fetch = providerMock();
  const original = fetch.getMockImplementation()!;
  fetch.mockImplementation(async (input, init) => {
    const response = await original(input, init);
    if (String(input).includes("/userinfo"))
      await stmt(
        bindings,
        "UPDATE users SET suspended=1 WHERE id=?",
        u.id,
      ).run();
    return response;
  });
  expect(
    (
      await request(
        `/auth/oauth/google/callback?state=${flow.state}&code=code`,
        "GET",
        undefined,
        flow.cookie,
        credentials,
      )
    ).status,
  ).toBe(401);
  expect(
    await stmt(bindings, "SELECT count(*) n FROM oauth_accounts").first("n"),
  ).toBe(0);
});
test("passwordless accounts need recent authentication; unverified users cannot start linking", async () => {
  const u = await user();
  await stmt(
    bindings,
    "UPDATE sessions SET created_at=? WHERE id=?",
    new Date(Date.now() - 11 * 60000).toISOString(),
    u.sessionId,
  ).run();
  expect(
    (
      await request(
        "/auth/oauth/github/link",
        "POST",
        {},
        u.cookie,
        credentials,
      )
    ).status,
  ).toBe(401);
  await stmt(
    bindings,
    "UPDATE users SET email_verified=0 WHERE id=?",
    u.id,
  ).run();
  expect(
    (
      await request(
        "/auth/oauth/github/link",
        "POST",
        {},
        u.cookie,
        credentials,
      )
    ).status,
  ).toBe(403);
  expect(
    await stmt(bindings, "SELECT count(*) n FROM oauth_states").first("n"),
  ).toBe(0);
});
test("linked provider sign-in resolves the explicit account and provider links do not expose identity details", async () => {
  const u = await user(),
    flow = await linkStart(u.cookie, "github");
  providerMock("other-verified@example.com");
  expect(
    (
      await request(
        `/auth/oauth/github/callback?state=${flow.state}&code=code`,
        "GET",
        undefined,
        flow.cookie,
        credentials,
      )
    ).status,
  ).toBe(302);
  expect(
    await (
      await request("/auth/oauth/accounts", "GET", undefined, u.cookie)
    ).json(),
  ).toEqual({ accounts: [{ provider: "github" }], hasPassword: false });
  const login = await start("github");
  expect(
    (
      await request(
        `/auth/oauth/github/callback?state=${login.state}&code=code`,
        "GET",
        undefined,
        login.cookie,
        credentials,
      )
    ).status,
  ).toBe(302);
  expect(await stmt(bindings, "SELECT count(*) n FROM users").first("n")).toBe(
    1,
  );
  expect(
    await stmt(
      bindings,
      "SELECT count(*) n FROM sessions WHERE user_id=?",
      u.id,
    ).first("n"),
  ).toBe(2);
});
test("concurrent explicit link attempts cannot assign one provider identity to two users", async () => {
  const a = await user("a@example.com"),
    b = await user("b@example.com"),
    fa = await linkStart(a.cookie),
    fb = await linkStart(b.cookie);
  providerMock("verified@example.com");
  const results = await Promise.all(
    [fa, fb].map((flow) =>
      request(
        `/auth/oauth/google/callback?state=${flow.state}&code=code`,
        "GET",
        undefined,
        flow.cookie,
        credentials,
      ),
    ),
  );
  expect(results.map((r) => r.status).sort()).toEqual([302, 409]);
  expect(
    await stmt(bindings, "SELECT count(*) n FROM oauth_accounts").first("n"),
  ).toBe(1);
  expect([a.id, b.id]).toContain(
    await stmt(bindings, "SELECT user_id FROM oauth_accounts").first("user_id"),
  );
});
test("linking another identity for an already-linked provider does not replace the original", async () => {
  const u = await user();
  await stmt(
    bindings,
    "INSERT INTO oauth_accounts(provider,subject,user_id) VALUES('google','original-identity',?)",
    u.id,
  ).run();
  const flow = await linkStart(u.cookie);
  providerMock();
  expect(
    (
      await request(
        `/auth/oauth/google/callback?state=${flow.state}&code=code`,
        "GET",
        undefined,
        flow.cookie,
        credentials,
      )
    ).status,
  ).toBe(409);
  expect(
    await stmt(
      bindings,
      "SELECT subject FROM oauth_accounts WHERE user_id=?",
      u.id,
    ).first("subject"),
  ).toBe("original-identity");
});
