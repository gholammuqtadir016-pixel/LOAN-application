import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/current-user";
import { checkRateLimit } from "@/lib/rate-limit";
import { tooManyRequests } from "@/lib/security-response";

export const runtime = "nodejs";

const schema = z
  .object({
    applicationId: z.string().min(8).max(128),
  })
  .strict();

/**
 * Claims ONE historical anonymous DRAFT only if the browser still holds the
 * original high-entropy, HttpOnly loan_session cookie. Knowing an ID alone
 * is never enough. Does not rotate or expose the legacy token.
 */
export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const limit = await checkRateLimit({
    scope: "legacy:claim",
    identity: userId,
    limit: 8,
    windowSeconds: 60 * 60,
  });
  if (!limit.allowed) return tooManyRequests(limit.retryAfter);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const token = (await cookies()).get("loan_session")?.value;
  if (!token || !/^[0-9a-f]{64}$/.test(token)) {
    return NextResponse.json(
      { error: "Legacy draft proof unavailable" },
      { status: 404 },
    );
  }

  const ownerHash = createHash("sha256").update(token).digest("hex");
  const changed = await db().client.orm.public.Application.where({
    id: parsed.data.applicationId,
    ownerHash,
    userId: null,
    status: "DRAFT",
  }).updateAndCount({ userId });

  if (changed !== 1) {
    return NextResponse.json(
      { error: "Legacy draft unavailable" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, id: parsed.data.applicationId });
}
