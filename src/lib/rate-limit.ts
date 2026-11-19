import { createHmac } from "node:crypto";
import { db, input } from "@/lib/db";

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
  const { authSecret } = input();
  const secret = authSecret.expose();

  const key = createHmac("sha256", secret)
    .update(`${options.scope}:${options.identity}`)
    .digest("hex");

  const now = new Date();
  const cutoff = new Date(now.getTime() - options.windowSeconds * 1000);

  // Unique key + ON CONFLICT makes increment atomic across app processes.
  const rows = await db().client.query(
    db().client.raw.sql`
      INSERT INTO "RateLimit" ("key", "windowStart", "count")
      VALUES (${key}, ${now.toISOString()}::timestamp, 1)
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimit"."windowStart" <= ${cutoff.toISOString()}::timestamp THEN 1
          ELSE "RateLimit"."count" + 1
        END,
        "windowStart" = CASE
          WHEN "RateLimit"."windowStart" <= ${cutoff.toISOString()}::timestamp THEN ${now.toISOString()}::timestamp
          ELSE "RateLimit"."windowStart"
        END
      RETURNING "count", "windowStart";
    `.returnsRow({
      count: "pg/int4@1",
      windowStart: "pg/timestamp-date@1",
    }).build(),
  );

  const record = rows[0];
  const expiresAt = record.windowStart.getTime() + options.windowSeconds * 1000;
  return {
    allowed: record.count <= options.limit,
    retryAfter: Math.max(1, Math.ceil((expiresAt - now.getTime()) / 1000)),
  };
}

/** Only trust an IP forwarded by infrastructure YOU operate/configure. */
export function trustedIp(request: Request): string | null {
  const headerName = input().trustedClientIpHeader.expose();
  if (!headerName) return null;
  const value = request.headers.get(headerName)?.trim();
  // Must be overwritten by your trusted reverse proxy, not provided by clients.
  return value && value.length <= 64 && !value.includes(",") ? value : null;
}
