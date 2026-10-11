import { readFile } from "node:fs/promises";
import { parse } from "comment-json";
import {
  APPROVED_SENDER,
  PRODUCTION_ORIGIN,
  isApprovedMailbox,
  isRealTurnstileKey,
  isStagingOrigin,
} from "../packages/contracts/src/deployment-policy.mjs";

function check(value, message) {
  if (!value) throw new Error(message);
}
function onlyKeys(value, allowed) {
  return Object.keys(value ?? {}).every((key) => allowed.includes(key));
}
const idPattern =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function databaseId(value) {
  return (
    typeof value === "string" &&
    idPattern.test(value) &&
    value !== "00000000-0000-0000-0000-000000000000"
  );
}
export function validateDeployment(mode, api, web, productionApi) {
  check(
    mode === "production" || mode === "staging",
    "Choose explicit staging or production validation.",
  );
  const staging = mode === "staging";
  for (const config of [api, web]) {
    check(
      /^[a-f0-9]{32}$/.test(config.account_id),
      "Supply a verified account ID.",
    );
    check(
      !JSON.stringify(config).includes("REPLACE_WITH"),
      "Resolve every resource placeholder.",
    );
    check(config.preview_urls === false, "Disable all preview URLs.");
    check(
      !config.env && !config.unsafe && !config.route,
      "Named environment overrides, unsafe bindings and alternate routes are not supported.",
    );
    check(
      config.observability?.logs?.invocation_logs === false,
      "Disable invocation URL logging.",
    );
    for (const key of [
      "kv_namespaces",
      "durable_objects",
      "dispatch_namespaces",
      "hyperdrive",
      "service",
      "secrets_store_secrets",
    ])
      check(
        config[key] === undefined,
        "Unexpected cross-environment binding configuration.",
      );
  }
  check(
    api.account_id === web.account_id,
    "Both Workers must use the same verified account.",
  );
  check(
    api.name === (staging ? "bugrelay-api-staging" : "bugrelay-api") &&
      web.name === (staging ? "bugrelay-web-staging" : "bugrelay-web"),
    "Worker names must match the selected environment.",
  );
  check(
    api.main === "../worker/src/index.ts" &&
      web.main === "../frontend/.open-next/worker.js",
    "Use the reviewed Worker entrypoints.",
  );
  check(
    api.workers_dev === false && !api.routes?.length && !api.services?.length,
    "The API must be private and reachable only through its service binding.",
  );
  check(
    web.workers_dev === staging,
    "workers.dev is allowed only for the staging web Worker.",
  );
  check(
    api.vars?.ENVIRONMENT === mode && web.vars?.ENVIRONMENT === mode,
    "Environment mismatch; never deploy development/test mode.",
  );
  check(
    (staging
      ? isStagingOrigin(api.vars.APP_ORIGIN)
      : api.vars.APP_ORIGIN === PRODUCTION_ORIGIN) &&
      web.vars.APP_ORIGIN === api.vars.APP_ORIGIN,
    "Use the same exact approved HTTPS origin on both Workers.",
  );
  check(
    staging
      ? !web.routes?.length
      : web.routes?.length === 1 &&
          web.routes[0].pattern === "bugrelay.com" &&
          web.routes[0].custom_domain === true,
    "Staging must use only its exact workers.dev hostname; production requires the approved custom domain.",
  );
  check(
    web.assets?.binding === "ASSETS" &&
      web.assets?.directory === "../frontend/.open-next/assets",
    "Frontend assets binding mismatch.",
  );
  check(
    web.services?.length === 1 &&
      web.services[0].binding === "API" &&
      web.services[0].service === api.name &&
      onlyKeys(web.services[0], ["binding", "service"]),
    "Frontend API service binding must target only the selected API Worker.",
  );
  check(
    !web.d1_databases?.length &&
      !web.r2_buckets?.length &&
      !web.send_email?.length,
    "The web Worker must not bind storage or email.",
  );
  check(
    onlyKeys(web.vars, ["ENVIRONMENT", "APP_ORIGIN"]),
    "Unexpected frontend variables.",
  );
  check(
    onlyKeys(api.vars, [
      "ENVIRONMENT",
      "APP_ORIGIN",
      "EMAIL_FROM",
      "TURNSTILE_SITE_KEY",
      ...(staging
        ? ["STAGING_EMAIL_ENABLED", "STAGING_EMAIL_RECIPIENT"]
        : ["GOOGLE_CLIENT_ID", "GITHUB_CLIENT_ID"]),
    ]),
    "Secrets must be bindings; staging OAuth and unexpected variables are forbidden.",
  );
  check(
    api.vars.EMAIL_FROM === APPROVED_SENDER,
    "Sender must be notifications@bugrelay.com.",
  );
  check(
    isRealTurnstileKey(api.vars.TURNSTILE_SITE_KEY),
    "A real environment-specific Turnstile site key is required; dummy keys are forbidden.",
  );
  const db = api.d1_databases?.[0],
    bucket = api.r2_buckets?.[0];
  check(
    api.d1_databases?.length === 1 &&
      db.binding === "DB" &&
      db.database_name ===
        (staging ? "bugrelay-staging" : "bugrelay-production") &&
      databaseId(db.database_id) &&
      db.migrations_dir === "../worker/migrations" &&
      onlyKeys(db, [
        "binding",
        "database_name",
        "database_id",
        "migrations_dir",
      ]),
    "Use the selected environment's fresh D1 database and migrations, without remote/preview overrides.",
  );
  check(
    api.r2_buckets?.length === 1 &&
      bucket.binding === "ATTACHMENTS" &&
      typeof bucket.bucket_name === "string" &&
      bucket.bucket_name.length > 0 &&
      (staging
        ? bucket.bucket_name === "bugrelay-attachments-staging"
        : !/staging|(?:^|-)local$/.test(bucket.bucket_name)) &&
      onlyKeys(bucket, ["binding", "bucket_name"]),
    "Use the selected environment's private R2 bucket, without remote/preview overrides.",
  );
  if (staging && productionApi) {
    check(
      productionApi.vars?.ENVIRONMENT === "production" &&
        databaseId(productionApi.d1_databases?.[0]?.database_id),
      "Supply a resolved production API configuration for resource isolation comparison.",
    );
    check(
      db.database_id !== productionApi.d1_databases[0].database_id &&
        bucket.bucket_name !== productionApi.r2_buckets?.[0]?.bucket_name &&
        api.name !== productionApi.name,
      "Staging must not reuse production resources.",
    );
  }
  const email = api.send_email?.[0];
  const emailEnabled = !staging || api.vars.STAGING_EMAIL_ENABLED === "true";
  check(
    !staging || ["true", "false"].includes(api.vars.STAGING_EMAIL_ENABLED),
    "Explicitly enable or disable staging email.",
  );
  if (emailEnabled) {
    check(
      api.send_email?.length === 1 &&
        email.name === "EMAIL" &&
        email.allowed_sender_addresses?.length === 1 &&
        email.allowed_sender_addresses[0] === APPROVED_SENDER &&
        onlyKeys(email, [
          "name",
          "allowed_sender_addresses",
          ...(staging ? ["allowed_destination_addresses"] : []),
        ]),
      "Restrict the Email binding to the approved sender without remote/local overrides.",
    );
    if (staging)
      check(
        isApprovedMailbox(api.vars.STAGING_EMAIL_RECIPIENT) &&
          email.allowed_destination_addresses?.length === 1 &&
          email.allowed_destination_addresses[0] ===
            api.vars.STAGING_EMAIL_RECIPIENT,
        "Staging email must be restricted to exactly one approved matching test mailbox.",
      );
  } else
    check(
      !api.send_email?.length && !api.vars.STAGING_EMAIL_RECIPIENT,
      "Disabled staging email must have no email binding or recipient.",
    );
}
export async function checkFiles(mode, paths, productionPath) {
  check(paths.length === 2, "Supply API_CONFIG and WEB_CONFIG.");
  const configs = await Promise.all(
    paths.map(async (path) => parse(await readFile(path, "utf8"))),
  );
  const production = productionPath
    ? parse(await readFile(productionPath, "utf8"))
    : undefined;
  validateDeployment(mode, ...configs, production);
  console.log(
    `${mode} configuration checks passed locally. Verify actual account/subdomain, fresh D1 identity, private R2, real Turnstile secret/widget and any approved email destination before deployment. No network or resource changes made.`,
  );
}
