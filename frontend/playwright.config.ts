import { defineConfig, devices } from "@playwright/test";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname))
  throw new Error(
    "Browser fixtures are restricted to a local development server.",
  );
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 60000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
            ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
            : {}),
          args: ["--no-sandbox"],
        },
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_REUSE_SERVER
    ? undefined
    : process.env.PLAYWRIGHT_CLOUDFLARE
      ? {
          command:
            "npx wrangler d1 migrations apply DB --local --config worker/wrangler.jsonc --persist-to .wrangler/e2e && npx wrangler dev --config frontend/wrangler.jsonc --config worker/wrangler.jsonc --port 3000 --persist-to .wrangler/e2e",
          cwd: "..",
          url: baseURL + "/api/v1/health",
          reuseExistingServer: false,
          timeout: 120000,
        }
      : [
          {
            command: "npm run db:local -w @bugrelay/api && npm run dev:api",
            cwd: "..",
            url: "http://localhost:8787/api/v1/health",
            reuseExistingServer: !process.env.CI,
            timeout: 120000,
          },
          {
            command: "npm run dev",
            url: baseURL,
            reuseExistingServer: !process.env.CI,
            timeout: 120000,
          },
        ],
});
