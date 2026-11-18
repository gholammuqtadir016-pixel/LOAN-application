
import {
  test,
  expect,
  type Page,
} from "@playwright/test";

import {
  accounts,
  authenticatedContext,
  requireAccounts,
} from "../helpers/auth";

// Only synthetic test data. Never use real identity documents.
const TEST_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=",
  "base64"
);

// Find fields by their actual input name, ID, or label.
async function fillField(
  page: Page,
  name: string,
  label: string,
  value: string
) {
  const selector = [
    `[name="${name}"]`,
    `#loan-field-${name}`,
  ].join(", ");

  const candidates = page.locator(selector);

  const field =
    (await candidates.count()) > 0
      ? candidates.first()
      : page.getByLabel(label, {
          exact: false,
        }).first();

  await expect(field).toBeVisible({
    timeout: 10000,
  });

  await field.fill(value);
}

async function continueStep(page: Page) {
  await page.getByRole("button", {
    name: /^Continue$/i,
  }).click();
}

async function expectStep(page: Page, step: number) {
  await expect(
    page.getByText(
      new RegExp(`STEP\\s+${step}\\s+OF\\s+10`, "i")
    ).first()
  ).toBeVisible({
    timeout: 15000,
  });
}

async function uploadDocument(
  page: Page,
  category: "Identity" | "Income"
) {
  const section = page.locator(
    `section.document-upload-card[aria-label="${category} proof"]`
  );

  await expect(section).toBeVisible();

  await section.locator('input[type="file"]').setInputFiles({
    name: `${category.toLowerCase()}-test.png`,
    mimeType: "image/png",
    buffer: TEST_PNG,
  });

  await expect(
    section.getByText(/Uploaded successfully/i)
  ).toBeVisible({
    timeout: 20000,
  });
}

test(
  "complete Personal Loan application with uploads and signature",
  async ({ browser }) => {
    test.setTimeout(120000);

    test.skip(
      !requireAccounts(),
      "Test account credentials are missing"
    );

    const context = await authenticatedContext(
      browser,
      accounts.a
    );

    const page = await context.newPage();

    try {
      // ============================================
      // START A FRESH APPLICATION
      // ============================================

      await page.goto("/apply");

      await expect(
        page.getByRole("button", {
          name: /Start application/i,
        })
      ).toBeVisible({
        timeout: 15000,
      });

      await page.getByRole("button", {
        name: /Start application/i,
      }).click();

      await expectStep(page, 1);

      const applicationId = await page.evaluate(() =>
        localStorage.getItem("loan-draft-id")
      );

      expect(applicationId).toBeTruthy();

      // ============================================
      // STEP 1 — LOAN TYPE
      // ============================================

      const personalLoan = page.getByRole("button", {
        name: /Personal Loan/i,
      });

      await personalLoan.click();

      await expect(personalLoan).toHaveAttribute(
        "aria-pressed",
        "true"
      );

      await continueStep(page);
      await expectStep(page, 2);

      // ============================================
      // STEP 2 — PERSONAL DETAILS
      // ============================================

      await fillField(
        page,
        "fullName",
        "Full legal name",
        "Playwright Test Applicant"
      );

      await fillField(
        page,
        "dob",
        "Date of birth",
        "1995-06-15"
      );

      await fillField(
        page,
        "pan",
        "PAN (uppercase)",
        "ABCDE1234F"
      );

      await fillField(
        page,
        "aadhaarLast4",
        "Last four Aadhaar digits",
        "1234"
      );

      await page.getByRole("button", {
        name: /Simulate PAN check/i,
      }).click();

      await expect(
        page.locator(".verify-row .success")
      ).toHaveCount(1);

      await page.getByRole("button", {
        name: /Simulate Aadhaar check/i,
      }).click();

      await expect(
        page.locator(".verify-row .success")
      ).toHaveCount(2);

      await continueStep(page);
      await expectStep(page, 3);

      // ============================================
      // STEP 3 — CONTACT AND ADDRESS
      // ============================================

      await fillField(
        page,
        "email",
        "Email",
        "playwright-applicant@example.com"
      );

      await fillField(
        page,
        "phone",
        "Indian mobile number",
        "9876543210"
      );

      await fillField(
        page,
        "address",
        "Street address",
        "123 Test Street, Demo Locality"
      );

      await fillField(page, "city", "City", "Kolkata");

      await fillField(
        page,
        "state",
        "State",
        "West Bengal"
      );

      await fillField(
        page,
        "pincode",
        "PIN code",
        "700001"
      );

      await continueStep(page);
      await expectStep(page, 4);

      // ============================================
      // STEP 4 — EMPLOYMENT
      // ============================================

      const employment = page.locator(
        '[name="employment"], #loan-field-employment'
      ).first();

      const employmentField =
        (await employment.count()) > 0
          ? employment
          : page.getByLabel(/Employment type/i).first();

      await expect(employmentField).toBeVisible();

      await employmentField.selectOption("SALARIED");

      await fillField(
        page,
        "employer",
        "Employer name",
        "Demo Technology Pvt Ltd"
      );

      await fillField(
        page,
        "experienceYears",
        "Years of work experience",
        "5"
      );

      await continueStep(page);
      await expectStep(page, 5);

      // ============================================
      // STEP 5 — FINANCIAL DETAILS
      // ============================================

      await fillField(
        page,
        "monthlyIncome",
        "Monthly income",
        "100000"
      );

      await fillField(
        page,
        "monthlyExpenses",
        "Monthly living expenses",
        "20000"
      );

      await fillField(
        page,
        "existingEmi",
        "Existing monthly EMIs",
        "5000"
      );

      await fillField(
        page,
        "creditScore",
        "Credit score",
        "750"
      );

      await continueStep(page);
      await expectStep(page, 6);

      // ============================================
      // STEP 6 — LOAN REQUEST
      // ============================================

      await fillField(
        page,
        "amount",
        "Requested loan amount",
        "300000"
      );

      await fillField(
        page,
        "tenureMonths",
        "Tenure (months)",
        "36"
      );

      await fillField(
        page,
        "purpose",
        "Loan purpose",
        "Home renovation and repairs"
      );

      await continueStep(page);
      await expectStep(page, 7);

      // ============================================
      // STEP 7 — PERSONAL LOAN PURPOSE
      // ============================================

      await fillField(
        page,
        "personalPurpose",
        "How will you use the personal loan?",
        "Renovating my apartment"
      );

      await continueStep(page);
      await expectStep(page, 8);

      // ============================================
      // STEP 8 — DOCUMENT UPLOAD
      // ============================================

      await uploadDocument(page, "Identity");
      await uploadDocument(page, "Income");

      await continueStep(page);
      await expectStep(page, 9);

      // ============================================
      // STEP 9 — E-SIGNATURE
      // ============================================

      const canvas = page.locator(
        "canvas.signature-canvas"
      );

      await expect(canvas).toBeVisible();

      const bounds = await canvas.boundingBox();

      if (!bounds) {
        throw new Error("Signature canvas is not visible");
      }

      const startX = bounds.x + 40;
      const startY = bounds.y + bounds.height / 2;

      await page.mouse.move(startX, startY);
      await page.mouse.down();

      await page.mouse.move(
        startX + 80,
        startY - 25,
        { steps: 12 }
      );

      await page.mouse.move(
        startX + 160,
        startY + 15,
        { steps: 12 }
      );

      await page.mouse.up();

      await page.getByRole("button", {
        name: /Save signature/i,
      }).click();

      await expect(
        page.getByText(/Signature saved/i)
      ).toBeVisible({
        timeout: 20000,
      });

      // ============================================
      // VERIFY CONSENT IS REQUIRED
      // ============================================
    
const consent = page.getByRole("checkbox", {
  name: /I consent to submitting/i,
});

// Explicitly uncheck consent before testing validation.
// This makes the test independent of its initial state.
await consent.uncheck();

await expect(consent).not.toBeChecked();

      await expect(consent).not.toBeChecked();

      await page.getByRole("button", {
        name: /^Submit application$/i,
      }).click();

      // Without consent, submission must be blocked.
      await expectStep(page, 9);

      await expect(
        page.getByText(/Consent is required/i)
      ).toBeVisible();

      // ============================================
      // ACCEPT CONSENT AND SUBMIT
      // ============================================

      await consent.check();

      await page.getByRole("button", {
        name: /^Submit application$/i,
      }).click();

      await expectStep(page, 10);

      await expect(
        page.getByRole("button", {
          name: /Start another application/i,
        })
      ).toBeVisible({
        timeout: 20000,
      });

      // ============================================
      // VERIFY DATABASE-BACKED APPLICATION STATUS
      // ============================================

      const finalResponse = await context.request.get(
        `/api/applications/${applicationId}`
      );

      expect(finalResponse.status()).toBe(200);

      const body = await finalResponse.json();
      const saved = body.application ?? body;

      expect(saved.status).toBe("SUBMITTED");

      console.log(
        "PASS: Complete Personal Loan E2E flow"
      );
    } finally {
      await context.close();
    }
  }
);
