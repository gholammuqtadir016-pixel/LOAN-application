# Phase 6.2 — Access control hardening, rate limits, legacy claim, security tests

This overlay is for the Phase 6.1 code package. Preserve your working project and DB backups before merging.
DO NOT use real identities or documents in this demo. This is NOT production certification.

## Changes
- PostgreSQL-backed atomic rate limits for login, registration, draft create/save/submit, and uploads.
- Strict draft payload field schema (rejects unknown and oversized strings).
- Safe response for rate-limit errors (HTTP 429 with Retry-After).
- Protected document downloads default to `attachment` instead of inline rendering.
- Legacy draft-claim API: authenticated user plus original `loan_session` cookie required; ID alone is insufficient.
- Multi-account authorization Playwright test: authenticated user B may not access user A's drafts or files.

## Install (Windows PowerShell)

1. Back up `src`, `prisma/schema.prisma` and the PostgreSQL database separately.
2. Extract into project ROOT. Do NOT replace .env.
3. Review Prisma migration:
   `npx prisma migrate dev --create-only --name phase6_rate_limits`
   Generated SQL should ONLY add `RateLimit`; no dropping/rebuilding existing tables.
4. Inspect migration, then `npx prisma migrate dev` and `npx prisma generate`.
5. `npx tsc --noEmit` then `npm run dev`.
6. If AUTH_SECRET is not set, configure an unpredictable value. Do not rotate it casually: rate-limit key hashing will change.

## Verify authorization

Install test dependency: `npm install -D @playwright/test` then `npx playwright install chromium`.
Create TWO disposable accounts using /register. Do NOT put their passwords in committed files.

PowerShell (per terminal session):
```
$env:TEST_A_EMAIL="test-a@example.invalid"
$env:TEST_A_PASSWORD="<password-for-A>"
$env:TEST_B_EMAIL="test-b@example.invalid"
$env:TEST_B_PASSWORD="<password-for-B>"
npx playwright test -c playwright.phase6.config.ts
```

The test creates a throwaway draft and fake PNG file (signature-only bytes) on the local development server.
Use an isolated TEST database if possible. Do not run against production accounts/data.

## Claim a legacy anonymous draft (opt-in)

The browser must still have the ORIGINAL `loan_session` HttpOnly cookie from before Phase 6.1.
Sign into the desired account in that same browser profile. In the browser console on your local app:

```
await fetch('/api/legacy-claims', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ applicationId: 'YOUR_OLD_DRAFT_ID' })
}).then(async r => ({ status: r.status, body: await r.json() }))
```

On HTTP 200, the draft now belongs to your authenticated account and should show in /dashboard.
On HTTP 404, the proof cookie is gone/expired, draft is already claimed/submitted, or it is not the right ID.
NEVER bulk assign all ownerless drafts to an account. Do not expose document content as proof of ownership.

## Operational and security limitations (must address before real deployment)
- Fixed-window rate limiting can deny legitimate users (login keys are per-email), and is not a bot defense by itself.
- Registration from numerous distinct emails needs edge-level bot/abuse protection; rate limiting by IP requires a trusted reverse proxy.
- Set TRUSTED_CLIENT_IP_HEADER ONLY when your proxy overwrites/strips that header; otherwise leave unset.
- RateLimit rows need scheduled expiration cleanup (database housekeeping).
- Legacy claim is authorized with possession of a 30-day browser cookie; if lost, do not perform manual transfers without a stronger proof process.
- Add verified email, account recovery, account deletion, session revocation and audit logs.
- Auth.js Credentials JWT sessions do not immediately revoke on password change without additional session version checks.
- Document handling still needs content decoding/re-encoding, malware scanning, quotas, cleanup and object storage outside dev.
- Confirm CSRF protections on all authentication and mutation endpoints, configure secure headers and HTTPS at the edge, and test with your target proxy.
- **Concurrent edits from multiple browser tabs can overwrite one another** until optimistic concurrency / version checks are added.
- Encryption keys must be managed securely with backups, rotation and appropriate data retention/deletion.
