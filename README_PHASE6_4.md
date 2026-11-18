# Phase 6.4 — Secure password recovery and JWT session revocation

This is an **overlay for Phase 6.3**, not a complete standalone app. It adds email-based password recovery using the Resend HTTPS API, single-use 15-minute hashed tokens, and JWT invalidation after password reset. It does not alter draft/application routes. No real identity documents should be used until a full security review.

## Requirements
- Existing Phase 6.3 project with Auth.js credentials, `bcryptjs`, Prisma 6, PostgreSQL, and `src/lib/rate-limit.ts`.
- Working account login and protected API routes using `currentUserId()`.
- An **email sender domain verified at Resend** (or customize `src/lib/password-reset-mail.ts` for your provider). Without configuration, forgot-password responds generically but sends no email.
- Never include `.env` or backups in Git. Keep the production mail API key secret.

## Installation (PowerShell, project root)

```powershell
# Stop npm run dev first.
Copy-Item prisma/schema.prisma prisma/schema.phase63.backup.prisma
Copy-Item src/auth.ts src/auth.phase63.backup.txt
Copy-Item src/components/auth/AuthForm.tsx src/components/auth/AuthForm.phase63.backup.txt
# Extract the zip into your project root, preserving directory structure.
npx prisma migrate dev --create-only --name phase64_password_reset
```

**Review migration SQL before applying.** Expected changes: `User.sessionVersion` integer with default 0, new `PasswordResetToken` table, unique index on `tokenHash`, foreign key to User. No table drops or changes to Application/Document. Back up PostgreSQL separately before applying.

```powershell
npx prisma migrate dev
npx prisma generate
npx tsc --noEmit
npm run dev
```

## Environment configuration
Add to `.env` (never share credentials in chat):

```dotenv
APP_BASE_URL="http://localhost:3000"
RESEND_API_KEY="YOUR_PRIVATE_RESEND_API_KEY"
RESET_EMAIL_FROM="Loan Portal <security@your-verified-domain.example>"
```

For deployment `APP_BASE_URL` **must** be HTTPS. `AUTH_SECRET` must already be set; preserve `DATABASE_URL` and `DATA_ENCRYPTION_KEY`. Resend sandbox/free accounts may restrict recipient addresses. Confirm domain verification before testing.

## User journey
1. Open `/forgot-password`; submit email.
2. A generic success message is returned regardless of account existence. When configured, the registered address receives a link valid for 15 minutes.
3. Open emailed `/reset-password?token=...`, set a new 12+ character password.
4. Token can be used exactly once. The reset increments `User.sessionVersion` to revoke existing Auth.js JWT identities on subsequent session checks. Sign in again.
5. Tokens are stored hashed in DB; reset links/tokens must never be logged or copied into public issues.

## Manual checks
- Existing and unknown emails show the same forgot-password response.
- An existing account receives the email; unknown email receives none.
- Expired or reused link rejected.
- Password under 12 characters rejected.
- New password works; old password no longer works.
- Existing tab becomes unauthorized after password reset and server session check.
- Registration, drafts, uploads, two-user authorization and 409 concurrency still work.

## Security limits / remaining work
- This revokes *application access* based on server session-version verification, but an already-running client UI may not visibly log out until refresh/request.
- Password reset links in URL query can appear in browser history; the `Referrer-Policy: no-referrer` header should be integrated into your actual Next.js config, and logs/proxies must redact URL queries.
- Configure deployment-wide origin checks/CSRF protections for the reset endpoints, automated token cleanup, alerting on mail delivery failures, and edge abuse controls. An IP header must only be trusted if overwritten by a trusted proxy.
- The email sender uses third-party Resend. Evaluate data residency, retention, email privacy, and provider reliability for real applicants.
- No generated code here has been run against your exact Windows environment: test against a separate database before production deployment.
