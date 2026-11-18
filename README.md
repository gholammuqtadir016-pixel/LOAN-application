# Phase 6.1 — Account login + ownership (LOCAL DEVELOPMENT FOUNDATION)

This upgrade is designed for the existing Next.js App Router + Prisma 6.19 + PostgreSQL loan project.
It includes registration, login, a user dashboard, per-user application ownership, and protected document APIs.
**Do not deploy or accept real identities, financial records, PAN/Aadhaar numbers, or actual loan requests with this code.**
Additional production controls are required, especially email verification, password recovery, bot protection / rate limits, security monitoring, stronger content inspection, security testing, backup/restore procedures, and full account/session revocation.

## Preserve the working project FIRST

From `C:\Users\Asus\loan-application`:

```powershell
Copy-Item prisma\schema.prisma prisma\schema.phase5.backup.prisma
Copy-Item src src.phase5.backup -Recurse
Copy-Item .env .env.phase5.backup
```

Keep backups OUT of Git, because `.env` includes secrets. Verify the actual zip contents before extraction. Archive has no `package.json` or `.env`.

## Install

```powershell
npm install next-auth@beta bcryptjs
npm install -D @types/bcryptjs
# Extract ZIP over project root after making backups
# Copy the CSS appended once (see commands below)
```

Create a strong `AUTH_SECRET` in your `.env` (do not replace DATA_ENCRYPTION_KEY):

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Add to `.env`: `AUTH_SECRET="<generated value>"`

## Migration caution

Inspect the migration diff BEFORE applying, particularly when your database contains valuable records:

```powershell
npx prisma migrate dev --create-only --name add_users_and_ownership
```

Read the SQL file generated under `prisma/migrations/.../migration.sql`. It should add `User`, new nullable `Application.userId` and its index / relationship; it **must not** drop existing `Application`/`Document` tables or data. If it proposes destructive changes, STOP and investigate rather than applying.

Once reviewed:

```powershell
npx prisma migrate dev
npx prisma generate
npx tsc --noEmit
npm run dev
```

Add the styles exactly once:

```powershell
Get-Content .\phase6-styles.css -Raw | Add-Content .\src\app\globals.css
```

## New user experience

- `/register`: create a demo account
- `/login`: sign in
- `/dashboard`: user-specific list of applications, open existing drafts
- `/apply`: protected form, creates new per-user drafts
- API endpoints check server authentication and database ownership, **not** a client-provided user ID.

## Legacy drafts

Existing anonymous drafts have `userId = NULL`. They remain in the database but do not automatically transfer to any newly registered account. Their files likewise remain on disk. A secure legacy-claim workflow needs to be designed separately. Do not set all old `userId`s to the first new user; that would disclose sensitive documents.

## Relevant original files intentionally untouched

- `src/lib/security.ts`: retains encrypted payload functionality. Old `session()` is no longer used in the replaced API endpoints.
- `src/components/loan/LoanWizard.tsx`: Phase 5 remains as-is.
- `src/hooks/useDraftAutosave.ts`: Phase 3 remains as-is.
- `src/app/api/verify/route.ts`: still only a **format simulation**, not an identity check.

## Limits before production

- Registration/login have no rate limiting, email ownership confirmation, password recovery, or session revocation.
- The file upload endpoint still requires real malware scanning, image re-encoding, quotas, PDF sanitization and object storage if deployed.
- PostgreSQL encryption key management and key rotation need a managed design.
- Browser localStorage holds a draft identifier; it is not an authentication credential. It may point to an old draft after account changes, but ownership checks reject it.
- Existing `Application` model includes `ownerHash` for legacy drafts. Newly registered applications use `userId`.
- API draft PATCH accepts flexible draft-shaped JSON (subject to byte limit); add strict typed draft schemas and optimistic concurrency before production.
- Existing submission uses simulated verification, and result is not a lending offer.
- Run authorization / IDOR tests against all endpoints and verify user A cannot access user B's IDs.

## If login errors appear

Restart Next.js after adding AUTH_SECRET, confirm your Postgres credentials, and confirm Prisma migration succeeded. For Next.js 16, follow the official Auth.js guidance for current `proxy.ts` support; this package intentionally does not use proxy as the sole access control. Each sensitive server endpoint enforces user ownership.
