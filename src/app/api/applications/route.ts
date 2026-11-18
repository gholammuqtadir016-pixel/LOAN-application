import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/security";
import { currentUserId } from "@/lib/current-user";
import { EMPTY_LOAN } from "@/types/loan";
import { checkRateLimit } from "@/lib/rate-limit";
import { tooManyRequests } from "@/lib/security-response";

export const runtime = "nodejs";

export async function POST() {
  const userId = await currentUserId();
  if (!userId)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  try {
    const limit = await checkRateLimit({
      scope: "application:create",
      identity: userId,
      limit: 15,
      windowSeconds: 60 * 60,
    });
    if (!limit.allowed) return tooManyRequests(limit.retryAfter);
    const application = await prisma.application.create({
      data: { userId, ...encrypt(EMPTY_LOAN) },
    });
    return NextResponse.json(
      { id: application.id, data: EMPTY_LOAN, version: application.version },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to create draft" },
      { status: 500 },
    );
  }
}
