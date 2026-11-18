# Phase 7 — Automated E2E checks

These tests were adapted to the Phase 6.3/6.4 route and UI shapes. They are **not** a complete production E2E suite. No tests were executed against your Windows machine.

## Install

1. Back up your project, and use a *separate development/test database* with disposable accounts and fake data. These tests create draft applications and will leave them in that database.
2. Extract the ZIP into the **root** of `loan-application` (the same directory as `package.json`). It adds files only; it does not overwrite app code.
3. `npm install -D @playwright/test`
4. `npx playwright install chromium`
5. Start Next.js in another terminal: `npm run dev`
6. Define credentials for two *already registered* disposable accounts in the PowerShell test terminal:

```powershell
$env:TEST_A_EMAIL = "test-a@example.com"
$env:TEST_A_PASSWORD = "your-test-a-password"
$env:TEST_B_EMAIL = "test-b@example.com"
$env:TEST_B_PASSWORD = "your-test-b-password"
$env:TEST_BASE_URL = "http://127.0.0.1:3000"
npx playwright test -c playwright.phase7.config.ts
```

## Notes

- If tests report `skipped`, set the account credentials; a skipped test is **not a pass**.
- An HTTP 429 means you may have hit the existing account/application rate limit. Wait for the window or use a fresh disposable account. Do not disable rate limiting on the public app to force tests through.
- Review report: `npx playwright show-report playwright-report-phase7`
- Existing `playwright.phase6.config.ts` is kept intact. Phase 7 config discovers only `tests/phase7`.
- Existing Phase 6.2 upload test uses a truncated PNG. That test is not suitable for testing valid image processing; use real fixture images from a safe, generated file.
- Password-reset emails are **not** sent by this suite. Their delivery remains a known blocker to fix before production.
- `TEST_BASE_URL` must be an environment you control, not a live lender.

## Additional coverage to build

The current checks cover anonymous API denial, login, forgot-password page, loan selection, required field validation, saving/revisions and cross-account authorization. Finish separate tests for full Personal/Home/Business workflows, upload preview/compression, signature canvas, pre-approval submission, email delivery, logout/session revocation and accessibility before treating the suite as comprehensive.

## Important privacy precaution

Use fake PAN/Aadhaar information only. Do not run this suite against real applicants or production data.
