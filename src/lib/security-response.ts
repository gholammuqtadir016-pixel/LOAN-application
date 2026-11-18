import { NextResponse } from "next/server";

export function privateJson(body: unknown, status = 200, extra?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", ...extra },
  });
}

export function tooManyRequests(retryAfter: number) {
  return privateJson({ error: "Too many requests. Try again later." }, 429, {
    "Retry-After": String(retryAfter),
  });
}
