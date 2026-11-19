import {
  randomBytes,
  createHash,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { cookies } from "next/headers";
import { input } from "@/lib/db";
const COOKIE = "loan_session";
function key() {
  const raw = input().dataEncryptionKey.expose();
  if (!/^[a-f0-9]{64}$/i.test(raw))
    throw new Error("DATA_ENCRYPTION_KEY must be 64 hex characters");
  return Buffer.from(raw, "hex");
}
export async function session(create = false) {
  const jar = await cookies();
  let token = jar.get(COOKIE)?.value;
  if (!token && create) {
    token = randomBytes(32).toString("hex");
    jar.set(COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return token ? createHash("sha256").update(token).digest("hex") : null;
}
export function encrypt(payload: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  return {
    encrypted: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}
export function decrypt<T>(row: {
  encrypted: string;
  iv: string;
  tag: string;
}): T {
  const dec = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(row.iv, "base64"),
  );
  dec.setAuthTag(Buffer.from(row.tag, "base64"));
  return JSON.parse(
    Buffer.concat([
      dec.update(Buffer.from(row.encrypted, "base64")),
      dec.final(),
    ]).toString("utf8"),
  ) as T;
}
