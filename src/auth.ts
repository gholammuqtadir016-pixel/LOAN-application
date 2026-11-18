import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit, trustedIp } from "@/lib/rate-limit";

const credentialsSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(input, request) {
        const parsed = credentialsSchema.safeParse(input);
        if (!parsed.success) return null;

        const emailLimit = await checkRateLimit({
          scope: "login:email",
          identity: parsed.data.email,
          limit: 12,
          windowSeconds: 15 * 60,
        });
        if (!emailLimit.allowed) return null;

        const ip = trustedIp(request);
        if (ip) {
          const ipLimit = await checkRateLimit({
            scope: "login:ip",
            identity: ip,
            limit: 60,
            windowSeconds: 15 * 60,
          });
          if (!ipLimit.allowed) return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user) return null;
        if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
          return null;
        }
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // New login: record the account's current session generation.
      if (user?.id) {
        const row = await prisma.user.findUnique({
          where: { id: user.id },
          select: { sessionVersion: true },
        });
        token.userId = row ? user.id : undefined;
        token.sessionVersion = row?.sessionVersion;
        return token;
      }

      // Existing JWT: invalidate when account password is reset.
      if (typeof token.userId !== "string") return token;
      const row = await prisma.user.findUnique({
        where: { id: token.userId },
        select: { sessionVersion: true },
      });
      if (!row || token.sessionVersion !== row.sessionVersion) {
        delete token.userId;
        delete token.sessionVersion;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        // This must be absent for revoked sessions. Server routes require an id.
        session.user.id = typeof token.userId === "string" ? token.userId : "";
      }
      return session;
    },
  },
});
