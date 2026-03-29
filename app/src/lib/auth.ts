import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { loginSchema } from "@/lib/validations";
import { authConfig } from "@/auth.config";

// Import db only in the function scope to avoid Edge Runtime issues
async function authorizeUser(credentials: unknown) {
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const { username, password } = parsed.data;

  // Dynamic import to avoid Edge Runtime issues
  const { db } = await import("@/lib/db");
  const user = await db.user.findUnique({ where: { username } });

  if (!user || !user.isActive) return null;

  const passwordMatch = await compare(password, user.password);
  if (!passwordMatch) return null;

  return {
    id: user.id,
    name: user.displayName,
    email: user.username,
    role: user.role,
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        return authorizeUser(credentials);
      },
    }),
  ],
});
