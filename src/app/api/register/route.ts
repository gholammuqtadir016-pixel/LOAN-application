import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit, trustedIp } from "@/lib/rate-limit";
import { tooManyRequests } from "@/lib/security-response";

export const runtime = "nodejs";

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = registrationSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error:
            "Enter a name, valid email, and a password of at least 12 characters.",
        },
        { status: 400 },
      );
    }

    const limit = await checkRateLimit({
      scope: "register:email",
      identity: result.data.email,
      limit: 4,
      windowSeconds: 60 * 60,
    });
    if (!limit.allowed) return tooManyRequests(limit.retryAfter);

    const ip = trustedIp(request);
    if (ip) {
      const ipLimit = await checkRateLimit({
        scope: "register:ip",
        identity: ip,
        limit: 15,
        windowSeconds: 60 * 60,
      });
      if (!ipLimit.allowed) return tooManyRequests(ipLimit.retryAfter);
    }

    const passwordHash = await bcrypt.hash(result.data.password, 12);
    await prisma.user.create({
      data: { name: result.data.name, email: result.data.email, passwordHash },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Unable to create account with these details." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Could not register." }, { status: 500 });
  }
}
