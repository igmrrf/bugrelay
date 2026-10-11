import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { parse } from "comment-json";
import { validateDeployment } from "./deployment-config.mjs";
const template = await Promise.all(
  ["worker", "web"].map(async (name) =>
    parse(await readFile(`config/${name}.staging.example.jsonc`, "utf8")),
  ),
);
test("both staging templates limit CPU time per invocation to 1000 ms", () => {
  for (const config of template) {
    assert.equal(config.limits?.cpu_ms, 1000, config.name);
  }
});
function fixture(email = false) {
  const [api, web] = structuredClone(template);
  api.account_id = web.account_id = "a".repeat(32);
  api.vars.APP_ORIGIN = web.vars.APP_ORIGIN =
    "https://bugrelay-web-staging.fixture-account.workers.dev";
  api.vars.TURNSTILE_SITE_KEY = "fixture-real-staging-site-key";
  api.d1_databases[0].database_id = "22222222-2222-4222-8222-222222222222";
  if (email) {
    api.vars.STAGING_EMAIL_ENABLED = "true";
    api.vars.STAGING_EMAIL_RECIPIENT = "approved@example.com";
    api.send_email = [
      {
        name: "EMAIL",
        allowed_sender_addresses: ["notifications@bugrelay.com"],
        allowed_destination_addresses: ["approved@example.com"],
      },
    ];
  }
  return [api, web];
}
test("staging placeholders block preflight", () => {
  const result = spawnSync(
    process.execPath,
    [
      "scripts/check-deployment-config.mjs",
      "staging",
      "config/worker.staging.example.jsonc",
      "config/web.staging.example.jsonc",
    ],
    { encoding: "utf8" },
  );
  assert.notEqual(result.status, 0);
});
for (const email of [false, true])
  test(`resolved staging fixture with email ${email} passes without network`, () =>
    assert.doesNotThrow(() =>
      validateDeployment("staging", ...fixture(email)),
    ));
for (const [name, change] of [
  ["development mode", (a) => (a.vars.ENVIRONMENT = "development")],
  ["production web mode", (_, w) => (w.vars.ENVIRONMENT = "production")],
  ["production API name", (a) => (a.name = "bugrelay-api")],
  [
    "production D1 name",
    (a) => (a.d1_databases[0].database_name = "bugrelay-production"),
  ],
  [
    "production bucket",
    (a) => (a.r2_buckets[0].bucket_name = "bugrelay-attachments-production"),
  ],
  [
    "production service binding",
    (_, w) => (w.services[0].service = "bugrelay-api"),
  ],
  [
    "service environment override",
    (_, w) => (w.services[0].environment = "production"),
  ],
  [
    "wildcard origin",
    (a, w) => (a.vars.APP_ORIGIN = w.vars.APP_ORIGIN = "https://*.workers.dev"),
  ],
  [
    "origin suffix attack",
    (a, w) => (a.vars.APP_ORIGIN = w.vars.APP_ORIGIN + ".attacker.example"),
  ],
  [
    "HTTP origin",
    (a, w) =>
      (a.vars.APP_ORIGIN = w.vars.APP_ORIGIN.replace("https:", "http:")),
  ],
  [
    "mismatched exact origin",
    (_, w) =>
      (w.vars.APP_ORIGIN = "https://bugrelay-web-staging.other.workers.dev"),
  ],
  ["public API", (a) => (a.workers_dev = true)],
  ["API route", (a) => (a.routes = [{ pattern: "staging.example" }])],
  [
    "web custom domain",
    (_, w) => (w.routes = [{ pattern: "bugrelay.com", custom_domain: true }]),
  ],
  ["preview URL", (_, w) => (w.preview_urls = true)],
  ["foreign account", (_, w) => (w.account_id = "b".repeat(32))],
  ["D1 remote override", (a) => (a.d1_databases[0].remote = true)],
  [
    "R2 preview bucket",
    (a) => (a.r2_buckets[0].preview_bucket_name = "production"),
  ],
  ["OAuth identifier", (a) => (a.vars.GITHUB_CLIENT_ID = "unapproved")],
  [
    "plaintext secret",
    (a) => (a.vars.TURNSTILE_SECRET = "do-not-store-secrets"),
  ],
  [
    "dummy Turnstile sitekey",
    (a) => (a.vars.TURNSTILE_SITE_KEY = "1x00000000000000000000AA"),
  ],
  ["storage on web Worker", (_, w) => (w.d1_databases = [{ binding: "DB" }])],
  [
    "named environment bypass",
    (a) => (a.env = { dev: { vars: { ENVIRONMENT: "development" } } }),
  ],
  ["invocation logs", (a) => (a.observability.logs.invocation_logs = true)],
])
  test(`staging rejects ${name}`, () => {
    const [a, w] = fixture();
    change(a, w);
    assert.throws(() => validateDeployment("staging", a, w));
  });
for (const [name, change] of [
  [
    "extra recipient",
    (a) =>
      a.send_email[0].allowed_destination_addresses.push("other@example.com"),
  ],
  [
    "missing recipient restriction",
    (a) => delete a.send_email[0].allowed_destination_addresses,
  ],
  [
    "mismatched recipient",
    (a) => (a.vars.STAGING_EMAIL_RECIPIENT = "other@example.com"),
  ],
  [
    "wildcard recipient",
    (a) =>
      (a.vars.STAGING_EMAIL_RECIPIENT =
        a.send_email[0].allowed_destination_addresses[0] =
          "*@example.com"),
  ],
  [
    "unapproved sender",
    (a) => (a.send_email[0].allowed_sender_addresses = ["other@bugrelay.com"]),
  ],
  [
    "remote email during local development",
    (a) => (a.send_email[0].remote = true),
  ],
  ["missing enabled email binding", (a) => (a.send_email = [])],
  [
    "email binding while disabled",
    (a) => (a.vars.STAGING_EMAIL_ENABLED = "false"),
  ],
])
  test(`staging rejects ${name}`, () => {
    const [a, w] = fixture(true);
    change(a, w);
    assert.throws(() => validateDeployment("staging", a, w));
  });
test("staging rejects a copied production database ID despite a staging database name", () => {
  const [a, w] = fixture();
  const production = {
    vars: { ENVIRONMENT: "production" },
    name: "bugrelay-api",
    d1_databases: [{ database_id: a.d1_databases[0].database_id }],
    r2_buckets: [{ bucket_name: "private-production" }],
  };
  assert.throws(() => validateDeployment("staging", a, w, production));
  production.d1_databases[0].database_id =
    "11111111-1111-4111-8111-111111111111";
  assert.doesNotThrow(() => validateDeployment("staging", a, w, production));
});
test("production validation never accepts a staging pair or development mode", () => {
  assert.throws(() => validateDeployment("production", ...fixture()));
  assert.throws(() => validateDeployment("development", ...fixture()));
});
