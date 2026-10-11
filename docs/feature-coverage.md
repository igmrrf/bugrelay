# Migration feature and test review

The native implementation was compared with `legacy/backend/internal/router/router.go`, its handler/auth/middleware tests, and the previous frontend in Git history. Legacy tests are retained as historical evidence; they do not validate the new runtime. The replacement suite exercises real local workerd/D1/R2 rather than reproducing the old Go mocks or weakening their expectations.

| Previous behavior / test intent | Native replacement and evidence |
| --- | --- |
| Registration, duplicate email, password verification | Shared strict schemas, bcrypt, verified account policy; API integration and browser signup/login tests |
| JWT refresh, expiry, logout and blacklist | Opaque hashed sessions replace JWT/refresh storage; expiry, session ownership, logout, global revocation, suspension and stale-cookie tests |
| Email verification and password recovery | Hashed, purpose-bound, expiring, single-use links; concurrent consumption, replay, password-change invalidation and email-failure tests |
| OAuth provider/state/callback | Google/GitHub, browser-bound state and PKCE; malformed provider data, verified email, replay, expiry and collision tests. Live providers untested |
| New application discovery / anonymous submissions | Product names can be new; anonymous public reports remain allowed, rate limited and challenged in production. Private reports and screenshots require a verified account |
| Company auto-creation from arbitrary URLs | Explicit domain-based companies replace guessed ownership; email-domain claims must complete proof of control. A report can remain unassigned |
| Reports, search, duplicates, filters, pagination | Public/own/company lists, status/tag/company filters, newest/vote sorting and duplicate search; private ACL applied before all counts/search/aggregates. Search/tag/sort browser-component regression |
| Votes and comments | Idempotent votes; paginated flat comments, editing/deletion and author permissions; concurrent votes, cross-report ID substitution and ownership tests |
| Company team and status handling | Verified team claims, members/admins, settings, status and response comments, status-count analytics; claim/browser, revocation and last-active-admin tests |
| Moderation, deletion, merge, restore, audit | Pre-dispatch admin guard, queue, suspension, audit/CSV, safe merge and 30-day restore. Restore preserves ACL and excludes merged/expired reports; API tests and admin browser journey |
| Attachment validation and access | Private R2; bounded raster files, verified ownership, guarded downloads; spoofed type, dimensions, size, concurrent quota, failure compensation and access-revocation tests |
| Sanitization, SQL checks, headers, limits | Parameterized D1, strict Zod input, React text escaping, CSP/nosniff, Origin checks, request/rate limits; bad JSON, privilege injection, bounded password/body and production challenge/cookie tests |
| Old PostgreSQL/Redis/Docker/logging deployment | Archived under `legacy/`; no active public Elasticsearch/Loki ports or old deployment workflow. This says nothing about any previously deployed infrastructure |
| Performance tests | Functional local validation only. No production load, quota, latency, cost or recovery benchmark has been claimed |

## Explicit remaining feature differences

These are product parity gaps, not passing checks:

- Discussion is flat: the former reply-to-comment endpoint/thread relationship and comment-specific moderation flags are not implemented. Users can flag the containing report; an administrator can edit/delete individual comments. Add dedicated thread/moderation contracts, private-ACL tests and UI if these are launch requirements.
- OAuth linking to an existing password account is deliberately unavailable. A matching email is rejected rather than silently linked. A future linking flow needs recent authentication and its own browser-bound intent; provider login itself is implemented and locally tested.
- Statuses are `open`, `acknowledged`, `in_progress`, `resolved`, `closed`; old `reviewing`/`fixed`/`won't fix` names and a separate resolution timestamp/response-time analytics are not retained. No existing data is being imported. Analytics currently reports counts by status.
- Screenshots are PNG/JPEG/WebP, at most 5 MiB each and five per report. Anonymous attachments and public object links are intentionally unavailable.
- No real-time notifications, outbound report-update subscriptions, public metrics/log ingestion service, or marketing placeholder pages are advertised as implemented.

Review these differences before approving the draft for release. They are documented rather than hidden by removing old tests or asserting feature equivalence.
