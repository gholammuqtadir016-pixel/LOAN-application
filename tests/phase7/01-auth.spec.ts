import { expect, test } from "@playwright/test";
import { authenticatedContext, accounts, requireAccounts } from "../helpers/auth";

test("anonymous users are denied application creation", async ({ request }) => {
  const response = await request.post("/api/applications");
  expect(response.status()).toBe(401);
});

test("login redirects to dashboard", async ({ browser }) => {
  test.skip(!requireAccounts(), "Set TEST_A_EMAIL and TEST_A_PASSWORD for a disposable account");
  const context = await authenticatedContext(browser, accounts.a);
  try {
    const page = await context.newPage();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
  } finally {
    await context.close();
  }
});

test("forgot-password page is reachable without disclosing an account", async ({ page }) => {
  await page.goto("/forgot-password");
  await expect(page.locator('input[type="email"]')).toBeVisible();
  // Do NOT send a real reset email in this smoke test.
});
