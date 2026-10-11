import { readFile } from "node:fs/promises";
import { parse } from "comment-json";
const paths = process.argv.slice(2);
if (paths.length !== 2)
  throw new Error(
    "Usage: node scripts/check-production-config.mjs API_CONFIG WEB_CONFIG",
  );
const [api, web] = await Promise.all(
  paths.map(async (path) => parse(await readFile(path, "utf8"))),
);
function check(value, message) {
  if (!value) throw new Error(message);
}
for (const config of [api, web]) {
  check(
    /^[a-f0-9]{32}$/.test(config.account_id),
    "Supply a verified account ID.",
  );
  check(
    config.workers_dev === false && config.preview_urls === false,
    "Public workers.dev and preview URLs must remain disabled.",
  );
  check(
    !JSON.stringify(config).includes("REPLACE_WITH"),
    "Resolve every resource placeholder.",
  );
}
check(
  api.account_id === web.account_id,
  "Both Workers must use the verified account.",
);
check(
  api.vars.ENVIRONMENT === "production" &&
    api.vars.APP_ORIGIN === "https://bugrelay.com",
  "Production environment/origin mismatch.",
);
check(
  api.vars.EMAIL_FROM === "notifications@bugrelay.com",
  "Sender must be notifications@bugrelay.com.",
);
check(api.vars.TURNSTILE_SITE_KEY, "Turnstile site key is required.");
check(
  !api.vars.TURNSTILE_SECRET &&
    !api.vars.GOOGLE_CLIENT_SECRET &&
    !api.vars.GITHUB_CLIENT_SECRET,
  "Secrets must be bindings, never plaintext vars.",
);
check(
  /^[a-f0-9-]{36}$/.test(api.d1_databases?.[0]?.database_id) &&
    !/^0+-0+-0+-0+-0+$/.test(api.d1_databases[0].database_id),
  "Supply a real fresh D1 database ID.",
);
check(
  api.r2_buckets?.[0]?.binding === "ATTACHMENTS",
  "Private attachments binding missing.",
);
check(
  api.send_email?.[0]?.allowed_sender_addresses?.includes(
    "notifications@bugrelay.com",
  ),
  "Restrict the Email Sending binding to the approved sender.",
);
check(
  !api.routes?.length,
  "The API must be reachable only through its service binding.",
);
check(
  web.services?.some((v) => v.binding === "API" && v.service === api.name),
  "Frontend API service binding mismatch.",
);
check(
  web.routes?.length === 1 &&
    web.routes[0].pattern === "bugrelay.com" &&
    web.routes[0].custom_domain === true,
  "Review the exact approved custom domain.",
);
check(
  api.d1_databases.length === 1 && api.d1_databases[0].binding === "DB",
  "D1 binding mismatch.",
);
check(
  api.r2_buckets.length === 1 &&
    api.r2_buckets[0].bucket_name &&
    !api.r2_buckets[0].bucket_name.endsWith("-local"),
  "Use the verified private production bucket.",
);
check(
  api.send_email.length === 1 &&
    api.send_email[0].name === "EMAIL" &&
    api.send_email[0].allowed_sender_addresses.length === 1,
  "Email binding must restrict the single approved sender.",
);
check(
  [api, web].every(
    (config) => config.observability?.logs?.invocation_logs === false,
  ),
  "Disable invocation URL logging to avoid storing OAuth codes.",
);
console.log(
  "Local configuration checks passed. Account permissions, bucket privacy, sender verification, secret bindings, DNS and backups still require live verification. No changes made.",
);
