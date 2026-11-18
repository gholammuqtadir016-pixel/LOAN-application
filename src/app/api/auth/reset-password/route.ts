import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit, trustedIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().min(35).max(160),
  password: z.string().min(12).max(128),
});

export async function POST(request: Request) {
  const rejected = () => NextResponse.json(
    { error: "Reset link is invalid or expired. Request a new link." },
    { status: 400 }
  );

  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return rejected();

    // Global limit on reset attempts. Configure a TRUSTED_CLIENT_IP_HEADER
    // through a reverse proxy to add IP-based controls.
    const ip = trustedIp(request);
    if (ip) {
      const ipLimit = await checkRateLimit({
        scope: "reset-password:ip", identity: ip,
        limit: 15, windowSeconds: 60 * 60,
      });
      if (!ipLimit.allowed) {
        return NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
      }
    }

    const tokenHash = createHash("sha256")
      .update(parsed.data.token)
      .digest("hex");
    const tokenLimit = await checkRateLimit({
      scope: "reset-password:token", identity: tokenHash,
      limit: 5, windowSeconds: 15 * 60,
    });
    if (!tokenLimit.allowed) return rejected();

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const now = new Date();

    // Consume exactly once; updates to password and session generation are atomic.
    const changed = await prisma.$transaction(async (tx) => {
      const record = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
        select: { id: true, userId: true, expiresAt: true, usedAt: true },
      });
      if (!record || record.usedAt || record.expiresAt <= now) return false;

      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (consumed.count !== 1) return false;

      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash, sessionVersion: { increment: 1 } },
      });
      await tx.passwordResetToken.deleteMany({
        where: { userId: record.userId, usedAt: null },
      });
      return true;
    });

    if (!changed) return rejected();
    return NextResponse.json({ ok: true, message: "Password updated. Sign in again." });
  } catch {
    return NextResponse.json({ error: "Unable to reset password." }, { status: 500 });
  }
}
