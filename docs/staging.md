# Isolated staging runbook

This prepares a secure staging deployment; it does not authorize provisioning, credentials, real email or deployment. No staging resources, account workers.dev subdomain, Turnstile widget or approved test mailbox have been verified. Templates retain placeholders and preflight exits nonzero until required values are resolved. Use synthetic reports only.

## Fixed topology

| Component | Exact staging configuration |
| --- | --- |
| API Worker | `bugrelay-api-staging`; `workers_dev:false`, `preview_urls:false`, no routes |
| Web Worker | `bugrelay-web-staging`; `workers_dev:true`, `preview_urls:false`, no custom-domain routes |
| Public origin | `https://bugrelay-web-staging.<verified-account-subdomain>.workers.dev` — exact hostname, no wildcard, path, port or trailing slash |
| API binding | Web `API` → `bugrelay-api-staging`, no environment override |
| D1 | Fresh `bugrelay-staging`, API binding `DB`; never a production database ID |
| R2 | Private `bugrelay-attachments-staging`, API binding `ATTACHMENTS`; public r2.dev/custom-domain access disabled |
| OAuth | Disabled; do not configure Google/GitHub client IDs or secrets |
| Email | Disabled initially; optional single approved destination and sender `notifications@bugrelay.com` |

Both configurations set `ENVIRONMENT=staging`. This mode uses the production authentication and authorization paths, real server-verified Turnstile with exact hostname checking, strict mutation Origin checking, and Secure/HttpOnly/SameSite=Lax `__Host-` session cookies. Request hosts must match the configured origin. Missing/malformed configuration and provider failures fail closed. Cloudflare dummy keys/tokens are rejected. Development/test challenge bypasses work only with loopback origins and loopback request URLs; never deploy those modes publicly.

## Operator values

After obtaining authorized read-only account access, record these values from the actual account, without placing secrets in chat or source control:

| Value | Destination |
| --- | --- |
| Verified 32-hex account ID | `account_id` in both local configs |
| Verified account workers.dev subdomain | Replace `REPLACE_WITH_ACCOUNT_SUBDOMAIN` in both `vars.APP_ORIGIN` values; confirm the resulting hostname belongs to this account |
| Fresh staging D1 UUID | API `d1_databases[0].database_id`; name stays `bugrelay-staging` |
| Real staging Turnstile site key | API `vars.TURNSTILE_SITE_KEY`; widget must allow only the exact staging hostname |
| Corresponding real Turnstile secret | API Worker secret binding `TURNSTILE_SECRET`, supplied through an approved secure prompt/dashboard after separate authorization |
| Optional approved test mailbox | API `vars.STAGING_EMAIL_RECIPIENT` and the sole `allowed_destination_addresses` entry, only when email is explicitly enabled |
| Resolved production API config, if production resources exist | Supply `--production-api` to compare D1 IDs and R2 names; never pass an unresolved example as the inventory |

Offline validation checks names, modes, bindings, origin syntax/equality, placeholders, dummy sitekeys and resource-ID collisions against the supplied production configuration. It cannot prove actual ID-to-name/account ownership, freshness, bucket privacy, DNS ownership, widget setup or sender verification. Inspect the live resource inventory before approving any write. Omitting the production comparison is appropriate only when the operator has confirmed no production resources exist.

## Local preparation and checks

From the repository root, copy the templates to ignored files **in the same config directory**, then fill only the verified values above:

```sh
cp config/worker.staging.example.jsonc config/api.staging.jsonc
cp config/web.staging.example.jsonc config/web.staging.jsonc

node scripts/check-deployment-config.mjs staging config/api.staging.jsonc config/web.staging.jsonc
# If production resources exist, this comparison is required as well:
node scripts/check-deployment-config.mjs staging config/api.staging.jsonc config/web.staging.jsonc --production-api config/api.production.jsonc

npm run build
npm run build:cloudflare
npx wrangler deploy --dry-run --config config/api.staging.jsonc --outdir /tmp/bugrelay-staging-api
npx wrangler deploy --dry-run --config config/web.staging.jsonc --outdir /tmp/bugrelay-staging-web
```

Run the exact preflight again immediately before any separately approved deployment, chained with `&&` so failures stop the command. Do not use `--env`, override Worker names, add public API routes, reuse production data, or substitute development mode. The existing production-only helper still accepts only production configurations:

```sh
node scripts/check-production-config.mjs config/api.production.jsonc config/web.production.jsonc
```

## Optional email approval

With email disabled, keep `STAGING_EMAIL_ENABLED="false"`, omit `STAGING_EMAIL_RECIPIENT` and leave `send_email:[]`. Signup can create an unverified account after a real challenge, but no verification/reset/claim token is generated or delivered; sensitive actions still require verification. Nothing is automatically verified.

Only after the operator has approved one exact test mailbox and verified the sender/destination capability, change the API config to:

```json
{
  "vars": {
    "STAGING_EMAIL_ENABLED": "true",
    "STAGING_EMAIL_RECIPIENT": "REPLACE_WITH_APPROVED_TEST_MAILBOX"
  },
  "send_email": [{
    "name": "EMAIL",
    "allowed_sender_addresses": ["notifications@bugrelay.com"],
    "allowed_destination_addresses": ["REPLACE_WITH_APPROVED_TEST_MAILBOX"]
  }]
}
```

Merge these fields into the complete API config; this fragment is not a deployable replacement. The mailbox must be lowercase and match both places exactly. Application checks also deny all other recipients **before** token creation. Proof for another account is never redirected to the approved mailbox. Do not set `remote:true`; local email simulation must remain local. [Cloudflare binding restrictions](https://developers.cloudflare.com/email-service/configuration/send-bindings/)

## Separately approved execution and live verification

Provisioning fresh D1/R2, configuring a real hostname-restricted Turnstile widget, setting `TURNSTILE_SECRET`, installing bindings, applying remote migrations, deploying either Worker and sending any real mail are separate operator actions. Example commands for a separately approved release include `npx wrangler secret put TURNSTILE_SECRET --config config/api.staging.jsonc`, `npx wrangler d1 migrations apply DB --remote --config config/api.staging.jsonc`, then validated API/web deployments. None were run for this implementation.

After deployment approval, verify the exact workers.dev hostname over HTTPS, host/Origin denials, missing/invalid/real Turnstile challenges, signup/verification/recovery for only the approved mailbox, cookie flags, private-report/attachment denial, independent company review, private API reachability and isolated cleanup/storage. Use real challenges on public staging: [Cloudflare dummy keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) are only for local tests and are explicitly rejected here. Browser automation in CI uses local-only development bindings; mocked staging runtime tests do not establish live Turnstile or email delivery.
