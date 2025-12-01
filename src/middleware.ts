import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Get the pathname
  const { pathname } = request.nextUrl;

  // Allow public routes
  const publicRoutes = ["/login", "/signup"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
  const isAuthApi = pathname.startsWith("/api/auth");
  const isStaticFile = pathname.startsWith("/_next") || pathname.startsWith("/favicon");

  if (isPublicRoute || isAuthApi || isStaticFile) {
    return NextResponse.next();
  }

  // Check for session cookie (cover NextAuth v4 + Auth.js v5 names)
  const sessionCookiePrefixes = [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "authjs.session-token",
    "__Secure-authjs.session-token",
  ];

  const sessionToken = request.cookies
    .getAll()
    .find((cookie) =>
      sessionCookiePrefixes.some((prefix) => cookie.name.startsWith(prefix)),
    );

  if (!sessionToken) {
    // Redirect to login if no session
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
