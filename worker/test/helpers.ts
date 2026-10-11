import { env } from "cloudflare:workers";
import { applyD1Migrations, reset } from "cloudflare:test";
import { expect, vi } from "vitest";
import type { D1Migration } from "@cloudflare/vitest-plugin";
import { app } from "../src/index";
import { digest, id, now, randomToken, stmt } from "../src/core";
import type { Env } from "../src/types";
export const base = env as unknown as Env & { MIGRATIONS: D1Migration[] };
export let bindings: Env;
export let sent: { to: string; text: string }[] = [];
export async function setup() {
  vi.restoreAllMocks();
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
}
export async function request(
  path: string,
  method = "GET",
  data?: unknown,
  cookie?: string,
  override: Partial<Env> = {},
) {
  const environment = { ...bindings, ...override };
  return app.request(
    `${environment.APP_ORIGIN}/api/v1${path}`,
    {
      method,
      headers: {
        Origin: environment.APP_ORIGIN,
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
    environment,
  );
}
export async function user(email = "reporter@example.com", admin = false) {
  const uid = id(),
    token = randomToken(),
    time = now();
  await stmt(
    bindings,
    "INSERT INTO users(id,email,display_name,is_admin,email_verified,created_at,updated_at) VALUES(?,?,?,?,1,?,?)",
    uid,
    email,
    email.split("@")[0],
    Number(admin),
    time,
    time,
  ).run();
  const sid = id();
  await stmt(
    bindings,
    "INSERT INTO sessions(id,token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?,?)",
    sid,
    await digest(token),
    uid,
    new Date(Date.now() + 3600000).toISOString(),
    time,
  ).run();
  return {
    id: uid,
    sessionId: sid,
    cookie: `bugrelay_session=${token}`,
    token,
  };
}
export async function bug(
  cookie?: string,
  extra: Record<string, unknown> = {},
) {
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
export const tokenFromMail = (index = sent.length - 1) =>
  new URL(sent[index].text.match(/https?:\/\/\S+/)![0]).hash.split("=")[1];
export async function company(owner: { id: string }, domain: string) {
  const cid = id(),
    time = now();
  await bindings.DB.batch([
    stmt(
      bindings,
      "INSERT INTO companies(id,name,domain,is_verified,created_at,updated_at) VALUES(?,?,?,1,?,?)",
      cid,
      domain,
      domain,
      time,
      time,
    ),
    stmt(
      bindings,
      "INSERT INTO company_members(id,company_id,user_id,role,created_at) VALUES(?,?,?,'admin',?)",
      id(),
      cid,
      owner.id,
      time,
    ),
  ]);
  return cid;
}
export const png = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aAVsAAAAASUVORK5CYII=",
  ),
  (c) => c.charCodeAt(0),
);
export function upload(bytes = png) {
  const form = new FormData();
  form.set("file", new File([bytes], "proof.png", { type: "image/png" }));
  return form;
}
export const production: Partial<Env> = {
  ENVIRONMENT: "production",
  APP_ORIGIN: "https://bugrelay.com",
  EMAIL_FROM: "notifications@bugrelay.com",
  TURNSTILE_SITE_KEY: "test-site-key",
  TURNSTILE_SECRET: "test-secret-not-a-real-credential",
};
