import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const isLoginPage = req.nextUrl.pathname === "/admin/login";
  // Behind a reverse proxy (e.g. Render), internal requests are HTTP but the
  // external URL is HTTPS. Tell getToken to look for the __Secure- prefixed
  // cookie that NextAuth sets when it detects HTTPS via x-forwarded-proto.
  const secureCookie =
    req.headers.get("x-forwarded-proto") === "https" ||
    req.nextUrl.protocol === "https:";
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, secureCookie });
  const isAuthenticated = !!token;

  if (!isLoginPage && !isAuthenticated) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  if (isLoginPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
