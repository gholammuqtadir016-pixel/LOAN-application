
import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/db";
import { currentUserId } from "@/lib/current-user";
import { checkRateLimit } from "@/lib/rate-limit";
import { tooManyRequests } from "@/lib/security-response";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 3_500_000;

const allowedMimes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
]);

const allowedCategories = new Set([
  "identity",
  "income",
  "property",
  "business",
  "signature",
]);

const extensions: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export async function POST(request: NextRequest) {
  const userId = await currentUserId();

  if (!userId) {
    return NextResponse.json(
      { error: "Sign in required" },
      { status: 401 }
    );
  }

  try {
    const limit = await checkRateLimit({
      scope: "documents:upload",
      identity: userId,
      limit: 40,
      windowSeconds: 60 * 60,
    });

    if (!limit.allowed) {
      return tooManyRequests(limit.retryAfter);
    }

    const form = await request.formData();
    const applicationId = form.get("applicationId");
    const category = form.get("category");
    const file = form.get("file");

    if (
      typeof applicationId !== "string" ||
      typeof category !== "string" ||
      !allowedCategories.has(category) ||
      !(file instanceof File)
    ) {
      return NextResponse.json(
        { error: "Invalid upload" },
        { status: 400 }
      );
    }

    if (
      !allowedMimes.has(file.type) ||
      file.size === 0 ||
      file.size > MAX_UPLOAD_BYTES
    ) {
      return NextResponse.json(
        { error: "Only JPG, PNG, WebP or PDF up to 3.5MB" },
        { status: 400 }
      );
    }

    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        userId,
        status: "DRAFT",
      },
      select: { id: true },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application unavailable" },
        { status: 404 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    const hasMatchingSignature =
      (file.type === "application/pdf" &&
        bytes.subarray(0, 5).toString() === "%PDF-") ||
      (file.type === "image/jpeg" &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8) ||
      (file.type === "image/png" &&
        bytes.subarray(0, 8).toString("hex") ===
          "89504e470d0a1a0a") ||
      (file.type === "image/webp" &&
        bytes.subarray(0, 4).toString() === "RIFF" &&
        bytes.subarray(8, 12).toString() === "WEBP");

    if (!hasMatchingSignature) {
      return NextResponse.json(
        { error: "Content does not match file type" },
        { status: 400 }
      );
    }

    const id = randomUUID();
    const extension = extensions[file.type];
    const pathname = `loan-documents/${applicationId}/${id}.${extension}`;

    const blob = await put(pathname, file, {
      access: "private",
      contentType: file.type,
      addRandomSuffix: true,
    });

    try {
      await prisma.document.create({
        data: {
          id,
          applicationId,
          category,
          fileName: file.name.slice(0, 120),
          mime: file.type,
          bytes: bytes.length,
          blobPath: blob.pathname,
          diskPath: "",
        },
      });
    } catch (error) {
      // Avoid leaving a Blob behind if the DB write fails.
      try {
        await del(blob.url);
      } catch (cleanupError) {
        console.error("Blob cleanup failed", cleanupError);
      }

      throw error;
    }

    return NextResponse.json({
      id,
      name: file.name,
      mime: file.type,
    });
  } catch (error) {
    console.error("Document upload failed", error);

    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
