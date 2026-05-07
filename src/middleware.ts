import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "le_nouette_admin";
const COOKIE_SEPARATOR = "|";

async function hmacHex(key: string, value: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(value));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function isValidAdminCookie(cookieValue: string): Promise<boolean> {
  const [value, sig] = cookieValue.split(COOKIE_SEPARATOR);
  if (!value || !sig) return false;
  const secret = process.env.ADMIN_SESSION_SECRET;
  const expectedEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (!secret || !expectedEmail) return false;
  if (value !== expectedEmail) return false;
  const expected = await hmacHex(secret, value);
  return timingSafeEqual(sig, expected);
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Forward the pathname so the root layout can pick the right `lang`
  // attribute (id for storefront, en for admin) — there's no other
  // server-side hook to read the URL from a layout. (Plan ticket N-12.)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", path);
  const passthrough = NextResponse.next({ request: { headers: requestHeaders } });

  if (!path.startsWith("/admin")) return passthrough;
  if (path === "/admin/login") return passthrough;

  const cookie = request.cookies.get(COOKIE_NAME);
  const authed = cookie ? await isValidAdminCookie(cookie.value) : false;

  if (!authed) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }
  return passthrough;
}

export const config = {
  matcher: ["/admin/:path*"],
};
