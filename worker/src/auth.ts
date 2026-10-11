import { Hono } from "hono";
import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  emailSchema,
  loginSchema,
  passwordSchema,
  registrationSchema,
} from "@bugrelay/contracts";
import {
  audit,
  body,
  challenge,
  createSession,
  digest,
  fail,
  id,
  now,
  rateLimit,
  requireUser,
  row,
  rows,
  setSessionCookie,
  stmt,
  userDTO,
} from "./core";
import { sendActionEmail } from "./email";
import type { AppEnv, UserRow } from "./types";

const auth = new Hono<AppEnv>();
// Cost-equivalent work prevents unknown users taking a shortcut through login.
const dummyHash =
  "$2b$12$vh18OXKMzUd4EVUIbNYqSuOSQPBWg.HJKIp4.Hyu7VHXFy8HdHmXi";
auth.post("/register", async (c) => {
  await rateLimit(c, "signup", 5, 3600);
  const input = await body(c, registrationSchema);
  await challenge(c, input.turnstileToken);
  if (await row(c.env, "SELECT id FROM users WHERE email=?", input.email))
    fail(
      409,
      "EMAIL_IN_USE",
      "Unable to register this email. Try signing in or recovering your account.",
    );
  const userId = id();
  const created = now();
  const hash = await bcrypt.hash(input.password, 12);
  try {
    await c.env.DB.batch([
      stmt(
        c.env,
        "INSERT INTO users(id,email,display_name,password_hash,created_at,updated_at) VALUES(?,?,?,?,?,?)",
        userId,
        input.email,
        input.displayName,
        hash,
        created,
        created,
      ),
      audit(c.env, userId, "register", "user", userId),
    ]);
  } catch (e) {
    if (String(e).includes("UNIQUE"))
      fail(409, "EMAIL_IN_USE", "Unable to register this email.");
    throw e;
  }
  const u = (await row<UserRow>(
    c.env,
    "SELECT * FROM users WHERE id=?",
    userId,
  ))!;
  // Registration survives a delivery outage; the signed-in user can resend.
  await createSession(c, { id: userId, password_hash: hash, auth_epoch: 0 });
  let emailSent = true;
  try {
    await sendActionEmail(c.env, u, "verify");
  } catch {
    emailSent = false;
  }
  return c.json({ user: await userDTO(c.env, u), emailSent }, 201);
});
auth.post("/login", async (c) => {
  await rateLimit(c, "login-ip", 30, 900);
  const input = await body(c, loginSchema);
  await rateLimit(c, "login-email", 10, 900, input.email);
  await challenge(c, input.turnstileToken);
  const u = await row<UserRow>(
    c.env,
    "SELECT * FROM users WHERE email=?",
    input.email,
  );
  const matches = await bcrypt.compare(
    input.password,
    u?.password_hash ?? dummyHash,
  );
  if (!u || !u.password_hash || !matches || u.suspended)
    fail(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  await createSession(c, u);
  await audit(c.env, u.id, "login", "user", u.id).run();
  return c.json({ user: await userDTO(c.env, u) });
});
auth.post("/logout", async (c) => {
  const s = c.get("session");
  if (s) await stmt(c.env, "DELETE FROM sessions WHERE id=?", s.id).run();
  setSessionCookie(c, "", 0);
  return c.json({ message: "Signed out." });
});
auth.get("/profile", async (c) =>
  c.json(await userDTO(c.env, requireUser(c, false))),
);
auth.patch("/profile", async (c) => {
  const u = requireUser(c, false);
  const v = await body(
    c,
    z.object({ displayName: z.string().trim().min(2).max(80) }).strict(),
  );
  await stmt(
    c.env,
    "UPDATE users SET display_name=?,updated_at=? WHERE id=?",
    v.displayName,
    now(),
    u.id,
  ).run();
  return c.json(await userDTO(c.env, { ...u, display_name: v.displayName }));
});
auth.get("/sessions", async (c) => {
  const u = requireUser(c, false);
  const items = await rows<{
    id: string;
    created_at: string;
    expires_at: string;
  }>(
    c.env,
    "SELECT id,created_at,expires_at FROM sessions WHERE user_id=? AND expires_at>? ORDER BY created_at DESC",
    u.id,
    now(),
  );
  return c.json({
    sessions: items.map((s) => ({
      id: s.id,
      createdAt: s.created_at,
      expiresAt: s.expires_at,
      isCurrent: s.id === c.get("session")?.id,
    })),
  });
});
auth.delete("/sessions/:id", async (c) => {
  const u = requireUser(c, false);
  await stmt(
    c.env,
    "DELETE FROM sessions WHERE id=? AND user_id=?",
    c.req.param("id"),
    u.id,
  ).run();
  if (c.get("session")?.id === c.req.param("id")) setSessionCookie(c, "", 0);
  return c.json({ message: "Session revoked." });
});
auth.post("/sessions/revoke-all", async (c) => {
  const u = requireUser(c, false);
  // The epoch trigger deletes current sessions in the same transaction and
  // prevents already-running credential checks from creating replacements.
  await stmt(
    c.env,
    "UPDATE users SET auth_epoch=auth_epoch+1 WHERE id=?",
    u.id,
  ).run();
  setSessionCookie(c, "", 0);
  return c.json({ message: "All sessions revoked." });
});
auth.post("/verify-email/request", async (c) => {
  const u = requireUser(c, false);
  await rateLimit(c, "verification", 3, 3600, u.id);
  if (!u.email_verified) await sendActionEmail(c.env, u, "verify");
  return c.json({ message: "Verification email sent." });
});
auth.post("/verify-email/confirm", async (c) => {
  await rateLimit(c, "verify-token", 20, 900);
  const { token } = await body(
    c,
    z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
  );
  const hash = await digest(token);
  const time = now();
  // Update and consume in one atomic batch; subsequent requests see no valid token.
  const results = await c.env.DB.batch([
    stmt(
      c.env,
      "UPDATE users SET email_verified=1,updated_at=? WHERE id=(SELECT user_id FROM action_tokens WHERE token_hash=? AND purpose='verify' AND consumed_at IS NULL AND expires_at>? AND email=users.email) RETURNING id",
      time,
      hash,
      time,
    ),
    stmt(
      c.env,
      "UPDATE action_tokens SET consumed_at=? WHERE token_hash=? AND purpose='verify' AND consumed_at IS NULL AND expires_at>?",
      time,
      hash,
      time,
    ),
  ]);
  if (!results[0].results.length)
    fail(400, "INVALID_TOKEN", "This link is invalid or expired.");
  return c.json({ message: "Email verified." });
});
auth.post("/forgot-password", async (c) => {
  await rateLimit(c, "reset-ip", 10, 3600);
  const input = await body(
    c,
    z
      .object({
        email: emailSchema,
        turnstileToken: z.string().max(2048).optional(),
      })
      .strict(),
  );
  await challenge(c, input.turnstileToken);
  await rateLimit(c, "reset-email", 3, 3600, input.email);
  const u = await row<UserRow>(
    c.env,
    "SELECT * FROM users WHERE email=? AND suspended=0",
    input.email,
  );
  if (u) {
    try {
      await sendActionEmail(c.env, u, "reset");
    } catch {
      /* Identical response avoids revealing account or delivery state. */
    }
  }
  return c.json({
    message: "If an account exists, a password reset email has been sent.",
  });
});
auth.post("/reset-password", async (c) => {
  await rateLimit(c, "reset-token", 10, 900);
  const input = await body(
    c,
    z
      .object({
        token: z.string().regex(/^[a-f0-9]{64}$/),
        password: passwordSchema,
      })
      .strict(),
  );
  const tokenHash = await digest(input.token);
  const time = now();
  const token = await row<{ user_id: string }>(
    c.env,
    "SELECT user_id FROM action_tokens WHERE token_hash=? AND purpose='reset' AND consumed_at IS NULL AND expires_at>?",
    tokenHash,
    time,
  );
  if (!token) fail(400, "INVALID_TOKEN", "This link is invalid or expired.");
  const hash = await bcrypt.hash(input.password, 12),
    claim = id();
  const result = await c.env.DB.batch([
    stmt(
      c.env,
      "UPDATE action_tokens SET consumed_at=?,consumed_by=? WHERE token_hash=? AND purpose='reset' AND consumed_at IS NULL AND expires_at>? RETURNING user_id",
      time,
      claim,
      tokenHash,
      time,
    ),
    stmt(
      c.env,
      "UPDATE users SET password_hash=?,updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM action_tokens WHERE token_hash=? AND consumed_by=? AND email=users.email)",
      hash,
      time,
      token.user_id,
      tokenHash,
      claim,
    ),
    stmt(
      c.env,
      "DELETE FROM sessions WHERE user_id=? AND EXISTS(SELECT 1 FROM action_tokens WHERE token_hash=? AND consumed_by=?)",
      token.user_id,
      tokenHash,
      claim,
    ),
    stmt(
      c.env,
      "UPDATE action_tokens SET consumed_at=? WHERE user_id=? AND purpose='reset' AND EXISTS(SELECT 1 FROM action_tokens WHERE token_hash=? AND consumed_by=?)",
      time,
      token.user_id,
      tokenHash,
      claim,
    ),
  ]);
  if (!result[0].results.length)
    fail(400, "INVALID_TOKEN", "This link is invalid or expired.");
  await audit(
    c.env,
    token.user_id,
    "password_reset",
    "user",
    token.user_id,
  ).run();
  setSessionCookie(c, "", 0);
  return c.json({ message: "Password changed. Please sign in again." });
});
auth.post("/change-password", async (c) => {
  const u = requireUser(c);
  await rateLimit(c, "change-password", 5, 900, u.id);
  const v = await body(
    c,
    z
      .object({
        currentPassword: z.string().min(1).max(72),
        password: passwordSchema,
      })
      .strict(),
  );
  if (
    !u.password_hash ||
    !(await bcrypt.compare(v.currentPassword, u.password_hash))
  )
    fail(400, "INVALID_PASSWORD", "Current password is incorrect.");
  const hash = await bcrypt.hash(v.password, 12);
  const result = await c.env.DB.batch([
    stmt(
      c.env,
      "UPDATE users SET password_hash=?,updated_at=? WHERE id=? AND password_hash=? AND auth_epoch=? AND suspended=0 AND EXISTS(SELECT 1 FROM sessions WHERE id=? AND user_id=users.id AND expires_at>?) RETURNING id",
      hash,
      now(),
      u.id,
      u.password_hash,
      u.auth_epoch,
      c.get("session")!.id,
      now(),
    ),
    stmt(
      c.env,
      "DELETE FROM sessions WHERE user_id=? AND EXISTS(SELECT 1 FROM users WHERE id=? AND password_hash=?)",
      u.id,
      u.id,
      hash,
    ),
    stmt(
      c.env,
      "UPDATE action_tokens SET consumed_at=? WHERE user_id=? AND purpose='reset' AND EXISTS(SELECT 1 FROM users WHERE id=? AND password_hash=?)",
      now(),
      u.id,
      u.id,
      hash,
    ),
  ]);
  if (!result[0].results.length)
    fail(
      409,
      "PASSWORD_CHANGED",
      "Your password changed during this request. Please sign in again.",
    );
  await audit(c.env, u.id, "password_changed", "user", u.id).run();
  setSessionCookie(c, "", 0);
  return c.json({ message: "Password changed. Please sign in again." });
});
export default auth;
