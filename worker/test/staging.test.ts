import { beforeEach, expect, test, vi } from "vitest";
import { app } from "../src/index";
import { stmt } from "../src/core";
import type { Env } from "../src/types";
import { bindings, request, sent, setup, tokenFromMail } from "./helpers";
beforeEach(setup);
const origin = "https://bugrelay-web-staging.fixture-account.workers.dev";
const staging: Partial<Env> = {
  ENVIRONMENT: "staging",
  APP_ORIGIN: origin,
  EMAIL_FROM: "notifications@bugrelay.com",
  TURNSTILE_SITE_KEY: "fixture-real-widget",
  TURNSTILE_SECRET: "fixture-secret-never-live",
  STAGING_EMAIL_ENABLED: "false",
  EMAIL: undefined,
};
const registration = {
  email: "approved@example.com",
  displayName: "Staging tester",
  password: "A secure staging passphrase",
  turnstileToken: "fixture-proof",
};
function verifiedChallenge() {
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async () =>
      Response.json({ success: true, hostname: new URL(origin).hostname }),
    );
}
test("staging exposes a real challenge and disables OAuth without bypassing authentication", async () => {
  expect(
    await (
      await request("/config", "GET", undefined, undefined, staging)
    ).json(),
  ).toEqual({
    turnstileSiteKey: staging.TURNSTILE_SITE_KEY,
    oauthProviders: [],
  });
  expect(
    (await request("/auth/profile", "GET", undefined, undefined, staging))
      .status,
  ).toBe(401);
  expect(
    (await request("/auth/oauth/google", "GET", undefined, undefined, staging))
      .status,
  ).toBe(404);
  for (const [path, input] of [
    ["/auth/register", { ...registration, turnstileToken: undefined }],
    [
      "/auth/login",
      { email: registration.email, password: registration.password },
    ],
    ["/auth/forgot-password", { email: registration.email }],
    [
      "/bugs",
      {
        title: "Staging report requires challenge",
        description:
          "An anonymous request without proof must never create a report.",
        applicationName: "Staging fixture",
      },
    ],
  ] as const)
    expect(
      (await request(path, "POST", input, undefined, staging)).status,
    ).toBe(400);
  expect(await stmt(bindings, "SELECT count(*) n FROM users").first("n")).toBe(
    0,
  );
  expect(await stmt(bindings, "SELECT count(*) n FROM bugs").first("n")).toBe(
    0,
  );
  expect(sent).toHaveLength(0);
});
test.each([
  { success: false, hostname: new URL(origin).hostname },
  { success: true, hostname: "bugrelay.com" },
  { success: "true", hostname: new URL(origin).hostname },
])("staging rejects invalid Siteverify proof %j", async (result) => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(result));
  expect(
    (await request("/auth/register", "POST", registration, undefined, staging))
      .status,
  ).toBe(400);
  expect(await stmt(bindings, "SELECT count(*) n FROM users").first("n")).toBe(
    0,
  );
});
test.each(["network", "http-error", "invalid-json"])(
  "staging fails closed when Siteverify has a %s failure",
  async (failure) => {
    const fetch = vi.spyOn(globalThis, "fetch");
    if (failure === "network")
      fetch.mockRejectedValue(new Error("Provider details must not leak"));
    else
      fetch.mockResolvedValue(
        failure === "http-error"
          ? new Response("private provider details", { status: 503 })
          : new Response("bad-json"),
      );
    const response = await request(
      "/auth/register",
      "POST",
      registration,
      undefined,
      staging,
    );
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("details");
    expect(
      await stmt(bindings, "SELECT count(*) n FROM users").first("n"),
    ).toBe(0);
  },
);
test("staging rejects Cloudflare's dummy token even if an upstream mock would accept it", async () => {
  const fetch = verifiedChallenge();
  expect(
    (
      await request(
        "/auth/register",
        "POST",
        { ...registration, turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" },
        undefined,
        staging,
      )
    ).status,
  ).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
});
test("staging verified signup, recovery and login retain secure host cookies and session revocation", async () => {
  const env: Partial<Env> = {
    ...staging,
    STAGING_EMAIL_ENABLED: "true",
    STAGING_EMAIL_RECIPIENT: registration.email,
    EMAIL: bindings.EMAIL,
  };
  const fetch = verifiedChallenge();
  const registered = await request(
    "/auth/register",
    "POST",
    registration,
    undefined,
    env,
  );
  expect(registered.status).toBe(201);
  expect(((await registered.json()) as { emailSent: boolean }).emailSent).toBe(
    true,
  );
  expect(fetch.mock.calls[0][0]).toBe(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  );
  const params = fetch.mock.calls[0][1]!.body as URLSearchParams;
  expect(params.get("secret")).toBe(staging.TURNSTILE_SECRET);
  expect(params.get("response")).toBe(registration.turnstileToken);
  const header = registered.headers.get("set-cookie")!;
  for (const part of [
    "__Host-bugrelay_session=",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
  ])
    expect(header).toContain(part);
  expect(header.toLowerCase()).not.toContain("domain=");
  const cookie = header.split(";")[0];
  expect(sent[0].to).toBe(registration.email);
  expect(sent[0].text).toContain(`${origin}/verify-email#token=`);
  expect(
    (
      await request(
        "/auth/verify-email/confirm",
        "POST",
        { token: tokenFromMail() },
        cookie,
        env,
      )
    ).status,
  ).toBe(200);
  for (const badOrigin of [
    undefined,
    "null",
    "https://bugrelay.com",
    "https://other.example",
  ]) {
    const response = await app.request(
      `${origin}/api/v1/auth/logout`,
      {
        method: "POST",
        headers: {
          Cookie: cookie,
          "Content-Type": "application/json",
          ...(badOrigin ? { Origin: badOrigin } : {}),
        },
        body: "{}",
      },
      { ...bindings, ...env },
    );
    expect(response.status).toBe(403);
  }
  expect(
    (await request("/auth/profile", "GET", undefined, cookie, env)).status,
  ).toBe(200);
  expect(
    (
      await app.request(
        "https://bugrelay-web-staging.other-account.workers.dev/api/v1/auth/profile",
        { headers: { Cookie: cookie } },
        { ...bindings, ...env },
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await request(
        "/auth/forgot-password",
        "POST",
        { email: registration.email, turnstileToken: "next-proof" },
        undefined,
        env,
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await request(
        "/auth/reset-password",
        "POST",
        { token: tokenFromMail(), password: "Replacement staging passphrase" },
        undefined,
        env,
      )
    ).status,
  ).toBe(200);
  expect(
    (await request("/auth/profile", "GET", undefined, cookie, env)).status,
  ).toBe(401);
  const login = await request(
    "/auth/login",
    "POST",
    {
      email: registration.email,
      password: "Replacement staging passphrase",
      turnstileToken: "fresh-proof",
    },
    undefined,
    env,
  );
  expect(login.status).toBe(200);
  expect(login.headers.get("set-cookie")).toContain("__Host-bugrelay_session=");
});
test.each([false, true])(
  "staging never sends or creates action tokens for an unapproved account (email enabled %s)",
  async (enabled) => {
    const env: Partial<Env> = enabled
      ? {
          ...staging,
          EMAIL: bindings.EMAIL,
          STAGING_EMAIL_ENABLED: "true",
          STAGING_EMAIL_RECIPIENT: registration.email,
        }
      : staging;
    verifiedChallenge();
    const registered = await request(
      "/auth/register",
      "POST",
      { ...registration, email: "other@example.com" },
      undefined,
      env,
    );
    expect(registered.status).toBe(201);
    expect(
      ((await registered.json()) as { emailSent: boolean }).emailSent,
    ).toBe(false);
    const cookie = registered.headers.get("set-cookie")!.split(";")[0];
    expect(
      (await request("/auth/verify-email/request", "POST", {}, cookie, env))
        .status,
    ).toBe(503);
    expect(
      (
        await request(
          "/auth/forgot-password",
          "POST",
          { email: "other@example.com", turnstileToken: "proof" },
          undefined,
          env,
        )
      ).status,
    ).toBe(200);
    expect(sent).toHaveLength(0);
    expect(
      await stmt(bindings, "SELECT count(*) n FROM action_tokens").first("n"),
    ).toBe(0);
    expect(
      await stmt(bindings, "SELECT email_verified FROM users").first(
        "email_verified",
      ),
    ).toBe(0);
  },
);
test.each([
  { APP_ORIGIN: "http://bugrelay-web-staging.fixture.workers.dev" },
  { APP_ORIGIN: "https://*.workers.dev" },
  { APP_ORIGIN: "https://bugrelay.com" },
  { APP_ORIGIN: `${origin}/path` },
  { APP_ORIGIN: `${origin}:8443` },
  { TURNSTILE_SECRET: undefined },
  { TURNSTILE_SITE_KEY: "1x00000000000000000000AA" },
  { TURNSTILE_SECRET: "1x0000000000000000000000000000000AA" },
  { TURNSTILE_SITE_KEY: "REPLACE_WITH_SITE_KEY" },
  { GOOGLE_CLIENT_ID: "unapproved-oauth" },
  { GITHUB_CLIENT_SECRET: "unapproved-oauth" },
  { EMAIL_FROM: "other@bugrelay.com" },
  { STAGING_EMAIL_ENABLED: undefined },
  { STAGING_EMAIL_ENABLED: "true" },
  {
    STAGING_EMAIL_ENABLED: "true",
    STAGING_EMAIL_RECIPIENT: "approved@example.com",
  },
  { STAGING_EMAIL_RECIPIENT: "unapproved@example.com" },
] as Partial<Env>[])(
  "staging rejects incomplete or unsafe configuration %j",
  async (change) => {
    expect(
      (
        await request("/health", "GET", undefined, undefined, {
          ...staging,
          ...change,
        })
      ).status,
    ).toBe(503);
  },
);
test.each(["development", "test"] as const)(
  "%s challenge bypass is restricted to loopback requests",
  async (mode) => {
    const env = { ...bindings, ENVIRONMENT: mode };
    expect((await app.request(`${origin}/api/v1/health`, {}, env)).status).toBe(
      503,
    );
    expect(
      (
        await request("/health", "GET", undefined, undefined, {
          ...env,
          APP_ORIGIN: origin,
        })
      ).status,
    ).toBe(503);
  },
);
