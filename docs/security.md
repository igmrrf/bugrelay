# Security model

## Identity and authorization

Sessions are random 256-bit opaque cookies, stored only as SHA-256 digests in D1. Production cookies use `__Host-`, Secure, HttpOnly, SameSite=Lax and Path=/. Every request reads current session, suspension, role and verified-company membership state from D1. No KV or shared response cache participates in authorization. Logout and individual revocation delete the selected session. Password changes, recovery, suspension/restoration and revoke-all also advance a database authentication epoch and atomically invalidate sessions. Every issuance path (registration, password login and OAuth) conditionally inserts only while the verified password hash/epoch is unchanged and the account remains active. Thus a pending bcrypt comparison or session-token digest cannot recreate a session after revocation. Password changes also recheck the authorizing session at the write boundary.

All unsafe API methods require the exact configured Origin. Request bodies, strings, page sizes, attachments and rate buckets are bounded. Production startup handling fails closed without the approved origin/sender and Turnstile configuration. Password hashing uses bcrypt cost 12, with a 12-character minimum and 72-byte maximum for new passwords.

Middleware checks platform administrator access **before** calling the handler. Company writes check verified membership and appropriate role before side effects. D1 constraints/triggers prevent removing the last company or platform administrator. Verification and reset tokens are hashed, bound to an account/purpose/company, expire after one hour, and are single-use. Tokens are carried in URL fragments, consumed through POST, and never returned by the API or written to application logs.

OAuth uses state, a browser-bound HttpOnly cookie, PKCE, a short-lived single-use D1 state record, and verified provider email. Existing accounts are never silently linked by matching email. Provider credentials remain optional secret bindings. Live provider callbacks still need staging verification.

## Private reports

Security category forces `visibility=private` in the shared schema and a database CHECK constraint. Private reports require an authenticated, verified reporter. Only that reporter, an active platform administrator, or a member of the verified assigned company can read them. Visibility SQL is applied **before** list pagination, counts and duplicate search. Detail, comments, votes, company analytics and attachments use the same access rules. Inaccessible reports return 404.

Report visibility is immutable. Merges require matching visibility/company and, for private reports, the same reporter. Public DTOs include display names, never author email/password/session fields. Every API response uses no-store. Client data is held in memory and refreshed after session/identity changes; already-viewed data cannot be retroactively erased from a reader's device.

## Attachments and retention

R2 is private: no public `r2.dev` URL or custom public bucket domain. Downloads are streamed only after current report authorization and are marked attachment, nosniff, sandbox and no-store. Raster image format/dimensions and a 5 MiB file limit are checked; each report has at most five attachments. No presigned URL bypasses revocation.

Deleted reports immediately disappear from every application read. Daily cleanup permanently deletes reports and their R2 objects after 30 days, plus expired sessions/action tokens/OAuth states/rate buckets. A bounded resumable R2 sweep removes orphaned objects older than one day. Backup retention is a separate operator responsibility.

## Operational logging

Structured application failures log only an event, request ID and method. Audit records contain actor/action/entity IDs and time, not request bodies or report content. Production templates disable invocation logs because OAuth callbacks contain authorization codes in query strings; do not enable full URL/header/body logging without redaction. No Elasticsearch/Loki/Grafana public deployment is part of this architecture.

Turnstile is mandatory for production signup/login/recovery/report submission. D1 rate counters are atomic and scoped independently by action and identity/IP hash. Public browsing does not consume the report-submission quota. Platform edge abuse rules and budget alarms should be reviewed during release.

## Linking, threads and resolution analytics

OAuth linking is an explicit authenticated mutation. Password proof (or recent provider authentication for passwordless accounts), verified provider identity, browser/state/PKCE, exact-session binding, and unique identity ownership prevent login CSRF and email-based account merging. Revocation/suspension during the provider round trip is rechecked before insertion.

Thread and comment-flag endpoints first authorize the containing report and validate that every parent/target belongs to it. Deleting a parent hides its content and retains authorized access to descendants. Comment moderation deletes only its target. Company resolution aggregates reuse the report visibility predicate and exclude deleted reports.

## Company authorization

Matching a company email domain proves only mailbox access. Email confirmation creates a pending company claim, never a membership or company verification. Pending and rejected applicants cannot read private company reports, attachments, members or analytics. A small public-email-domain filter reduces abuse but is not an authorization boundary; it includes mail.com/email.com, which [mail.com lists as public signup domains](https://www.mail.com/mail/domains/). Unknown providers remain safe because every claim requires independent review.

An active, verified platform administrator other than the applicant must independently verify domain control and the applicant’s authority (for example, a random DNS/website challenge coordinated with the domain administrator), record evidence without secrets, and explicitly attest before approval. The approval batch rechecks the reviewer’s live session/role and the applicant’s verified email, suspension and matching domain, then atomically grants the first membership, verifies the company and writes an audit record. Concurrent approvals cannot grant competing owners. Approval is a manual operator trust decision; the application does not automatically validate DNS evidence.

Migration 0007 treats all pre-review company authority as unproven: the earlier schema recorded no positive independent-review provenance, and its grant/audit writes were separate. It derives pending requests from eligible former administrator memberships, removes every prior owner/team membership (including dormant ones), and clears all verified flags, even without an audit record or eligible administrator. This intentionally requires reapproval and new team invitations before any such authority is restored. It has been tested locally, not applied remotely.
