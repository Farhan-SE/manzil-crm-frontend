import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const session = request.cookies.get("session")?.value;
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/";

  if (!isLogin && !session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isLogin && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
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
    "/inventory/:path*",
    "/customers/:path*",
    "/tasks/:path*",
    "/team/:path*",
    "/settings/:path*",
  ],
};
