# Native migration validation — 2026-10-11

Status: locally validated draft implementation. **Not deployed or certified for production.**

Branch: `codex/cloudflare-native-migration`. Base: `8b0866d76c4d089965ab10a062b0f773e2feaea0`. Review the PR's exact head and its Actions results before merging; historical Actions failures are not evidence about this branch.

## Completed checks

| Check | Result |
| --- | --- |
| Fresh locked install | `npm ci` passed on Node 24.19.0 / npm 11.9.0 |
| TypeScript / ESLint / Prettier | Passed on API, contracts, frontend and test code |
| API runtime tests | **41 passed**, six suites inside workerd with actual local D1/R2 |
| Frontend regression tests | **7 passed** |
| Production configuration tests | **9 passed**; reject unresolved templates, unintended routes/previews/domain/account/sender/binding and plaintext secrets |
| Browser launch journeys | **3 passed** on Chromium against the **compiled OpenNext Worker + private API service binding**, with local D1/R2 and simulated email |
| Production builds | API dry-run, Next.js **16.3.8**, OpenNext **1.20.9** passed |
| Production-template dry runs | Both Worker bundles passed with explicitly fictitious local fixture IDs; no upload or deployment |
| Production dependency audit | **0 vulnerabilities** from `npm audit --omit=dev --json` |
| D1 migrations | All three migrations applied to clean local D1; no remote database accessed |
| GitHub connectivity | Authenticated connector confirms repository push access; CLI environment token is invalid and was not used |
| Cloudflare connectivity | Earlier harmless `wrangler whoami` reported not authenticated; no account/resource changes |

Browser coverage includes signup and simulated verification, new-product submission with an empty duplicate result, votes/comments, private security report and R2 screenshot, stranger denial, logout, recovery/login, company email claim, status response, last-admin denial, moderation deletion/restoration and audit. Desktop report and mobile home screenshots were reviewed; mobile report filters are checked for horizontal overflow.

API tests cover authorization before admin side effects; privacy in details, counts, search, duplicate suggestions, company views and child resources; current-role/suspension checks and immediate membership revocation; purpose-bound token expiry/replay and concurrent consumption; password-change/reset session and token invalidation; OAuth browser/provider state, PKCE, provider payload validation, email collisions and suspended accounts; Origin/Turnstile/production cookies; attachment size/type/dimensions/concurrent quota/failure compensation; cleanup/retention; safe merges and visibility-preserving restoration. See [feature coverage](feature-coverage.md) for the old-test mapping and explicit product differences.

## Failures found and corrected during validation

- Next 16.4.0 built but failed at runtime with `Unexpected loadManifest(/.next/server/preview-props.json)`. Pinning 16.3.8 resolved the actual workerd failure; CI now runs compiled-runtime browser tests.
- OpenNext 1.20.10 introduced an audited vulnerable transitive dependency. The tested 1.20.9 lockfile has no production audit findings.
- Password changes left pending recovery links usable; fixed with atomic hash comparison and reset-token/session revocation.
- Suspended company administrators could satisfy the last-admin count; corrected in migration 0002 and tested.
- Invalid session cookies could silently downgrade a public submission to anonymous; mutations now require recovery from the stale session.
- Aborted resource requests could repopulate stale UI; guarded the result handler.
- New report filters overflowed on a narrow viewport; wrapped the controls and retained the failing browser assertion as a regression check. A restore-message test locator was made specific to its status message, preserving the assertion.

## Release blockers and unrun checks

1. **P0 — live configuration and staging unverified.** Parent/operator must verify account, zone, sender, exact resources/bindings, private bucket access, HTTPS cookies/Origin, Turnstile and delivered email. Production placeholders intentionally remain unresolved. No credentials, grants, resources, DNS or production data were changed.
2. **P1 — feature differences need a release decision.** Threaded replies/comment-specific moderation, existing-account OAuth linking, separate resolution timestamps and response-time analytics are not implemented. Core launch journeys are tested, but complete parity is not claimed. See the [explicit differences](feature-coverage.md#explicit-remaining-feature-differences).
3. **P1 — operational recovery and support.** Backup/restore drill, retention approval, delivery/bounce visibility, quota/cost/error alarms, operator admin bootstrap and privacy/terms/support review remain unrun. No production load test was performed.
4. **P1 — review and exact-head remote CI.** Publishing a draft and checking its current CI are separate from local success. Follow the linked PR/check results; this document does not presume remote CI has passed.

Live OAuth checks are required only if the optional providers are enabled. Real email requires approved recipients. Read-only remote account inspection requires a supported authenticated path; provisioning, deployment, DNS changes and any new credential/grant require separate approval.

Local evidence is outside Git at `/workspace/bugrelay-review-evidence/`: `fresh-install.log`, `final-{types,lint,format-check,tests,build,opennext,browser,api-dryrun,web-dryrun,production-config}.log` and `final-audit.json`. Browser artifacts are in `frontend/test-results` and `frontend/playwright-report`. Simulated email/runtime logs are private local artifacts and are excluded from the PR. Test-runner `deleteAllDurableObjects()` diagnostics and occasional browser navigation disconnect logs are harness/runtime diagnostics; the passing assertions and process exit statuses above are recorded separately.
