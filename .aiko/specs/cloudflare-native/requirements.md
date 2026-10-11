# Approved scope

The user approved the full native Cloudflare migration and launch fixes on a separate branch with a draft PR. Retain Next.js/OpenNext, use a fresh D1 database and private R2 attachments, and preserve Git history. There are no users or data to import. Production origin: https://bugrelay.com. Transactional sender: notifications@bugrelay.com.

Implement signup, verified email, login/logout/revocable sessions, recovery, optional OAuth, bug creation/search/tracking, private security reports, comments/votes, company verification/team management, moderation and audit. Authorization must precede side effects. Private reports must remain private on every surface. Provide tests, reproducible local setup, CI, and deployment documentation. Do not deploy, change DNS, create credentials, send real test mail, or provision remote resources without further authorization.
