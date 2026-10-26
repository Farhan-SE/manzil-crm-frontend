import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const session = request.cookies.get("session")?.value;
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/";
  // Platform admins run companies, not a company's CRM, so each kind of user has its own home.
  const home = session === "platform" ? "/platform" : "/dashboard";
  const isPlatformPath = pathname === "/platform" || pathname.startsWith("/platform/");

  if (!isLogin && !session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isLogin && session) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  if (session && !isLogin && isPlatformPath !== (session === "platform")) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  return NextResponse.next();
}

// Pages live in the (dashboard) route group, so there's no shared URL prefix — each is listed.
export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/leads/:path*",
    "/today/:path*",
    "/pipeline/:path*",
    "/sales-disputes/:path*",
    "/projects/:path*",
    "/inventory/:path*",
    "/partner-inventory/:path*",
    "/locations/:path*",
    "/customers/:path*",
    "/tasks/:path*",
    "/management/:path*",
    "/reports/:path*",
    "/accounts/:path*",
    "/team/:path*",
    "/teams/:path*",
    "/help/:path*",
    "/settings/:path*",
    "/roles/:path*",
    "/chatbot/:path*",
    "/platform/:path*",
  ],
};
