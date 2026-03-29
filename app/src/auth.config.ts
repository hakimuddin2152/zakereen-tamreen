import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname === "/login";

      if (isLoginPage) {
        if (isLoggedIn) return NextResponse.redirect(new URL("/dashboard", nextUrl));
        return true;
      }

      if (!isLoggedIn) {
        return NextResponse.redirect(new URL("/login", nextUrl));
      }

      // Admin-only paths
      const isAdminPath = nextUrl.pathname.startsWith("/admin") ||
        nextUrl.pathname.startsWith("/reciters") && nextUrl.pathname !== `/reciters/${auth?.user?.id}`;

      if (isAdminPath && (auth?.user as { role?: string })?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
  },
};
