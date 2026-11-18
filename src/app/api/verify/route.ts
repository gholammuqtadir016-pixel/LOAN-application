import { NextResponse } from "next/server";
export async function POST(req: Request) {
  const { kind, value } = await req.json().catch(() => ({}));
  if (kind === "PAN")
    return NextResponse.json({
      verified:
        typeof value === "string" && /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value),
      simulation: true,
    });
  if (kind === "AADHAAR")
    return NextResponse.json({
      verified: typeof value === "string" && /^\d{4}$/.test(value),
      simulation: true,
    });
  return NextResponse.json(
    { error: "Unsupported verification" },
    { status: 400 },
  );
}
