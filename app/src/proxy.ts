import { NextRequest, NextResponse } from "next/server";
import { FOUNDER_SESSION_COOKIE, verifySessionCookieValue } from "@/lib/founder-auth";

// "proxy" (the Next.js middleware convention) always runs on the Node.js runtime,
// so node:crypto (HMAC) here is safe.
export function proxy(request: NextRequest) {
  const cookie = request.cookies.get(FOUNDER_SESSION_COOKIE)?.value;
  if (verifySessionCookieValue(cookie)) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/founder/:path*"],
};
