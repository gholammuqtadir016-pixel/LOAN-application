import { db } from "@/lib/db";

type AuditEvent = {
  actorId?: string | null;
  applicationId?: string | null;
  action: "DRAFT_SAVED" | "DRAFT_CONFLICT" | "APPLICATION_SUBMITTED";
  outcome: "SUCCESS" | "DENIED" | "CONFLICT";
};

/** Safe, minimal metadata only. Audit failures do not interrupt user operations. */
export async function audit(event: AuditEvent): Promise<void> {
  try {
    await db().client.orm.public.SecurityAudit.create({
      actorId: event.actorId ?? null,
      applicationId: event.applicationId ?? null,
      action: event.action,
      outcome: event.outcome,
    });
  } catch (cause) {
    console.error("Audit event could not be written", {
      action: event.action,
      kind: cause instanceof Error ? cause.name : "unknown",
    });
  }
}
