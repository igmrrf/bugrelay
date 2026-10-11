import { HTTPException } from "hono/http-exception";
import { getCookie, setCookie } from "hono/cookie";
import type { z } from "zod";
import type { User } from "@bugrelay/contracts";
import { isSecureEnvironment } from "@bugrelay/contracts";
import type { Ctx, Env, SessionRow, UserRow } from "./types";

export const now = () => new Date().toISOString();
export const id = () => crypto.randomUUID();
export const randomToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
export async function digest(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (v) => v.toString(16).padStart(2, "0"),
  ).join("");
}
export function fail(
  status: 400 | 401 | 403 | 404 | 409 | 413 | 415 | 429 | 503,
  code: string,
  message: string,
): never {
  throw new HTTPException(status, {
    res: Response.json({ error: { code, message } }, { status }),
  });
}
export function stmt(env: Env, sql: string, ...values: unknown[]) {
  return env.DB.prepare(sql).bind(...values);
}
export async function row<T>(env: Env, sql: string, ...values: unknown[]) {
  return stmt(env, sql, ...values).first<T>();
}
export async function rows<T>(env: Env, sql: string, ...values: unknown[]) {
  return (await stmt(env, sql, ...values).all<T>()).results;
}
export async function body<T extends z.ZodType>(
  c: Ctx,
  schema: T,
): Promise<z.infer<T>> {
  if (!c.req.header("content-type")?.startsWith("application/json"))
    fail(415, "JSON_REQUIRED", "Send application/json.");
  let value: unknown;
  try {
    value = await c.req.json();
  } catch {
    fail(400, "INVALID_JSON", "Invalid JSON.");
  }
  const result = schema.safeParse(value);
  if (!result.success)
    fail(
      400,
      "INVALID_INPUT",
      result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")
        .slice(0, 1000),
    );
  return result.data;
}
export function requireUser(c: Ctx, verified = true) {
  const u = c.get("user");
  if (!u) fail(401, "AUTH_REQUIRED", "Please sign in.");
  if (verified && !u.email_verified)
    fail(403, "EMAIL_UNVERIFIED", "Verify your email first.");
  return u;
}
export function requireAdmin(c: Ctx) {
  const u = requireUser(c);
  if (!u.is_admin) fail(403, "FORBIDDEN", "Administrator access required.");
  return u;
}
export function audit(
  env: Env,
  actor: string | null,
  action: string,
  entityType: string,
  entityId: string,
) {
  return stmt(
    env,
    "INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,created_at) VALUES (?,?,?,?,?,?)",
    id(),
    actor,
    action,
    entityType,
    entityId,
    now(),
  );
}
export function pagination(c: Ctx) {
  const page = Math.max(1, Math.min(10000, Number(c.req.query("page")) || 1));
  const limit = Math.max(1, Math.min(100, Number(c.req.query("limit")) || 20));
  return {
    page: Math.floor(page),
    limit: Math.floor(limit),
    offset: (Math.floor(page) - 1) * Math.floor(limit),
  };
}
export function pageResult<T>(
  items: T[],
  total: number,
  p: { page: number; limit: number },
) {
  return {
    items,
    total,
    page: p.page,
    limit: p.limit,
    hasNextPage: p.page * p.limit < total,
  };
}
export const cookieName = (env: Env) =>
  isSecureEnvironment(env.ENVIRONMENT)
    ? "__Host-bugrelay_session"
    : "bugrelay_session";
export function setSessionCookie(c: Ctx, token: string, maxAge = 7 * 86400) {
  setCookie(c, cookieName(c.env), token, {
    httpOnly: true,
    secure: new URL(c.env.APP_ORIGIN).protocol === "https:",
    sameSite: "Lax",
    path: "/",
    maxAge,
  });
}
export async function loadSession(c: Ctx) {
  c.set("user", null);
  c.set("session", null);
  const token = getCookie(c, cookieName(c.env));
  if (!token) return;
  const invalid = () => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(c.req.method) &&
      !c.req.path.startsWith("/api/v1/auth/")
    )
      fail(
        401,
        "SESSION_EXPIRED",
        "Your session has expired. Sign in again before submitting.",
      );
  };
  const s = await row<SessionRow>(
    c.env,
    "SELECT * FROM sessions WHERE token_hash=? AND expires_at>?",
    await digest(token),
    now(),
  );
  if (!s) return invalid();
  const u = await row<UserRow>(
    c.env,
    "SELECT * FROM users WHERE id=? AND suspended=0 AND EXISTS(SELECT 1 FROM sessions WHERE id=? AND user_id=users.id AND expires_at>?)",
    s.user_id,
    s.id,
    now(),
  );
  if (u) {
    c.set("user", u);
    c.set("session", s);
  } else invalid();
}
export async function createSession(
  c: Ctx,
  verified: Pick<UserRow, "id" | "password_hash" | "auth_epoch">,
) {
  const token = randomToken();
  // Check and insert in one SQLite statement. A check followed by an INSERT
  // would still permit reset/revocation while hashing the session token.
  const inserted = await stmt(
    c.env,
    "INSERT INTO sessions(id,token_hash,user_id,expires_at,created_at) SELECT ?,?,id,?,? FROM users WHERE id=? AND password_hash IS ? AND auth_epoch=? AND suspended=0 RETURNING id",
    id(),
    await digest(token),
    new Date(Date.now() + 7 * 86400000).toISOString(),
    now(),
    verified.id,
    verified.password_hash,
    verified.auth_epoch,
  ).first();
  if (!inserted)
    fail(
      401,
      "INVALID_CREDENTIALS",
      "Sign-in state changed. Please sign in again.",
    );
  setSessionCookie(c, token);
}
export async function userDTO(env: Env, u: UserRow): Promise<User> {
  const memberships = await rows<{
    id: string;
    company_id: string;
    role: "admin" | "member";
    name: string;
    domain: string;
    is_verified: number;
  }>(
    env,
    "SELECT m.*,c.name,c.domain,c.is_verified FROM company_members m JOIN companies c ON c.id=m.company_id WHERE m.user_id=?",
    u.id,
  );
  return {
    id: u.id,
    email: u.email,
    displayName: u.display_name,
    isAdmin: !!u.is_admin,
    isEmailVerified: !!u.email_verified,
    createdAt: u.created_at,
    companyMemberships: memberships.map((m) => ({
      id: m.id,
      companyId: m.company_id,
      role: m.role,
      company: {
        id: m.company_id,
        name: m.name,
        domain: m.domain,
        isVerified: !!m.is_verified,
      },
    })),
  };
}
export async function rateLimit(
  c: Ctx,
  scope: string,
  limit: number,
  seconds: number,
  identity?: string,
) {
  const key = await digest(
    `${scope}:${identity ?? c.req.header("CF-Connecting-IP") ?? "local"}`,
  );
  const window = Math.floor(Date.now() / 1000 / seconds) * seconds;
  const r = await row<{ count: number }>(
    c.env,
    "INSERT INTO rate_limits(key,window_start,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window_start=excluded.window_start THEN count+1 ELSE 1 END,window_start=excluded.window_start RETURNING count",
    key,
    window,
  );
  if ((r?.count ?? limit + 1) > limit) {
    c.header("Retry-After", String(seconds));
    fail(429, "RATE_LIMITED", "Too many requests. Please try again later.");
  }
}
export async function challenge(c: Ctx, token?: string) {
  if (c.env.ENVIRONMENT === "development" || c.env.ENVIRONMENT === "test")
    return;
  if (!c.env.TURNSTILE_SECRET || !token)
    fail(400, "CHALLENGE_REQUIRED", "Complete the verification challenge.");
  if (token === "XXXX.DUMMY.TOKEN.XXXX")
    fail(400, "CHALLENGE_FAILED", "Verification challenge failed.");
  let result: { success?: unknown; hostname?: unknown };
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({
          secret: c.env.TURNSTILE_SECRET,
          response: token,
          remoteip: c.req.header("CF-Connecting-IP") ?? "",
        }),
      },
    );
    if (!response.ok) throw new Error("Challenge unavailable");
    result = await response.json();
  } catch {
    fail(
      503,
      "CHALLENGE_UNAVAILABLE",
      "Verification is unavailable. Please try again.",
    );
  }
  if (
    result?.success !== true ||
    result.hostname !== new URL(c.env.APP_ORIGIN).hostname
  )
    fail(400, "CHALLENGE_FAILED", "Verification challenge failed.");
}
