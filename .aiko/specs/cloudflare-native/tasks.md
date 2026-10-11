# Progress checkpoint

- [x] Record approved requirements/design and isolated migration branch.
- [x] Shared contracts, fresh D1 schema, bounded requests and security guards.
- [x] Sessions, email verification/recovery and configuration-gated OAuth implementation.
- [x] Reports, private ACL, search, votes, comments and private attachments implementation.
- [x] Company verification, membership, status management and analytics implementation.
- [x] Admin moderation, merging, suspension, audit and exports implementation.
- [x] Next/OpenNext integration and usable launch journeys; retain anonymous public reporting.
- [x] Current type checks, lint, 77 API tests, 9 frontend tests and 9 configuration tests, and 3 local browser tests pass.
- [x] Archive the old deployment/runtime, disable automatic deployment and add test/build CI.
- [x] Final security/feature review and additional edge-case coverage; all four identified parity gaps implemented and covered.
- [x] Final pinned OpenNext build, local service-binding runtime, dry runs, fresh install and complete validation.
- [x] Finish local deployment/config verification and release documentation; live verification remains blocked.
- [x] Reviewed local commits and exact-tree publication payload prepared.
- [x] Approved remote publication and draft PR; active branch is `feat/cloudflare-native-migration`, PR #2. Exact-head CI state is linked in `docs/validation.md`.
- [x] Threaded replies, comment flags, explicit authenticated OAuth linking and resolution-time analytics, including API and UI/browser regressions.
- [ ] Live account/zone/sender verification. Deployment/account/DNS changes require separate approval.

See `docs/validation.md` for exact checks, evidence and remaining work. Do not restart the completed migration work when resuming.

- [x] Independent security review: atomically bind session issuance to credential/authentication epoch and active-account state; deterministic revocation races covered.
- [x] Replace automatic mailbox ownership with pending company claims and independent audited platform-administrator approval; revoke earlier email-only grants on upgrade.
