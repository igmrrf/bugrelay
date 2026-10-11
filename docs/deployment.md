# Native Cloudflare release runbook

No resource has been provisioned or deployed by this migration. The user supplied `bugrelay.com`, `notifications@bugrelay.com`, and reported a paid Cloudflare account with prior Email Sending testing. The cloud coding environment's harmless `wrangler whoami` check reported **not authenticated**. Account, zone and sender status therefore remain unverified.

## Secure access handoff

Cloudflare authentication is owned by the parent/operator. A connected chat app does not automatically authenticate this shell. Do not extract connector credentials or paste tokens into chat. Use the operator's already-authorized Cloudflare CLI session, or a platform-supported secret injection path for an existing appropriately scoped API token. If a new authorization is necessary, the operator must approve and complete Wrangler's interactive login on their own trusted machine before work continues. Follow with read-only `wrangler whoami` and account/zone/resource inspection; do not combine setup with deployment. No new login/grant or credential was created here.

## Exact intended resource changes (approval required)

1. Verify the intended Cloudflare account, its Workers Paid plan, and the existing `bugrelay.com` zone. Inspect current DNS/routes and existing deployments before changing them.
2. Create one **fresh** D1 database, `bugrelay-production`. Do not import or modify any old PostgreSQL/D1 data.
3. Create one private R2 bucket for report attachments. Explicitly verify `r2.dev` and public custom-domain access are disabled. No public bucket hostname is needed.
4. Confirm Email Sending is enabled for `bugrelay.com` and `notifications@bugrelay.com`, with sending-domain verification and appropriate SPF/DKIM/DMARC status and quota. Email Routing alone is insufficient. Do not change MX records merely to enable this app. Test mail needs separately approved recipients.
5. Create/configure Turnstile for `bugrelay.com`; store its secret as a Worker secret and only its site key as a public variable.
6. Deploy `bugrelay-api` with D1, private R2 and restricted Email Sending bindings, no public route, no workers.dev/preview URL, and the daily cleanup cron. Set `TURNSTILE_SECRET` securely through the Cloudflare dashboard/CLI secret prompt, never chat or a committed file.
7. Deploy `bugrelay-web` with OpenNext assets and the private `API` service binding. Attach the approved `bugrelay.com` custom domain **only after** staging checks and a review of current DNS. This is the only intended public application hostname. A `www` redirect is not configured; add one only if separately approved.
8. Register and verify the intended operator account, then approve a one-time exact-user admin bootstrap. The SQL template deliberately contains no default email/password.

OAuth is optional. To enable it, register approved Google/GitHub applications with callbacks `https://bugrelay.com/api/v1/auth/oauth/google/callback` and `https://bugrelay.com/api/v1/auth/oauth/github/callback`. Configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` using approved secret/variable handling. Never fabricate credentials. Until configured, those login options are hidden and endpoints fail closed.

## Configuration and commands

Copy the two files in `config/` to local ignored `*.production.jsonc` files **in the same config directory**, replace verified IDs and the public Turnstile key, and inspect the exact diff. IDs are not secrets, but credential values must remain secret bindings.

```sh
npm ci
npm run type-check
npm run lint
npm run format:check
npm test
npm run build
npm run build:cloudflare
node scripts/check-production-config.mjs config/api.production.jsonc config/web.production.jsonc
```

The configuration checker performs local validation only. Production templates intentionally cannot pass before resource IDs are supplied. Use `wrangler deploy --dry-run` to inspect each resolved bundle without deployment.

After explicit release approval, an authorized operator can run the following individually, reviewing the selected account/config each time:

```sh
npx wrangler d1 migrations apply DB --remote --config config/api.production.jsonc
npx wrangler deploy --config config/api.production.jsonc
npx wrangler deploy --config config/web.production.jsonc
```

These are documented commands, not an automated release pipeline. The last command attaches the custom domain and may change zone routing. The agent has not run any of them. There is no CI deployment job and no production token in CI.

## Staging and release gates

Use separate D1/R2 resources and a separately approved staging hostname/sender strategy. The API currently deliberately pins production origin/sender to the approved values; review and explicitly configure an additional staging environment before provisioning it. Never point local browser fixtures at a real deployment.

Before launch, verify:

- Signup and delivered verification mail, login/reload/logout, reset mail and replay/session revocation.
- Turnstile success, failure and missing-token behavior; Origin/cookie flags over HTTPS.
- Public and private report submission, company verification, membership removal, attachment denial, votes/comments/status updates, admin denial and moderation.
- Private R2 access is denied without the app, including old URLs after membership removal/deletion.
- OAuth state/PKCE/callbacks and account collision behavior if providers are enabled.
- Both Workers use the exact tested commit, correct binding names, no dev vars, and no unintended public API URL.
- Email delivery/suppression/bounce visibility, quota, budget/error alarms and a usable operator support path. Keep full request URL/header/body logging off; OAuth codes occur in callback query strings.
- Operator review of privacy/terms/contact wording and retention settings.

## Backup and rollback

D1 Time Travel is operational recovery, not a tested backup plan by itself. Confirm the plan's available restore window in the actual account. Record a pre-release bookmark/export and practice restoring to a **separate** database, checking row counts, foreign keys and representative private ACLs. Keep an independently controlled SQL export and private R2 backup/version-retention policy; access to backups is as sensitive as access to private reports.

Record deployed Worker version IDs, migration version, D1 bookmark/export time and R2 policy. Roll back Worker versions only to code compatible with the applied schema. Do not restore the old Go deployment over fresh D1 or assume an old filesystem backup contains the database. Destructive schema/data restore or DNS rollback requires explicit operator approval.

The daily cron deletes expired ephemeral records, soft-deleted reports older than 30 days and their attachments, and performs a bounded orphan-object sweep. Test the cron locally and confirm its production executions and failures after release.

## Platform references

- [OpenNext on Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/)
- [OpenNext existing app setup](https://opennext.js.org/cloudflare/get-started)
- [Email Sending Workers API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/)
- [Local email simulation](https://developers.cloudflare.com/email-service/local-development/sending/)
- [Workers runtime integration testing](https://developers.cloudflare.com/workers/testing/vitest-integration/)

OpenNext is pinned to 1.20.9 because 1.20.10 brought a vulnerable transitive glob CLI into the build dependency tree at review time. Next.js is pinned to 16.3.8 because 16.4.0 bundled successfully but failed under workerd with an unsupported preview-props manifest. The pinned pair passes local service-binding runtime and browser tests. Recheck the lockfile/audit before a later release.
