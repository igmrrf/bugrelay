# Native migration validation — 2026-10-11

Status: locally validated draft implementation. **Not deployed or certified for production.**

Active draft: [PR #2](https://github.com/igmrrf/bugrelay/pull/2). Branch: `feat/cloudflare-native-migration`. Base: `8b0866d76c4d089965ab10a062b0f773e2feaea0`. Review the PR's exact head and its Actions results before merging; historical Actions failures are not evidence about this branch.

## Completed checks

| Check | Result |
| --- | --- |
| Fresh locked install | `npm ci` passed on Node 24.19.0 / npm 11.9.0 |
| TypeScript / ESLint / Prettier | Passed on API, contracts, frontend and test code |
| API runtime tests | **79 passed**, ten suites inside workerd with actual local D1/R2 |
| Frontend regression tests | **9 passed** |
| Production configuration tests | **9 passed**; reject unresolved templates, unintended routes/previews/domain/account/sender/binding and plaintext secrets |
| Browser launch journeys | **3 passed** on Chromium against the **compiled OpenNext Worker + private API service binding**, with local D1/R2 and simulated email |
| Production builds | API dry-run, Next.js **16.3.8**, OpenNext **1.20.9** passed |
| Production-template dry runs | Both Worker bundles passed with explicitly fictitious local fixture IDs; no upload or deployment |
| Production dependency audit | **0 vulnerabilities** from `npm audit --omit=dev --json` |
| D1 migrations | All seven migrations applied to clean local D1; no remote database accessed |
| GitHub connectivity | Authenticated connector published the approved baseline with an exact tree match; PR #2 continues it on the requested branch name. PR #1 remains linked for its discussion |
| Cloudflare connectivity | Approved device sign-in failed before issuing a code: proxy HTTP 403 for dash.cloudflare.com. No grant/token/account/resource changes; retry awaits network access and approval for Wrangler’s automatically appended offline_access |

Browser coverage includes signup and simulated verification, new-product submission with an empty duplicate result, votes/comments, private security report and R2 screenshot, stranger denial, logout, recovery/login, company mailbox claim, independent administrator review, status response, last-admin denial, threaded replies, comment-specific moderation, resolution-time analytics, report deletion/restoration and audit. Desktop report and mobile home screenshots were reviewed; mobile report filters are checked for horizontal overflow.

API tests cover authorization before admin side effects; privacy in details, counts, search, duplicate suggestions, company views and child resources; current-role/suspension checks and immediate membership revocation; purpose-bound token expiry/replay and concurrent consumption; password-change/reset session and token invalidation; OAuth browser/provider state, PKCE, provider payload validation, email collisions and suspended accounts; Origin/Turnstile/production cookies; attachment size/type/dimensions/concurrent quota/failure compensation; cleanup/retention; safe merges and visibility-preserving restoration; thread depth/pagination/tombstones; comment flags and cross-report parent denial; explicit OAuth linking with reauthentication, concurrent identity conflicts and mid-callback session/suspension checks; resolution timestamp/reopening/bulk changes and private aggregate exclusion. See [feature coverage](feature-coverage.md) for the old-test mapping and explicit product differences.

## Independent security review follow-up

- Authentication race: five deterministic held-bcrypt regressions reproduced session recreation after reset, password change, revoke-all, suspension and suspend/restore on the prior implementation. Conditional insertion now binds every session to the verified password hash/authentication epoch and active account. Four additional regressions cover registration/OAuth issuance at the D1 write boundary and password-change reauthentication after session revocation.
- Company privacy: mail.com/email.com and an unclassified-provider regression reproduced automatic company authority from a mailbox. Mail confirmation now creates an inert pending claim. Thirteen claim tests cover preapproval report/attachment/aggregate denial, independent evidence-bearing administrator approval, self-review denial, rejection/resubmission, stale claimant/reviewer state, concurrent review/claims, and upgrade revocation of all earlier company authority, including missing-audit grants, dormant memberships and ownerless verification. A no-audit upgrade regression returned private-report HTTP 200 against the prior migration and now requires HTTP 404. The compiled browser journey includes applicant pending status and a separate reviewer’s approval.

## Failures found and corrected during validation

- Next 16.4.0 built but failed at runtime with `Unexpected loadManifest(/.next/server/preview-props.json)`. Pinning 16.3.8 resolved the actual workerd failure; CI now runs compiled-runtime browser tests.
- OpenNext 1.20.10 introduced an audited vulnerable transitive dependency. The tested 1.20.9 lockfile has no production audit findings.
- Password changes left pending recovery links usable; fixed with atomic hash comparison and reset-token/session revocation.
- Suspended company administrators could satisfy the last-admin count; corrected in migration 0002 and tested.
- Invalid session cookies could silently downgrade a public submission to anonymous; mutations now require recovery from the stale session.
- Aborted resource requests could repopulate stale UI; guarded the result handler.
- New report filters overflowed on a narrow viewport; wrapped the controls and retained the failing browser assertion as a regression check. A restore-message test locator was made specific to its status message, preserving the assertion.

The initial published baseline (`531b320`) failed its remote browser company-status journey after its other gates passed. Investigation reproduced company selection being lost when session refresh caused company options to reload. The selection is now explicit React state; a regression holds the option reload pending and verifies the submitted company ID. The compiled browser journey also asserts company assignment/management before status updates. Final remote status is always the exact head’s [PR #2 checks](https://github.com/igmrrf/bugrelay/pull/2/checks).

## Release blockers and unrun checks

1. **P0 — live configuration and staging unverified.** Parent/operator must verify account, zone, sender, exact resources/bindings, private bucket access, HTTPS cookies/Origin, Turnstile and delivered email. Production placeholders intentionally remain unresolved. No credentials, grants, resources, DNS or production data were changed.
2. **Feature parity implementation completed.** The four identified gaps—threaded replies, comment-specific moderation, explicit OAuth linking and resolution-time analytics—are now implemented and tested. See [coverage and behavior changes](feature-coverage.md). Live optional-provider testing remains a staging gate.
3. **P1 — operational recovery and support.** Backup/restore drill, retention approval, delivery/bounce visibility, quota/cost/error alarms, operator admin bootstrap and privacy/terms/support review remain unrun. No production load test was performed.
4. **P1 — exact-head CI and release review.** Publication authorization was resolved by the explicit user approval. Verify the current PR #2 head and its checks; an older run, including the original baseline failure, does not establish current status. PR #1 is retained for discussion and has not been closed or its branch deleted.

Live OAuth checks are required only if the optional providers are enabled. Real email requires approved recipients. Read-only remote account inspection requires a supported authenticated path; provisioning, deployment, DNS changes and any new credential/grant require separate approval.

Local evidence is outside Git at `/workspace/bugrelay-review-evidence/`: `fresh-install.log`, baseline `final-*.log`, latest `parity-{types,lint,format-check,tests,build,opennext,browser}.log` and `parity-audit.json`. Browser artifacts are in `frontend/test-results` and `frontend/playwright-report`. Simulated email/runtime logs are private local artifacts and are excluded from the PR. Test-runner `deleteAllDurableObjects()` diagnostics and occasional browser navigation disconnect logs are harness/runtime diagnostics; the passing assertions and process exit statuses above are recorded separately.

Security follow-up evidence: `auth-race-before.log` (five regressions fail on the prior code), `company-claims-before.log` (three privacy regressions fail), and `security-{api-tests,types,lint,format-check,tests,build,opennext,browser}.log`. Current exact-head CI remains the authoritative publication check.

Upgrade follow-up evidence: `upgrade-before.log` records the no-audit regression failing against the prior migration; `upgrade-tests.log` and `upgrade-types.log` record the repaired migration and current API/static checks. No remote migration or login was attempted.
