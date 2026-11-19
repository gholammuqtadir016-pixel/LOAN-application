import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/current-user";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await currentUserId();
  if (!userId)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { id } = await params;
  const document = await db().client.orm.public.Document.where((d) =>
    d.id.eq(id),
  )
    .where((d) => d.application.some((a) => a.userId.eq(userId)))
    .first();
  if (!document)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const bytes = await readFile(document.diskPath);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": document.mime,
        "Content-Disposition": 'attachment; filename="document"',
        "Content-Security-Policy": "sandbox",
        "X-Frame-Options": "DENY",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "File unavailable" }, { status: 404 });
  }
}
