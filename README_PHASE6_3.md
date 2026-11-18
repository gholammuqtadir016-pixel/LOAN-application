# Phase 6.3A — Draft concurrency + security audit (incremental upgrade)

This overlay is built against **Phase 6.2**, including the Phase 5 wizard and Phase 3 autosave hook. It intentionally does **not** include password recovery yet; password reset requires a verified outbound email provider, secure token delivery, and session-revocation design. Never expose reset tokens in API responses.

## Install (Windows PowerShell)
1. BACK UP the entire project AND the PostgreSQL database separately. Back up .env outside Git. Avoid applying migrations to production.
2. Stop the dev server and extract this ZIP in project root; it replaces **`prisma/schema.prisma`**, **`src/app/api/applications/[id]/route.ts`**, **`src/app/api/applications/route.ts`**, **`src/hooks/useDraftAutosave.ts`**, **`src/components/loan/DraftSaveStatus.tsx`**, and **`src/components/loan/LoanWizard.tsx`**.
3. Review any local custom modifications before overwriting. Only append `phase6_3-styles.css` once.
4. Run `npx prisma migrate dev --create-only --name phase63_revision_audit`; inspect SQL: it should only add `Application.version Int DEFAULT 0` and a `SecurityAudit` table + indexes. **Do not proceed** if it drops existing data.
5. Then `npx prisma migrate dev`, `npx prisma generate`, `npx tsc --noEmit`, `npm run dev`.

## Verify with two browser tabs on the SAME draft
- Open same draft in Tab A and Tab B, both displaying revision 0 (or current N).
- Edit in Tab A, wait until saved. The revision becomes N+1.
- Edit in Tab B; its PATCH should be rejected with HTTP 409 `VERSION_CONFLICT`.
- Tab B must show a conflict + **Reload latest draft**. It must NOT silently overwrite Tab A.
- Refresh Tab B to reload the server version. **Unsaved Tab B changes will be discarded**; save your work elsewhere before reloading if needed.
- Submit from up-to-date Tab A. Verify that stale Tab B cannot save or submit.
- Check `SecurityAudit` in Prisma Studio for save/conflict/submit metadata.

## Limitations and next subphase
- This is a baseline optimistic-concurrency strategy; no automatic three-way merge.
- Conflict status prevents automatic retry. Network retry still follows Phase 3 policy.
- Audit writes are best-effort, so an audit outage will not block loan submission. For regulated audit requirements, use an outbox/transactional audit strategy.
- The supplied header file is an example only; it is NOT installed automatically because an existing Next config may have other settings. Review deployment CSP, HSTS, cookies, secrets and proxies before enabling headers in production.
- Password recovery and session revocation are not included; implement only when SMTP/transactional email is configured.
- This code has not been executed against your specific local project. Run TypeScript, integration, cross-tab and authorization tests before deployment.
