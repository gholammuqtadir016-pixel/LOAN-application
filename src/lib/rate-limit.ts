import { createHmac } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * Database-backed fixed-window limiter. Atomic PostgreSQL upsert protects
 * against concurrent requests to this application's database.
 * No raw user identifiers or IP addresses are stored in RateLimit.key.
 */
export async function checkRateLimit(options: {
  scope: string;
  identity: string;
  limit: number;
  windowSeconds: number;
}): Promise<{ allowed: boolean; retryAfter: number }> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET must be configured");

  const key = createHmac("sha256", secret)
    .update(`${options.scope}:${options.identity}`)
    .digest("hex");

  const now = new Date();
  const cutoff = new Date(now.getTime() - options.windowSeconds * 1000);

  // Unique key + ON CONFLICT makes increment atomic across app processes.
  const rows = await prisma.$queryRaw<
    Array<{ count: number; windowStart: Date }>
  >`
    INSERT INTO "RateLimit" ("key", "windowStart", "count")
    VALUES (${key}, ${now}, 1)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimit"."windowStart" <= ${cutoff} THEN 1
        ELSE "RateLimit"."count" + 1
      END,
      "windowStart" = CASE
        WHEN "RateLimit"."windowStart" <= ${cutoff} THEN ${now}
        ELSE "RateLimit"."windowStart"
      END
    RETURNING "count", "windowStart";
  `;

  const record = rows[0];
  const expiresAt = record.windowStart.getTime() + options.windowSeconds * 1000;
  return {
    allowed: record.count <= options.limit,
    retryAfter: Math.max(1, Math.ceil((expiresAt - now.getTime()) / 1000)),
  };
}

/** Only trust an IP forwarded by infrastructure YOU operate/configure. */
export function trustedIp(request: Request): string | null {
  const headerName = process.env.TRUSTED_CLIENT_IP_HEADER;
  if (!headerName) return null;
  const value = request.headers.get(headerName)?.trim();
  // Must be overwritten by your trusted reverse proxy, not provided by clients.
  return value && value.length <= 64 && !value.includes(",") ? value : null;
}
