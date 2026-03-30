import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";
import { isCoordinator } from "@/lib/permissions";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string; partyId?: string | null }).role;
        token.partyId = (user as { role: string; partyId?: string | null }).partyId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.partyId = (token.partyId as string | null) ?? null;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname === "/login";

      if (isLoginPage) {
        if (isLoggedIn) return NextResponse.redirect(new URL("/kalaams", nextUrl));
        return true;
      }

      if (!isLoggedIn) {
        return NextResponse.redirect(new URL("/login", nextUrl));
      }

      const role = (auth?.user as { role?: string })?.role;

      // Admin-only paths
      const isAdminPath =
        nextUrl.pathname.startsWith("/admin") ||
        nextUrl.pathname === "/reciters";

      if (isAdminPath && !isCoordinator(role)) {
        return NextResponse.redirect(new URL("/kalaams", nextUrl));
      }

      // God-only paths
      if (nextUrl.pathname.startsWith("/admin/users") && role !== "GOD") {
        return NextResponse.redirect(new URL("/kalaams", nextUrl));
      }

      return true;
    },
  },
};
