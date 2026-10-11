import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { bodyLimit } from "hono/body-limit";
import { fail, id, loadSession, now, row, rows, stmt } from "./core";
import auth from "./auth";
import oauth from "./oauth";
import bugs from "./bugs";
import companies from "./companies";
import admin from "./admin";
import attachments from "./attachments";
import type { AppEnv, Env } from "./types";
export const app = new Hono<AppEnv>({ strict: false });
app.use("*", async (c, next) => {
  c.set("requestId", id());
  c.header("X-Request-ID", c.get("requestId"));
  c.header("Cache-Control", "private, no-store");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  if (
    c.env.ENVIRONMENT === "production" &&
    (c.env.APP_ORIGIN !== "https://bugrelay.com" ||
      !c.env.TURNSTILE_SECRET ||
      !c.env.TURNSTILE_SITE_KEY ||
      c.env.EMAIL_FROM !== "notifications@bugrelay.com")
  )
    fail(503, "CONFIGURATION_REQUIRED", "Service configuration is incomplete.");
  if (
    !["GET", "HEAD", "OPTIONS"].includes(c.req.method) &&
    c.req.header("Origin") !== c.env.APP_ORIGIN
  )
    fail(403, "INVALID_ORIGIN", "Request origin is not allowed.");
  await next();
});
app.use(
  "*",
  bodyLimit({
    maxSize: 6 * 1024 * 1024,
    onError: (c) =>
      c.json(
        {
          error: {
            code: "BODY_TOO_LARGE",
            message: "Request is too large.",
            requestId: c.get("requestId"),
          },
        },
        413,
      ),
  }),
);
app.get("/api/v1/health", async (c) => {
  await stmt(c.env, "SELECT 1").first();
  return c.json({ status: "ok", timestamp: now() });
});
app.get("/api/v1/config", (c) =>
  c.json({
    turnstileSiteKey:
      c.env.ENVIRONMENT === "production" ? c.env.TURNSTILE_SITE_KEY : null,
    oauthProviders: [
      ...(c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET
        ? ["google"]
        : []),
      ...(c.env.GITHUB_CLIENT_ID && c.env.GITHUB_CLIENT_SECRET
        ? ["github"]
        : []),
    ],
  }),
);
app.use("/api/v1/*", async (c, next) => {
  await loadSession(c);
  await next();
});
app.route("/api/v1/auth/oauth", oauth);
app.route("/api/v1/auth", auth);
app.route("/api/v1/bugs", bugs);
app.route("/api/v1/bugs", attachments);
app.route("/api/v1/companies", companies);
app.route("/api/v1/admin", admin);
app.notFound((c) =>
  c.json(
    {
      error: {
        code: "NOT_FOUND",
        message: "Endpoint not found.",
        requestId: c.get("requestId"),
      },
    },
    404,
  ),
);
app.onError((error, c) => {
  if (error instanceof HTTPException) {
    const response = error.getResponse();
    return response
      .json<{ error: { code: string; message: string } }>()
      .then((data) =>
        c.json(
          { error: { ...data.error, requestId: c.get("requestId") } },
          error.status,
        ),
      );
  }
  if (
    String(error).includes("LAST_COMPANY_ADMIN") ||
    String(error).includes("LAST_PLATFORM_ADMIN")
  )
    return c.json(
      {
        error: {
          code: "LAST_ADMIN",
          message:
            "Add another administrator before removing or suspending the last one.",
          requestId: c.get("requestId"),
        },
      },
      409,
    );
  if (String(error).includes("UNIQUE constraint"))
    return c.json(
      {
        error: {
          code: "CONFLICT",
          message: "This record already exists.",
          requestId: c.get("requestId"),
        },
      },
      409,
    );
  // Never include request bodies, query strings, cookies, SQL values or error messages.
  console.error(
    JSON.stringify({
      event: "request_failed",
      requestId: c.get("requestId"),
      method: c.req.method,
    }),
  );
  return c.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Request failed. Please try again.",
        requestId: c.get("requestId"),
      },
    },
    500,
  );
});
export async function cleanup(env: Env) {
  const time = now(),
    cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  await env.DB.batch([
    stmt(env, "DELETE FROM sessions WHERE expires_at<?", time),
    stmt(env, "DELETE FROM action_tokens WHERE expires_at<?", time),
    stmt(env, "DELETE FROM oauth_states WHERE expires_at<?", time),
    stmt(
      env,
      "DELETE FROM rate_limits WHERE window_start<?",
      Math.floor(Date.now() / 1000) - 86400,
    ),
  ]);
  const deleted = await rows<{ id: string }>(
    env,
    "SELECT id FROM bugs WHERE deleted_at<? LIMIT 100",
    cutoff,
  );
  for (const bug of deleted) {
    const objects = await rows<{ object_key: string }>(
      env,
      "SELECT object_key FROM attachments WHERE bug_id=?",
      bug.id,
    );
    if (objects.length)
      await env.ATTACHMENTS.delete(objects.map((o) => o.object_key));
    await stmt(
      env,
      "DELETE FROM bugs WHERE id=? AND deleted_at<?",
      bug.id,
      cutoff,
    ).run();
  }
  // Bounded, resumable orphan sweep compensates for interrupted upload requests.
  const cursor = await row<{ value: string }>(
    env,
    "SELECT value FROM maintenance_state WHERE key='r2_cursor'",
  );
  const objects = await env.ATTACHMENTS.list({
    prefix: "bugs/",
    limit: 100,
    cursor: cursor?.value || undefined,
  });
  for (const object of objects.objects) {
    if (
      object.uploaded.getTime() < Date.now() - 86400000 &&
      !(await row(
        env,
        "SELECT id FROM attachments WHERE object_key=?",
        object.key,
      ))
    )
      await env.ATTACHMENTS.delete(object.key);
  }
  await stmt(
    env,
    "INSERT INTO maintenance_state(key,value) VALUES('r2_cursor',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    objects.truncated ? objects.cursor : "",
  ).run();
}
export default {
  fetch: app.fetch,
  scheduled: (_event: ScheduledController, env: Env, ctx: ExecutionContext) =>
    ctx.waitUntil(cleanup(env)),
};
