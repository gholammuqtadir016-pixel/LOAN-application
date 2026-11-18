
import { randomBytes, createHash } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { checkRateLimit, trustedIp } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/password-reset-mail";

// =====================================================
// CONFIGURATION
// =====================================================

export const runtime = "nodejs";

const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(254)
    .transform((value) => value.toLowerCase()),
});

// Always return the same response to the client.
// This prevents email-account enumeration.
const genericResponse = {
  message:
    "If an account exists, a reset link will be emailed shortly.",
};

// =====================================================
// PASSWORD RESET API
// =====================================================

export async function POST(request: Request) {
  try {
    // -------------------------------------------------
    // STEP 1: VALIDATE REQUEST
    // -------------------------------------------------

    const body = await request.json();

    const parsed = emailSchema.safeParse(body);

    if (!parsed.success) {
      console.warn(
        "[PASSWORD RESET] Invalid email request."
      );

      return NextResponse.json(genericResponse);
    }

    const email = parsed.data.email;

    // -------------------------------------------------
    // STEP 2: EMAIL RATE LIMITING
    // -------------------------------------------------

    const emailLimit = await checkRateLimit({
      scope: "forgot-password:email",
      identity: email,
      limit: 3,
      windowSeconds: 60 * 60,
    });

    if (!emailLimit.allowed) {
      console.warn(
        "[PASSWORD RESET] Email rate limit exceeded."
      );

      return NextResponse.json(genericResponse);
    }

    // -------------------------------------------------
    // STEP 3: IP RATE LIMITING
    // -------------------------------------------------

    const ip = trustedIp(request);

    if (ip) {
      const ipLimit = await checkRateLimit({
        scope: "forgot-password:ip",
        identity: ip,
        limit: 20,
        windowSeconds: 60 * 60,
      });

      if (!ipLimit.allowed) {
        console.warn(
          "[PASSWORD RESET] IP rate limit exceeded."
        );

        return NextResponse.json(genericResponse);
      }
    }

    // -------------------------------------------------
    // STEP 4: FIND REGISTERED USER
    // -------------------------------------------------

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      console.info(
        "[PASSWORD RESET] No matching registered account."
      );

      return NextResponse.json(genericResponse);
    }

    // -------------------------------------------------
    // STEP 5: CHECK EMAIL CONFIGURATION
    // -------------------------------------------------

    const requiredVariables = [
      "RESEND_API_KEY",
      "RESET_EMAIL_FROM",
      "APP_BASE_URL",
    ] as const;

    const missingVariables = requiredVariables.filter(
      (name) => !process.env[name]
    );

    if (missingVariables.length > 0) {
      console.error(
        "[PASSWORD RESET] Missing environment variables:",
        missingVariables.join(", ")
      );

      return NextResponse.json(genericResponse);
    }

    // -------------------------------------------------
    // STEP 6: GENERATE SECURE RESET TOKEN
    // -------------------------------------------------

    const token = randomBytes(32).toString("base64url");

    const tokenHash = createHash("sha256")
      .update(token)
      .digest("hex");

    // Link expires after 15 minutes.
    const expiresAt = new Date(
      Date.now() + 15 * 60 * 1000
    );

    // -------------------------------------------------
    // STEP 7: SAVE HASHED TOKEN IN DATABASE
    // -------------------------------------------------

    const savedToken =
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
        select: {
          id: true,
        },
      });

    // -------------------------------------------------
    // STEP 8: SEND RESET EMAIL VIA RESEND
    // -------------------------------------------------

    try {
      await sendPasswordResetEmail(
        user.email,
        token
      );

      console.info(
        "[PASSWORD RESET] Email provider accepted request."
      );
    } catch (emailError) {
      console.error(
        "[PASSWORD RESET] Email delivery failed:",
        emailError instanceof Error
          ? emailError.message
          : "Unknown email delivery error"
      );

      // Delete unusable token if delivery fails.
      try {
        await prisma.passwordResetToken.delete({
          where: {
            id: savedToken.id,
          },
        });
      } catch {
        console.error(
          "[PASSWORD RESET] Failed to clean up reset token."
        );
      }
    }

    // -------------------------------------------------
    // STEP 9: RETURN GENERIC RESPONSE
    // -------------------------------------------------

    return NextResponse.json(genericResponse);
  } catch (error) {
    // Do not expose internal details to the browser.
    console.error(
      "[PASSWORD RESET] Request processing failed:",
      error instanceof Error
        ? error.message
        : "Unknown server error"
    );

    return NextResponse.json(genericResponse);
  }
}
