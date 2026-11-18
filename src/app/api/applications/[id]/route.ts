import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/security";
import { currentUserId } from "@/lib/current-user";
import { loanSchema } from "@/lib/validations";
import { calculatePreApproval } from "@/lib/loan";
import type { LoanData } from "@/types/loan";
import { draftSchema } from "@/lib/draft-schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { privateJson, tooManyRequests } from "@/lib/security-response";
import { audit } from "@/lib/security-audit";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

async function ownedApplication(id: string, userId: string) {
  return prisma.application.findFirst({ where: { id, userId } });
}

function validVersion(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function conflict(version: number) {
  return privateJson(
    {
      code: "VERSION_CONFLICT",
      error: "This draft changed elsewhere. Reload it before editing.",
      serverVersion: version,
    },
    409,
  );
}

export async function GET(_request: NextRequest, { params }: Context) {
  const userId = await currentUserId();
  if (!userId) return privateJson({ error: "Sign in required" }, 401);
  const { id } = await params;
  const application = await ownedApplication(id, userId);
  if (!application) return privateJson({ error: "Not found" }, 404);

  return privateJson({
    id: application.id,
    data: decrypt<LoanData>(application),
    status: application.status,
    version: application.version,
  });
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const userId = await currentUserId();
  if (!userId) return privateJson({ error: "Sign in required" }, 401);
  const { id } = await params;

  try {
    const application = await ownedApplication(id, userId);
    if (!application) return privateJson({ error: "Not found" }, 404);
    if (application.status !== "DRAFT")
      return privateJson({ error: "Already submitted" }, 409);

    const limit = await checkRateLimit({
      scope: "application:save",
      identity: userId,
      limit: 180,
      windowSeconds: 3600,
    });
    if (!limit.allowed) return tooManyRequests(limit.retryAfter);
    if (Number(request.headers.get("content-length") || 0) > 35000) {
      return privateJson({ error: "Draft too large" }, 413);
    }

    const body = await request.json();
    if (!validVersion(body?.version))
      return privateJson({ error: "Missing draft version" }, 400);
    const parsed = draftSchema.safeParse(body?.data);
    if (!parsed.success)
      return privateJson({ error: "Invalid draft fields" }, 400);

    // Atomic compare-and-swap. A stale tab cannot overwrite the latest revision.
    const result = await prisma.application.updateMany({
      where: { id, userId, status: "DRAFT", version: body.version },
      data: { ...encrypt(parsed.data), version: { increment: 1 } },
    });
    if (result.count !== 1) {
      const current = await ownedApplication(id, userId);
      if (!current) return privateJson({ error: "Not found" }, 404);
      await audit({
        actorId: userId,
        applicationId: id,
        action: "DRAFT_CONFLICT",
        outcome: "CONFLICT",
      });
      return conflict(current.version);
    }

    await audit({
      actorId: userId,
      applicationId: id,
      action: "DRAFT_SAVED",
      outcome: "SUCCESS",
    });
    return privateJson({ id, saved: true, version: body.version + 1 });
  } catch {
    return privateJson({ error: "Unable to save draft" }, 500);
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  const userId = await currentUserId();
  if (!userId) return privateJson({ error: "Sign in required" }, 401);
  const { id } = await params;

  try {
    const application = await ownedApplication(id, userId);
    if (!application) return privateJson({ error: "Not found" }, 404);
    if (application.status !== "DRAFT")
      return privateJson({ error: "Already submitted" }, 409);

    const limit = await checkRateLimit({
      scope: "application:submit",
      identity: userId,
      limit: 20,
      windowSeconds: 3600,
    });
    if (!limit.allowed) return tooManyRequests(limit.retryAfter);

    const body = await request.json();
    if (!validVersion(body?.version))
      return privateJson({ error: "Missing draft version" }, 400);
    const parsed = loanSchema.safeParse(body?.data);
    if (!parsed.success) {
      return privateJson(
        {
          error: "Correct the required fields",
          issues: parsed.error.flatten(),
        },
        400,
      );
    }

    const loan = parsed.data;
    const categories = [
      "identity",
      "income",
      ...(loan.loanType === "HOME" ? ["property"] : []),
      ...(loan.loanType === "BUSINESS" ? ["business"] : []),
    ];
    const documentIds = [
      ...categories.map((category) => loan.documentIds[category]),
      loan.signatureId,
    ];
    const documents = await prisma.document.findMany({
      where: { applicationId: id, id: { in: documentIds } },
      select: { id: true },
    });
    const found = new Set(documents.map((document) => document.id));
    if (documentIds.some((docId) => !found.has(docId))) {
      return privateJson(
        { error: "A required document or signature is missing" },
        400,
      );
    }

    const result = await prisma.application.updateMany({
      where: { id, userId, status: "DRAFT", version: body.version },
      data: {
        ...encrypt(loan),
        status: "SUBMITTED",
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) {
      const current = await ownedApplication(id, userId);
      if (!current) return privateJson({ error: "Not found" }, 404);
      await audit({
        actorId: userId,
        applicationId: id,
        action: "DRAFT_CONFLICT",
        outcome: "CONFLICT",
      });
      return conflict(current.version);
    }

    await audit({
      actorId: userId,
      applicationId: id,
      action: "APPLICATION_SUBMITTED",
      outcome: "SUCCESS",
    });
    return privateJson({
      id,
      status: "SUBMITTED",
      version: body.version + 1,
      preApproval: calculatePreApproval(loan),
    });
  } catch {
    return privateJson({ error: "Unable to submit" }, 500);
  }
}
