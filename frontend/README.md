# BugRelay frontend

Next.js/OpenNext UI for the native Workers API. Install dependencies from the repository root. Development requires the local API at port 8787; `npm run dev:web` serves the UI on port 3000.

Production uses the private `API` service binding. It never uses a browser-visible localhost URL or an independently configured public API origin. No auth tokens or private report content are persisted in localStorage.

See the root README and `docs/` for checks and release configuration.
