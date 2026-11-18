
import { test, expect } from "@playwright/test";

import {
  accounts,
  authenticatedContext,
  requireAccounts,
} from "../helpers/auth";

test(
  "loan selection and required-field validation work",
  async ({ browser }) => {
    test.skip(
      !requireAccounts(),
      "Test credentials are not configured"
    );

    // 1. Sign in using the working authentication helper.
    const context = await authenticatedContext(
      browser,
      accounts.a
    );

    const page = await context.newPage();

    try {
      // 2. Create a completely new application.
      const createResponse = await context.request.post(
        "/api/applications"
      );

      expect(
        createResponse.status(),
        "Could not create a test application"
      ).toBe(201);

      const application = await createResponse.json();

      expect(application.id).toBeTruthy();

      // 3. Set draft information BEFORE opening /apply.
      // This avoids timing problems during page loading.
      await page.addInitScript((id: string) => {
        localStorage.setItem("loan-draft-id", id);

        localStorage.setItem(
          `loan-draft-step:${id}`,
          "0"
        );
      }, application.id);

      // 4. Track browser errors.
      const browserErrors: string[] = [];

      page.on("pageerror", (error) => {
        browserErrors.push(error.message);
      });

      // 5. Open the application.
      const response = await page.goto("/apply", {
        waitUntil: "domcontentloaded",
      });
// 6 debugs
const applicationId = await page.evaluate(() =>
  localStorage.getItem("loan-draft-id")
);

if (!applicationId) {
  throw new Error("Missing draft ID in localStorage");
}

const draftResponse = await context.request.get(
  `/api/applications/${applicationId}`
);

console.log(
  "DRAFT GET STATUS:",
  draftResponse.status()
);

if (!draftResponse.ok()) {
  console.log(
    "DRAFT GET FAILED:",
    (await draftResponse.text()).slice(0, 500)
  );
}


console.log("PAGE URL:", page.url());
console.log("HTTP STATUS:", response?.status());

console.log(
  "JAVASCRIPT ENABLED:",
  page.context().browser()?.browserType().name()
);

page.on("console", (message) => {
  if (message.type() === "error") {
    console.log("BROWSER CONSOLE:", message.text());
  }
});

page.on("requestfailed", (request) => {
  console.log(
    "FAILED REQUEST:",
    request.url(),
    request.failure()?.errorText
  );
});

const draftId = await page.evaluate(() =>
  localStorage.getItem("loan-draft-id")
);

console.log("DRAFT ID PRESENT:", Boolean(draftId));


      // 6. Verify that the actual wizard loaded.
      const homeLoan = page.getByRole("button", {
        name: /Home Loan/i,
      });

      try {
        await expect(homeLoan).toBeVisible({
          timeout: 15000,
        });
      } catch {
        const pageText = (
          await page.locator("body").innerText()
        ).slice(0, 1500);

        throw new Error(
          [
            "WIZARD RENDER FAILED",
            `URL: ${page.url()}`,
            `HTTP: ${response?.status() ?? "unknown"}`,
            `PAGE: ${pageText}`,
            `JS ERRORS: ${browserErrors.join(" | ") || "none"}`,
          ].join("\n")
        );
      }

      // 7. Select Home Loan.
      await homeLoan.click();

      await expect(homeLoan).toHaveAttribute(
        "aria-pressed",
        "true"
      );

      // 8. Continue to Personal Details.
      const continueButton = page.getByRole("button", {
        name: /^Continue$/i,
      });

      await continueButton.click();

      // 9. Verify the personal details form appears.
      await expect(
        page.locator("#loan-field-fullName")
      ).toBeVisible({
        timeout: 10000,
      });

      // 10. Continue without filling required fields.
      await continueButton.click();

      // 11. The form should reject incomplete information.
      await expect(
        page.getByText(
          /Please correct the highlighted fields|Enter your full name/i
        ).first()
      ).toBeVisible();

    } finally {
      await context.close();
    }
  }
);
