# Contributing

Use the Node.js version and commands in the root README. Work on a branch, keep shared API contracts in `packages/contracts`, and add regression tests for changes affecting authorization, privacy or persistence. Do not add secrets, sample production credentials or automatic deployment steps.

Run lint, formatting, type checks, integration/frontend tests and both builds before opening a PR. Browser tests must target local development only. Changes to D1 schemas use numbered migrations; do not edit a migration once it has been applied to a shared environment.

`legacy/` is historical reference, not a maintained deployment target. Current requirements/design/tasks live in `.aiko/specs/cloudflare-native/`.
