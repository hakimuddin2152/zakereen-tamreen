import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type AuthRequest = NextRequest & {
  auth: { user?: { role?: string; id?: string } } | null;
};

export default auth((req: AuthRequest) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth?.user;
  const isLoginPage = nextUrl.pathname === "/login";
  const isRoot = nextUrl.pathname === "/";

  if (isRoot) {
    return NextResponse.redirect(
      new URL(isLoggedIn ? "/dashboard" : "/login", nextUrl)
    );
  }

  if (isLoginPage) {
    if (isLoggedIn) return NextResponse.redirect(new URL("/dashboard", nextUrl));
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  const isAdminPath =
    nextUrl.pathname.startsWith("/admin") ||
    nextUrl.pathname === "/reciters";

  if (isAdminPath && req.auth?.user?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
