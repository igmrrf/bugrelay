# BugRelay

BugRelay connects people reporting software problems with the teams that can fix them. This branch migrates the product to native Cloudflare Workers with a fresh database. No historical data import is required.

## Runtime

- `frontend/`: Next.js 16 with OpenNext, same-origin `/api/v1` requests.
- `worker/`: TypeScript/Hono API, D1 SQL, private R2 attachments, Cloudflare Email Sending.
- `packages/contracts/`: shared validated requests and safe camelCase response types.
- `config/`: reviewable production templates for `https://bugrelay.com` and `notifications@bugrelay.com`.
- `legacy/`: historical Go/PostgreSQL/Redis deployment and documentation, excluded from the runtime and CI. Do not deploy it.

## Local development

Use Node.js 24 and npm. No Cloudflare credentials are needed for local development.

```sh
npm ci
npm run db:local -w @bugrelay/api
npm run dev:api
# In another terminal:
npm run dev:web
```

Open `http://localhost:3000`. The API runs locally at port 8787. Wrangler simulates D1, R2 and email; it does not send real emails. Read verification/reset/claim mail through Wrangler Local Explorer at `http://localhost:8787/cdn-cgi/local/explorer` or its local email API. Only local/test environments bypass Turnstile.

For a sandbox with an unwritable home directory, set `npm_config_cache`, `XDG_CONFIG_HOME` and `WRANGLER_LOG_PATH` to writable **local** directories. Do not change `HOME` or put credentials in the repository.

## Checks

```sh
npm run type-check
npm run lint
npm run format:check
npm test
npm audit --omit=dev --audit-level=high
npm run build
npm run build:cloudflare
npx playwright install chromium
npm run test:e2e:cloudflare
```

API integration tests execute inside workerd with local D1 and R2, not SQLite mocks. CI and `test:e2e:cloudflare` exercise the compiled OpenNext Worker and API service binding. For Next dev instead, use `npm run test:e2e -w bugrelay-frontend`. Browser tests use local simulated email and refuse non-local targets. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` may select an installed Chromium. `PLAYWRIGHT_REUSE_SERVER=1` uses already-running local servers.

## Product behavior

- Public reports can be submitted anonymously, subject to Turnstile and rate limits. An anonymous reporter cannot later edit, attach files, or manage the report as its owner.
- A verified account is required for private/security reports, attachments, votes, comments and company management. Security reports are always private. Public author DTOs never expose email addresses.
- Private readers are the reporter, platform administrators, and members of the **verified assigned company**. This applies to lists, search/duplicates, counts, details, comments, votes and attachment downloads.
- New product names can be reported immediately. Company listings are created explicitly with a domain; a product name never grants ownership. Work-email verification establishes the first company administrator; team administrators add already-verified accounts.
- Company members can respond and update status. Reporters/admins can edit or remove reports. Report visibility is immutable, and private reports cannot be merged into a broader audience.
- Email/password registration, one-time verification/recovery, revocable cookie sessions, optional Google/GitHub OAuth, moderation, merging and audit export are implemented. OAuth buttons appear only when that provider is configured; existing email accounts are not silently linked to an OAuth identity.
- No fictitious WebSocket, metrics, notification-inbox or automatic retry behavior is advertised. Updates are fetched from the API. Transactional email handles account and company verification/recovery.

## Release

See [deployment](docs/deployment.md), [security model](docs/security.md), [API contract](docs/api.md), and [migration validation](docs/validation.md), and [feature coverage and differences](docs/feature-coverage.md). CI builds and tests only. It never deploys, changes DNS or provisions resources. Vercel Git deployment is disabled in this branch.

Production resource creation, sender/zone verification, secret setup, deployment, DNS changes and first-admin provisioning require a separately approved release. A successful local build is not a production deployment.
