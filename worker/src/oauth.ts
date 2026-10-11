import { Hono } from "hono";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { emailSchema, isSecureEnvironment } from "@bugrelay/contracts";
import { getCookie, setCookie } from "hono/cookie";
import {
  audit,
  body,
  requireUser,
  rows,
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
import type { AppEnv, Ctx, Env, UserRow } from "./types";
const oauth = new Hono<AppEnv>();
function settings(env: Env, provider: string) {
  if (env.ENVIRONMENT === "staging")
    fail(404, "PROVIDER_UNAVAILABLE", "OAuth is disabled in staging.");
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
  isSecureEnvironment(env.ENVIRONMENT)
    ? "__Host-bugrelay_oauth"
    : "bugrelay_oauth";
oauth.get("/accounts", async (c) => {
  const u = requireUser(c);
  const accounts = await rows<{ provider: string }>(
    c.env,
    "SELECT provider FROM oauth_accounts WHERE user_id=? ORDER BY provider",
    u.id,
  );
  return c.json({ accounts, hasPassword: !!u.password_hash });
});
oauth.post("/:provider/link", async (c) => {
  const u = requireUser(c),
    session = c.get("session")!;
  await rateLimit(c, "oauth-link", 5, 900, u.id);
  const v = await body(
    c,
    z.object({ currentPassword: z.string().max(72).optional() }).strict(),
  );
  if (u.password_hash) {
    if (
      !v.currentPassword ||
      new TextEncoder().encode(v.currentPassword).length > 72 ||
      !(await bcrypt.compare(v.currentPassword, u.password_hash))
    )
      fail(
        401,
        "REAUTH_REQUIRED",
        "Confirm your current password before linking an account.",
      );
  } else if (Date.parse(session.created_at) < Date.now() - 10 * 60000)
    fail(
      401,
      "REAUTH_REQUIRED",
      "Sign in again with your existing provider before linking another account.",
    );
  const url = await beginOAuth(c, "link", u.id, session.id);
  return c.json({ url });
});
async function beginOAuth(
  c: Ctx,
  intent: "login" | "link",
  userId: string | null = null,
  sessionId: string | null = null,
) {
  await rateLimit(c, "oauth-start", 20, 900);
  const config = settings(c.env, c.req.param("provider")!);
  const state = randomToken(),
    browser = randomToken(),
    verifier = randomToken();
  await stmt(
    c.env,
    "INSERT INTO oauth_states(state_hash,provider,verifier,browser_hash,expires_at,intent,user_id,session_id) VALUES(?,?,?,?,?,?,?,?)",
    await digest(state),
    config.provider,
    verifier,
    await digest(browser),
    new Date(Date.now() + 600000).toISOString(),
    intent,
    userId,
    sessionId,
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
  if (intent === "link")
    url.searchParams.set(
      config.provider === "google" ? "prompt" : "allow_signup",
      config.provider === "google" ? "select_account" : "false",
    );
  return url.toString();
}
oauth.get("/:provider", async (c) => c.redirect(await beginOAuth(c, "login")));
oauth.get("/:provider/callback", async (c) => {
  await rateLimit(c, "oauth-callback", 30, 900);
  const config = settings(c.env, c.req.param("provider")!);
  const state = c.req.query("state"),
    code = c.req.query("code"),
    browser = getCookie(c, stateCookie(c.env));
  if (!state || !code || !browser || state.length > 128 || code.length > 2048)
    fail(400, "INVALID_OAUTH", "Invalid sign-in response.");
  const saved = await row<{
    verifier: string;
    intent: "login" | "link";
    user_id: string | null;
    session_id: string | null;
  }>(
    c.env,
    "DELETE FROM oauth_states WHERE state_hash=? AND provider=? AND browser_hash=? AND expires_at>? RETURNING verifier,intent,user_id,session_id",
    await digest(state),
    config.provider,
    await digest(browser),
    now(),
  );
  if (!saved) fail(400, "INVALID_OAUTH", "Sign-in expired. Please try again.");
  if (
    saved.intent === "link" &&
    (!c.get("user")?.email_verified ||
      c.get("user")?.id !== saved.user_id ||
      c.get("session")?.id !== saved.session_id)
  )
    fail(
      401,
      "LINK_SESSION_CHANGED",
      "Sign in and start account linking again.",
    );
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
  if (saved.intent === "link") {
    // Re-check the authoritative session after the provider network round trip.
    const live = await row(
      c.env,
      "SELECT s.id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.user_id=? AND s.expires_at>? AND u.suspended=0 AND u.email_verified=1",
      saved.session_id,
      saved.user_id,
      now(),
    );
    if (!live)
      fail(
        401,
        "LINK_SESSION_CHANGED",
        "Sign in and start account linking again.",
      );
    const result = await stmt(
      c.env,
      "INSERT INTO oauth_accounts(provider,subject,user_id) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.user_id=? AND s.expires_at>? AND u.suspended=0 AND u.email_verified=1) ON CONFLICT DO NOTHING RETURNING user_id",
      config.provider,
      subject,
      saved.user_id,
      saved.session_id,
      saved.user_id,
      now(),
    ).first();
    const linked = await row<{ user_id: string }>(
      c.env,
      "SELECT user_id FROM oauth_accounts WHERE provider=? AND subject=?",
      config.provider,
      subject,
    );
    if (linked?.user_id !== saved.user_id)
      fail(
        409,
        "LINK_CONFLICT",
        "This provider identity is already linked, or you have another account linked for this provider.",
      );
    if (result)
      await audit(
        c.env,
        saved.user_id!,
        "oauth_account_linked",
        "user",
        saved.user_id!,
      ).run();
    return c.redirect(`${c.env.APP_ORIGIN}/profile`);
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
        "An account already uses this email. Sign in with your existing method and link the provider in account settings. OAuth is not linked automatically.",
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
    // New-account issuance is bound to the initial account state.
    user.auth_epoch = 0;
  }
  if (user.suspended)
    fail(403, "ACCOUNT_UNAVAILABLE", "This account is unavailable.");
  await createSession(c, user);
  return c.redirect(`${c.env.APP_ORIGIN}/dashboard`);
});
export default oauth;
