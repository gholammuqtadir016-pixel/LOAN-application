
import {
  expect,
  type Browser,
  type BrowserContext,
} from "@playwright/test";

// --------------------------------------------------
// Test account configuration
// --------------------------------------------------

export const accounts = {
  a: {
    email: process.env.TEST_A_EMAIL,
    password: process.env.TEST_A_PASSWORD,
  },

  b: {
    email: process.env.TEST_B_EMAIL,
    password: process.env.TEST_B_PASSWORD,
  },
};

// --------------------------------------------------
// Check whether credentials are configured
// --------------------------------------------------

export function requireAccounts(two = false) {
  const { a, b } = accounts;

  return Boolean(
    a.email &&
      a.password &&
      (!two || (b.email && b.password))
  );
}

// --------------------------------------------------
// Create an authenticated browser context
// --------------------------------------------------


export async function authenticatedContext(
  browser: Browser,
  account: {
    email?: string;
    password?: string;
  }
): Promise<BrowserContext> {
  if (!account.email || !account.password) {
    throw new Error("Missing test account credentials");
  }

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("/login", {
      waitUntil: "domcontentloaded",
    });

    const emailInput = page.locator(
      'input[name="email"]'
    );

    const passwordInput = page.locator(
      'input[name="password"]'
    );

    const loginButton = page.locator(
      'button[type="submit"]'
    );

    await expect(loginButton).toBeVisible();

    await emailInput.fill(account.email);
    await passwordInput.fill(account.password);

    await loginButton.click();

    // Confirm successful authentication
    await expect(page).toHaveURL(
      /\/dashboard(?:\?|$)/,
      { timeout: 20000 }
    );

    await page.close();

    return context;
  } catch (error) {
    await context.close();
    throw error;
  }
}
