import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

type AuthRequest = NextRequest & {
  auth: { user?: { role?: string; id?: string } } | null;
};

function isPrivileged(role?: string) {
  return role === "ADMIN" || role === "GOD";
}

export default auth((req: AuthRequest) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth?.user;
  const role = req.auth?.user?.role;
  const isLoginPage = nextUrl.pathname === "/login";
  const isRoot = nextUrl.pathname === "/";

  // Redirect old dashboard/admin entry points
  if (nextUrl.pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/kalaams", nextUrl));
  }
  if (nextUrl.pathname === "/reciters") {
    return NextResponse.redirect(new URL("/admin/members", nextUrl));
  }
  if (nextUrl.pathname === "/admin" || nextUrl.pathname === "/admin/") {
    return NextResponse.redirect(new URL("/admin/members", nextUrl));
  }

  if (isRoot) {
    return NextResponse.redirect(
      new URL(isLoggedIn ? "/kalaams" : "/login", nextUrl)
    );
  }

  if (isLoginPage) {
    if (isLoggedIn) return NextResponse.redirect(new URL("/kalaams", nextUrl));
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  const isAdminPath =
    nextUrl.pathname.startsWith("/admin");

  if (isAdminPath && !isPrivileged(role)) {
    return NextResponse.redirect(new URL("/kalaams", nextUrl));
  }

  if (nextUrl.pathname.startsWith("/admin/users") && role !== "GOD") {
    return NextResponse.redirect(new URL("/kalaams", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
