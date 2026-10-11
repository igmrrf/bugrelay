# Accepted architecture

This records the architecture explicitly approved in the parent conversation; requirements and design approval are already satisfied.

- Next.js with OpenNext renders the site. A service binding proxies same-origin /api/v1 requests to a TypeScript/Hono API Worker. The API has no public workers.dev endpoint in production.
- Shared Zod contracts define camelCase requests and safe response DTOs. D1 is authoritative for sessions, roles and memberships; no eventually consistent authorization cache.
- Opaque random sessions and single-use email/OAuth tokens are stored only as SHA-256 digests. Secure HttpOnly SameSite cookies, strict Origin validation and bounded rate limits protect mutations. Passwords use bcrypt with cost 12 and a 72-byte bound.
- Explicit public/private report visibility; security reports are private. Reporter, platform admin and members of the verified assigned company can read private reports. SQL visibility predicates apply before pagination/counting/search. All responses use no-store. Only reporter/admin may remove reports; company members may update workflow state. Private reports cannot be changed to public or merged into public reports.
- Atomic D1 batches and constraints protect votes, token consumption, membership changes and merges. Audit records contain identifiers/actions, never report content, credentials or tokens.
- Attachments are small raster images in private R2, streamed only after fresh authorization. No public bucket URLs. Expired-token/session/rate-limit cleanup is scheduled; failed attachment writes are compensated.
- Cloudflare Email Sending binding delivers verification/recovery/claims; no token-returning production endpoint. OAuth is explicitly configuration gated. Test doubles exist only in test environments.
- No legacy data migration, Redis, Go server, Elasticsearch or Loki is required. Legacy source remains in Git history. Deployment remains manual and gated on verified resources, sender, Turnstile, backup/restore and end-to-end staging checks.

Staging uses explicit ENVIRONMENT=staging with the production security paths, an exact account workers.dev origin, a private staging API service binding, fresh staging D1/private R2, disabled OAuth and optional tightly restricted email. The development/test bypass is loopback-only. See docs/staging.md; live resources and deployment remain separately authorized.
