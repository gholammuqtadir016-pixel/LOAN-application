
import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { readFile } from "node:fs/promises";

import { prisma } from "@/lib/db";
import { currentUserId } from "@/lib/current-user";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await currentUserId();

  if (!userId) {
    return NextResponse.json(
      { error: "Sign in required" },
      { status: 401 }
    );
  }

  const { id } = await params;

  const document = await prisma.document.findFirst({
    where: {
      id,
      application: { userId },
    },
  });

  if (!document) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 }
    );
  }

  const headers = {
    "Content-Type": document.mime,
    "Content-Disposition": 'attachment; filename="document"',
    "Content-Security-Policy": "sandbox",
    "X-Frame-Options": "DENY",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };

  try {
    if (document.blobPath) {
      const result = await get(document.blobPath, {
        access: "private",
      });

      if (!result || result.statusCode !== 200) {
        return NextResponse.json(
          { error: "File unavailable" },
          { status: 404 }
        );
      }

      return new Response(result.stream, {
        headers,
      });
    }

    // Legacy local files are never served in production.
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Legacy file unavailable" },
        { status: 404 }
      );
    }

    if (!document.diskPath) {
      return NextResponse.json(
        { error: "File unavailable" },
        { status: 404 }
      );
    }

    const bytes = await readFile(document.diskPath);

    return new Response(new Uint8Array(bytes), {
      headers,
    });
  } catch (error) {
    console.error("Document download failed", error);

    return NextResponse.json(
      { error: "File unavailable" },
      { status: 404 }
    );
  }
}
