import { Hono } from "hono";
import { z } from "zod";
import { emailSchema } from "@bugrelay/contracts";
import { getCookie, setCookie } from "hono/cookie";
import {
  createSession,
  digest,
  fail,
  id,
  now,
  randomToken,
  rateLimit,
  row,
  stmt,
} from "./core";
import type { AppEnv, Env, UserRow } from "./types";
const oauth = new Hono<AppEnv>();
function settings(env: Env, provider: string) {
  if (provider === "google" && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
    return {
      provider,
      clientId: env.GOOGLE_CLIENT_ID,
      secret: env.GOOGLE_CLIENT_SECRET,
      authorize: "https://accounts.google.com/o/oauth2/v2/auth",
      token: "https://oauth2.googleapis.com/token",
      scope: "openid email profile",
    };
  if (provider === "github" && env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET)
    return {
      provider,
      clientId: env.GITHUB_CLIENT_ID,
      secret: env.GITHUB_CLIENT_SECRET,
      authorize: "https://github.com/login/oauth/authorize",
      token: "https://github.com/login/oauth/access_token",
      scope: "read:user user:email",
    };
  fail(404, "PROVIDER_UNAVAILABLE", "This sign-in provider is not configured.");
}
const stateCookie = (env: Env) =>
  env.ENVIRONMENT === "production" ? "__Host-bugrelay_oauth" : "bugrelay_oauth";
oauth.get("/:provider", async (c) => {
  await rateLimit(c, "oauth-start", 20, 900);
  const config = settings(c.env, c.req.param("provider"));
  const state = randomToken(),
    browser = randomToken(),
    verifier = randomToken();
  await stmt(
    c.env,
    "INSERT INTO oauth_states(state_hash,provider,verifier,browser_hash,expires_at) VALUES(?,?,?,?,?)",
    await digest(state),
    config.provider,
    verifier,
    await digest(browser),
    new Date(Date.now() + 600000).toISOString(),
  ).run();
  setCookie(c, stateCookie(c.env), browser, {
    path: "/",
    httpOnly: true,
    secure: new URL(c.env.APP_ORIGIN).protocol === "https:",
    sameSite: "Lax",
    maxAge: 600,
  });
  const challengeBytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
  );
  const challenge = btoa(String.fromCharCode(...challengeBytes))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const url = new URL(config.authorize);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: `${c.env.APP_ORIGIN}/api/v1/auth/oauth/${config.provider}/callback`,
    response_type: "code",
    scope: config.scope,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return c.redirect(url.toString());
});
oauth.get("/:provider/callback", async (c) => {
  await rateLimit(c, "oauth-callback", 30, 900);
  const config = settings(c.env, c.req.param("provider"));
  const state = c.req.query("state"),
    code = c.req.query("code"),
    browser = getCookie(c, stateCookie(c.env));
  if (!state || !code || !browser || state.length > 128 || code.length > 2048)
    fail(400, "INVALID_OAUTH", "Invalid sign-in response.");
  const saved = await row<{ verifier: string }>(
    c.env,
    "DELETE FROM oauth_states WHERE state_hash=? AND provider=? AND browser_hash=? AND expires_at>? RETURNING verifier",
    await digest(state),
    config.provider,
    await digest(browser),
    now(),
  );
  if (!saved) fail(400, "INVALID_OAUTH", "Sign-in expired. Please try again.");
  setCookie(c, stateCookie(c.env), "", {
    path: "/",
    httpOnly: true,
    secure: new URL(c.env.APP_ORIGIN).protocol === "https:",
    sameSite: "Lax",
    maxAge: 0,
  });
  const tokenResponse = await fetch(config.token, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.secret,
      code,
      code_verifier: saved.verifier,
      grant_type: "authorization_code",
      redirect_uri: `${c.env.APP_ORIGIN}/api/v1/auth/oauth/${config.provider}/callback`,
    }),
  });
  const token = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenResponse.ok || !token.access_token)
    fail(400, "OAUTH_FAILED", "Provider sign-in failed.");
  const headers = {
    Authorization: `Bearer ${token.access_token}`,
    Accept: "application/json",
    "User-Agent": "BugRelay",
  };
  let subject: string, email: string, name: string;
  if (config.provider === "google") {
    const response = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      { headers },
    );
    const parsed = z
      .object({
        sub: z.string().min(1).max(255),
        email: emailSchema,
        email_verified: z.literal(true),
        name: z.string().max(200).nullish(),
      })
      .safeParse(await response.json());
    if (!response.ok || !parsed.success)
      fail(
        400,
        "UNVERIFIED_OAUTH",
        "The provider must supply a verified email.",
      );
    const profile = parsed.data;
    subject = profile.sub;
    email = profile.email.toLowerCase();
    name = profile.name ?? email.split("@")[0];
  } else {
    const [pr, er] = await Promise.all([
      fetch("https://api.github.com/user", { headers }),
      fetch("https://api.github.com/user/emails", { headers }),
    ]);
    if (!pr.ok || !er.ok) fail(400, "OAUTH_FAILED", "Provider sign-in failed.");
    const parsedProfile = z
      .object({
        id: z.number().int().positive(),
        name: z.string().max(200).nullish(),
        login: z.string().min(1).max(200),
      })
      .safeParse(await pr.json());
    const parsedEmails = z
      .array(
        z.object({
          email: emailSchema,
          primary: z.boolean(),
          verified: z.boolean(),
        }),
      )
      .safeParse(await er.json());
    if (!parsedProfile.success || !parsedEmails.success)
      fail(
        400,
        "UNVERIFIED_OAUTH",
        "The provider must supply a verified email.",
      );
    const p = parsedProfile.data,
      verified = parsedEmails.data.find((e) => e.primary && e.verified);
    if (!verified)
      fail(
        400,
        "UNVERIFIED_OAUTH",
        "The provider must supply a verified email.",
      );
    subject = String(p.id);
    email = verified.email.toLowerCase();
    name = p.name ?? p.login;
  }
  let user = await row<UserRow>(
    c.env,
    "SELECT u.* FROM users u JOIN oauth_accounts o ON o.user_id=u.id WHERE o.provider=? AND o.subject=?",
    config.provider,
    subject,
  );
  if (!user) {
    if (await row(c.env, "SELECT id FROM users WHERE email=?", email))
      fail(
        409,
        "ACCOUNT_EXISTS",
        "An account already uses this email. Sign in with your existing password; OAuth is not linked automatically.",
      );
    const userId = id(),
      time = now();
    await c.env.DB.batch([
      stmt(
        c.env,
        "INSERT INTO users(id,email,display_name,email_verified,created_at,updated_at) VALUES(?,?,?,1,?,?)",
        userId,
        email,
        name.slice(0, 80),
        time,
        time,
      ),
      stmt(
        c.env,
        "INSERT INTO oauth_accounts(provider,subject,user_id) VALUES(?,?,?)",
        config.provider,
        subject,
        userId,
      ),
    ]);
    user = (await row<UserRow>(
      c.env,
      "SELECT * FROM users WHERE id=?",
      userId,
    ))!;
  }
  if (user.suspended)
    fail(403, "ACCOUNT_UNAVAILABLE", "This account is unavailable.");
  await createSession(c, user.id);
  return c.redirect(`${c.env.APP_ORIGIN}/dashboard`);
});
export default oauth;
