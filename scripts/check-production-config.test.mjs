import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { parse } from "comment-json";

async function configs(change) {
  const dir = await mkdtemp(join(tmpdir(), "bugrelay-config-"));
  try {
    const api = parse(
      await readFile("config/worker.production.example.jsonc", "utf8"),
    );
    const web = parse(
      await readFile("config/web.production.example.jsonc", "utf8"),
    );
    api.account_id = web.account_id = "a".repeat(32);
    api.vars.TURNSTILE_SITE_KEY = "local-test-site-key";
    api.d1_databases[0].database_id = "11111111-1111-4111-8111-111111111111";
    api.r2_buckets[0].bucket_name = "local-test-private-bucket";
    change(api, web);
    const paths = [join(dir, "api.json"), join(dir, "web.json")];
    await Promise.all(
      [api, web].map((value, i) => writeFile(paths[i], JSON.stringify(value))),
    );
    return spawnSync(
      process.execPath,
      ["scripts/check-production-config.mjs", ...paths],
      { encoding: "utf8" },
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
test("unresolved example configurations fail closed", () => {
  const result = spawnSync(
    process.execPath,
    [
      "scripts/check-production-config.mjs",
      "config/worker.production.example.jsonc",
      "config/web.production.example.jsonc",
    ],
    { encoding: "utf8" },
  );
  assert.notEqual(result.status, 0);
});
test("resolved local fixture passes without network or deployment", async () => {
  assert.equal((await configs(() => {})).status, 0);
});
for (const [name, change] of [
  [
    "public API route",
    (api) => {
      api.routes = [{ pattern: "api.bugrelay.com" }];
    },
  ],
  [
    "public preview",
    (api) => {
      api.preview_urls = true;
    },
  ],
  [
    "wrong domain",
    (_, web) => {
      web.routes[0].pattern = "other.example";
    },
  ],
  [
    "plaintext secret",
    (api) => {
      api.vars.TURNSTILE_SECRET = "local-test-only";
    },
  ],
  [
    "different account",
    (_, web) => {
      web.account_id = "b".repeat(32);
    },
  ],
  [
    "wrong binding",
    (_, web) => {
      web.services[0].service = "other-api";
    },
  ],
  [
    "unapproved sender",
    (api) => {
      api.vars.EMAIL_FROM = "other@bugrelay.com";
    },
  ],
])
  test(`rejects ${name}`, async () =>
    assert.notEqual((await configs(change)).status, 0));
