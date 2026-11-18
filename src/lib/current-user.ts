import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// Always resolve the authenticated identity on the server.
export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  return user?.id ?? null;
}
