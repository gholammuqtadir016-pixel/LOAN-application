import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
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
    const changed = await db().client.transaction(async (tx) => {
      const orm = tx.orm.public;
      const record = await orm.PasswordResetToken.select(
        "id",
        "userId",
        "expiresAt",
        "usedAt",
      ).where({ tokenHash }).first();
      if (!record || record.usedAt || record.expiresAt <= now) return false;

      const consumed = await orm.PasswordResetToken.where((t) =>
        t.id.eq(record.id)
      )
        .where((t) => t.usedAt.isNull())
        .where((t) => t.expiresAt.gt(now))
        .updateAndCount({ usedAt: now });
      if (consumed !== 1) return false;

      await tx.execute(
        tx.raw.sql`
          UPDATE "User"
          SET "passwordHash" = ${passwordHash},
              "sessionVersion" = "sessionVersion" + 1
          WHERE "id" = ${record.userId}
        `.affectedCount().build(),
      );
      await orm.PasswordResetToken.where((t) => t.userId.eq(record.userId))
        .where((t) => t.usedAt.isNull())
        .deleteAll();
      return true;
    });

    if (!changed) return rejected();
    return NextResponse.json({ ok: true, message: "Password updated. Sign in again." });
  } catch {
    return NextResponse.json({ error: "Unable to reset password." }, { status: 500 });
  }
}
