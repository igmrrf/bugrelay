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
