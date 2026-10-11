# Historical implementation — not deployed

This directory preserves the previous Go/PostgreSQL/Redis backend, host deployment scripts, logging configurations and generated documentation for reference. The native Cloudflare application is in `worker/`, `frontend/` and `packages/contracts/`.

Do not run these deployment workflows or Compose files for the native release. In particular, historical logging examples disable authentication and publish service ports. They are archived here, not evidence of a public deployment. Old JWT, filesystem upload, Redis authorization/cache, SSH deployment and PostgreSQL migrations are not part of the new runtime.

Previous frontend business components, mocked stores, WebSocket scaffolding and failing Jest fixtures were replaced by the shared API contract and tested native journeys. Their original source remains in Git history at `8b0866d76c4d089965ab10a062b0f773e2feaea0`.

Archived documentation describes the old product and may be inaccurate for the native application. Use the root README and `docs/` for current instructions.
