import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
const explorer = process.env.PLAYWRIGHT_CLOUDFLARE
  ? "http://localhost:3000/cdn-cgi/local/explorer/api"
  : "http://localhost:8787/cdn-cgi/local/explorer/api";
const password = "Local browser passphrase 123!";
async function emailLink(
  request: APIRequestContext,
  email: string,
  subject: string,
) {
  const list = await (
    await request.get(`${explorer}/local/email/sending?per_page=100`)
  ).json();
  const item = list.result.find(
    (v: { to: string[]; subject: string }) =>
      v.to.includes(email) && v.subject === subject,
  );
  expect(item, "Expected a locally simulated transactional email").toBeTruthy();
  const detail = await (
    await request.get(
      `${explorer}/local/email/sending?email_id=${encodeURIComponent(item.messageId)}`,
    )
  ).json();
  const link = detail.result.text.match(/http:\/\/localhost:3000\S+/)?.[0];
  expect(link).toBeTruthy();
  return link as string;
}
async function signup(page: Page, email: string, name: string) {
  await page.goto("/register");
  await page.getByLabel("Display name").fill(name);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/verify-email$/);
  await page.goto(
    await emailLink(page.request, email, "Verify your BugRelay email"),
  );
  await page.getByRole("button", { name: "Confirm email address" }).click();
  await expect(page.getByRole("status")).toContainText("Email verified.");
}
async function localSQL(
  request: APIRequestContext,
  sql: string,
  params: unknown[],
) {
  const r = await request.post(
    `${explorer}/d1/database/00000000-0000-0000-0000-000000000000/raw`,
    { data: { sql, params } },
  );
  expect(r.ok()).toBeTruthy();
  const result = await r.json();
  expect(result.success).toBe(true);
  return result;
}
test.beforeEach(async ({ request }) => {
  await localSQL(request, "DELETE FROM rate_limits", []);
});

test("signup, verified submission, duplicate search, voting, comments, private attachments and logout", async ({
  page,
  browser,
}) => {
  const unique = Date.now(),
    email = `browser-${unique}@example.test`;
  await signup(page, email, "Browser Reporter");
  await page.goto("/submit");
  await page.getByLabel("Application or product").fill(`Browser App ${unique}`);
  await page.getByLabel("Report title").fill(`Browser-${unique}`);
  await page
    .getByLabel("Description", { exact: true })
    .fill(
      "The login form stays blank after a successful submission. Reproduce with a clean browser session.",
    );
  await page.getByRole("button", { name: "Check for similar reports" }).click();
  await expect(
    page.getByText("No similar reports found. Continue with your report."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Submit report", exact: true })
    .click();
  await expect(page).toHaveURL(/\/bugs\/[a-f0-9-]+$/);
  const publicURL = page.url();
  await expect(
    page.getByRole("heading", { name: `Browser-${unique}` }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Vote for this report" }).click();
  await expect(
    page.getByRole("button", { name: "Remove your vote" }),
  ).toBeVisible();
  await page
    .getByLabel("Add a comment")
    .fill("I can reproduce this issue in the latest version.");
  await page.getByRole("button", { name: "Post comment" }).click();
  await expect(
    page.getByText("I can reproduce this issue in the latest version."),
  ).toBeVisible();
  await page.goto("/submit");
  await page.getByLabel("Application or product").fill("Private App");
  await page.getByLabel("Report title").fill(`Private vulnerability ${unique}`);
  await page
    .getByLabel("Description", { exact: true })
    .fill(
      "A private reproduction for the security team. No real credentials are included.",
    );
  await page.getByLabel("Category").selectOption("security");
  await page.getByLabel("Screenshots").setInputFiles({
    name: "proof.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aAVsAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page
    .getByRole("button", { name: "Submit report", exact: true })
    .click();
  await expect(page).toHaveURL(/\/bugs\/[a-f0-9-]+$/);
  const privateURL = page.url();
  await expect(page.getByRole("link", { name: "proof.png" })).toBeVisible();
  const attachmentURL = await page
    .getByRole("link", { name: "proof.png" })
    .getAttribute("href");
  const anonymous = await browser.newContext();
  const stranger = await anonymous.newPage();
  await stranger.goto(privateURL);
  await expect(
    stranger.getByRole("alert").filter({ hasText: "Report not found." }),
  ).toContainText("Report not found.");
  expect(
    (
      await stranger.request.get(new URL(attachmentURL!, privateURL).href)
    ).status(),
  ).toBe(404);
  await stranger.goto(publicURL);
  await expect(
    stranger.getByRole("heading", { name: `Browser-${unique}` }),
  ).toBeVisible();
  await anonymous.close();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto(privateURL);
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: /Report not found|another administrator/ }),
  ).toContainText("Report not found.");
  await page.goto("/forgot-password");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText("If an account exists");
  await page.goto(
    await emailLink(page.request, email, "Reset your BugRelay password"),
  );
  await page
    .getByLabel("New password")
    .fill("New local browser passphrase 456!");
  await page.getByRole("button", { name: "Reset password" }).click();
  await expect(page.getByRole("status")).toContainText("Password changed.");
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("New local browser passphrase 456!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
test("company email claim, status response and moderation are usable through the UI", async ({
  page,
}) => {
  const unique = Date.now(),
    email = `team-${unique}@company${unique}.example`;
  await signup(page, email, "Company Owner");
  await page.goto("/companies");
  await page.getByRole("button", { name: "Add company", exact: true }).click();
  await page.getByLabel("Company name").fill(`Browser Company ${unique}`);
  await page.getByLabel("Company domain").fill(`company${unique}.example`);
  await page
    .getByLabel("Description", { exact: true })
    .fill("A local company fixture.");
  await page
    .getByRole("button", { name: "Add company", exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(/\/companies\/[a-f0-9-]+$/);
  const companyURL = page.url();
  await page.getByRole("link", { name: "Verify company", exact: true }).click();
  await page
    .getByRole("button", { name: "Send work-email verification" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "verification link has been sent",
  );
  await page.goto(
    await emailLink(page.request, email, "Verify your company on BugRelay"),
  );
  await page
    .getByRole("button", { name: "Confirm company verification" })
    .click();
  await expect(
    page.getByText(
      "This company is verified. Ask an administrator to add you to the team.",
    ),
  ).toBeVisible();
  await page.goto("/submit");
  await page.getByLabel("Application or product").fill("Company Product");
  await page
    .getByLabel("Company (optional)")
    .selectOption({ label: `Browser Company ${unique} · verified` });
  await page.getByLabel("Report title").fill(`Company status issue ${unique}`);
  await page
    .getByLabel("Description", { exact: true })
    .fill(
      "A report that should receive a verified company response through the status workflow.",
    );
  await page
    .getByRole("button", { name: "Submit report", exact: true })
    .click();
  await expect(page).toHaveURL(/\/bugs\/[a-f0-9-]+$/);
  const reportURL = page.url();
  const reportData = await (
    await page.request.get(`/api/v1/bugs/${reportURL.split("/").pop()}`)
  ).json();
  expect(
    reportData.companyId,
    "Selected company must survive profile/options refresh",
  ).toBe(companyURL.split("/").pop());
  expect(reportData.canManage).toBe(true);
  await page.getByLabel("Status", { exact: true }).selectOption("resolved");
  await page
    .getByLabel("Response (optional)")
    .fill("Fixed in the current release.");
  await page.getByRole("button", { name: "Update status" }).click();
  await expect(page.getByText("Fixed in the current release.")).toBeVisible();
  const responseComment = page
    .locator("article.comment")
    .filter({ hasText: "Fixed in the current release." })
    .first();
  await responseComment
    .getByRole("button", { name: "Reply", exact: true })
    .click();
  await responseComment
    .getByLabel("Reply to Company Owner")
    .fill("Confirmed the fix with a fresh install.");
  await responseComment
    .getByRole("button", { name: "Post reply", exact: true })
    .click();
  await expect(
    page.getByText("Confirmed the fix with a fresh install.", { exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) =>
    dialog.accept("Review only the parent comment."),
  );
  await responseComment
    .getByRole("button", { name: "Flag comment", exact: true })
    .first()
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Comment sent for moderation." }),
  ).toBeVisible();
  await page.goto(companyURL);
  await expect(page.getByText(/Average resolution:/)).toContainText(
    "1 resolved/closed",
  );
  await page.goto(`${companyURL}/team`);
  await expect(
    page.getByRole("cell", { name: email, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Make member", exact: true }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: /Report not found|another administrator/ }),
  ).toContainText("another administrator");
  await localSQL(page.request, "UPDATE users SET is_admin=1 WHERE email=?", [
    email,
  ]);
  await page.reload();
  await page.goto("/admin/moderation");
  await expect(page.getByText("Flagged comment")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Delete comment", exact: true })
    .click();
  await expect(page.getByText("No pending reports.")).toBeVisible();
  await page.goto(reportURL);
  await expect(
    page.getByText("[Deleted comment]", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "View replies (1)", exact: true })
    .click();
  await expect(
    page.getByText("Confirmed the fix with a fresh install.", { exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) =>
    dialog.accept("Local moderation fixture for testing."),
  );
  await page.getByRole("button", { name: "Flag for moderation" }).click();
  await expect(page.getByRole("status")).toContainText("Sent for moderation.");
  await page.goto("/admin/moderation");
  await expect(
    page.getByRole("heading", { name: `Company status issue ${unique}` }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Delete report", exact: true })
    .click();
  await expect(page.getByText("No pending reports.")).toBeVisible();
  await page
    .getByRole("button", { name: "Restore report", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Report restored." }),
  ).toBeVisible();
  await page.goto(reportURL);
  await expect(
    page.getByRole("heading", { name: `Company status issue ${unique}` }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/desktop-report.png",
    fullPage: true,
  });
  await page.goto("/admin/audit");
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: reportURL.split("/").pop()! })
      .getByRole("cell", { name: "moderation_delete", exact: true }),
  ).toBeVisible();
});
test("mobile navigation stays visible without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Reports", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-home.png",
    fullPage: true,
  });
  await page.goto("/bugs");
  await expect(page.getByLabel("Sort reports")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
