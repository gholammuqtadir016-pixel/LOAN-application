import { auth } from "@/auth";
import { db } from "@/lib/db";

// Always resolve the authenticated identity on the server.
export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await db().client.orm.public.User.select("id").first({ id });
  return user?.id ?? null;
}
