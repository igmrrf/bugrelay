# Migration feature and test review

The native implementation was compared with `legacy/backend/internal/router/router.go`, its handler/auth/middleware tests, and the previous frontend in Git history. Legacy tests are retained as historical evidence; they do not validate the new runtime. The replacement suite exercises real local workerd/D1/R2 rather than reproducing the old Go mocks or weakening their expectations.

| Previous behavior / test intent | Native replacement and evidence |
| --- | --- |
| Registration, duplicate email, password verification | Shared strict schemas, bcrypt, verified account policy; API integration and browser signup/login tests |
| JWT refresh, expiry, logout and blacklist | Opaque hashed sessions replace JWT/refresh storage; expiry, session ownership, logout, global revocation, suspension and stale-cookie tests |
| Email verification and password recovery | Hashed, purpose-bound, expiring, single-use links; concurrent consumption, replay, password-change invalidation and email-failure tests |
| OAuth provider/state/callback | Google/GitHub, browser-bound state and PKCE; malformed provider data, verified email, replay, expiry and collision tests. Explicit session-bound linking with password confirmation or recent provider sign-in is covered; live providers untested |
| New application discovery / anonymous submissions | Product names can be new; anonymous public reports remain allowed, rate limited and challenged in production. Private reports and screenshots require a verified account |
| Company auto-creation from arbitrary URLs | Explicit domain-based companies replace guessed ownership; mailbox claims remain pending until independent platform-administrator approval of domain control and representative authority. A report can remain unassigned |
| Reports, search, duplicates, filters, pagination | Public/own/company lists, status/tag/company filters, newest/vote sorting and duplicate search; private ACL applied before all counts/search/aggregates. Search/tag/sort browser-component regression |
| Votes and comments | Idempotent votes; paginated threaded comments, safe deletion tombstones, editing/deletion and author permissions; concurrent votes, cross-report ID substitution and ownership tests |
| Company team and status handling | Verified team claims, members/admins, settings, status and response comments, status counts, resolution timestamps and average resolution hours; claim/browser, revocation and last-active-admin tests |
| Moderation, deletion, merge, restore, audit | Pre-dispatch admin guard, queue, suspension, audit/CSV, comment-specific flags/deletion, safe merge and 30-day restore. Restore preserves ACL and excludes merged/expired reports; API tests and admin browser journey |
| Attachment validation and access | Private R2; bounded raster files, verified ownership, guarded downloads; spoofed type, dimensions, size, concurrent quota, failure compensation and access-revocation tests |
| Sanitization, SQL checks, headers, limits | Parameterized D1, strict Zod input, React text escaping, CSP/nosniff, Origin checks, request/rate limits; bad JSON, privilege injection, bounded password/body and production challenge/cookie tests |
| Old PostgreSQL/Redis/Docker/logging deployment | Archived under `legacy/`; no active public Elasticsearch/Loki ports or old deployment workflow. This says nothing about any previously deployed infrastructure |
| Performance tests | Functional local validation only. No production load, quota, latency, cost or recovery benchmark has been claimed |

## Parity completed after the first draft

- Replies preserve the parent relationship, paginate each sibling level and stop at five levels to bound nesting. Deleted parent text is hidden while its replies remain readable to authorized readers. Cross-report parent IDs, unauthorized replies/flags, and revoked team access are denied.
- Comment flags are independent of report flags. Moderators see the target comment and can dismiss/review/delete it without deleting the report or its replies. Merge preserves threads and moves flags to the surviving report.
- Existing accounts can explicitly link Google/GitHub in account settings. Password accounts reconfirm the current password; passwordless accounts must have signed in within ten minutes. The one-time intent is bound to the exact user, live session, browser and provider. Verified provider identity is required, identity ownership is unique, and neither email matching nor concurrent requests can silently merge or reassign accounts.
- Terminal status changes set a resolution timestamp once, reopening clears it, and subsequent resolution starts a new measurement. Company analytics shows the average hours from report creation to the current resolution/closure, along with the number of included reports; empty samples return null. Deleted reports and inaccessible company data are excluded. Bulk admin status changes use the same rules.

## Explicit behavior changes

- Status names are normalized to `open`, `acknowledged`, `in_progress`, `resolved`, `closed`; the old `reviewing`/`fixed`/`won't fix` names are not imported. There is no existing data migration.
- Screenshots are PNG/JPEG/WebP, at most 5 MiB each and five per report. Anonymous attachments and public object links are intentionally unavailable.
- Companies are explicit domain-based listings. Mailbox confirmation never grants team membership or private-report access; independent administrator approval is required.
- Live notifications, outbound report-update subscriptions, a public metrics/log-ingestion service and marketing placeholder pages are not advertised as implemented. The old routes/mock UI were not evidence of a working production service.

The four identified parity gaps in the initial draft are now implemented and covered by API and UI/browser regressions. Production provider/email/Turnstile behavior and operational readiness still require live staging verification.

Security review follow-up: mailbox confirmation now creates a pending company claim. A separate platform administrator must independently check domain control/representative authority and record a decision through `/admin/company-claims`. Applicants see pending/rejected status; private reports and management remain inaccessible before approval. Migration 0007 removes all pre-review company authority pending reapproval, including grants with missing audits, dormant memberships and verified companies without eligible administrators. This replaces the draft’s unsafe automatic mailbox-to-company-admin grant.
