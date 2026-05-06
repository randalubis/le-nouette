import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";

const COOKIE_NAME = "le_nouette_admin";
const COOKIE_SEPARATOR = "|";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

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

export async function verifyCredentials(email: string, password: string): Promise<boolean> {
  const expectedEmail = env.adminEmail().toLowerCase();
  const expectedPassword = env.adminPassword();
  const submittedEmail = email.trim().toLowerCase();
  if (!expectedEmail || !expectedPassword) return false;
  // Always run both comparisons to avoid leaking which one failed via timing.
  const emailOk = timingSafeEqual(submittedEmail, expectedEmail);
  const passwordOk = timingSafeEqual(password, expectedPassword);
  return emailOk && passwordOk;
}

export async function createAdminSession(): Promise<void> {
  const email = env.adminEmail().toLowerCase();
  const sig = await hmacHex(env.sessionSecret(), email);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${email}${COOKIE_SEPARATOR}${sig}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getAdminEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie) return null;
  const [value, sig] = cookie.value.split(COOKIE_SEPARATOR);
  if (!value || !sig) return null;
  let secret: string;
  try {
    secret = env.sessionSecret();
  } catch {
    return null;
  }
  const expected = await hmacHex(secret, value);
  if (!timingSafeEqual(sig, expected)) return null;
  if (value !== env.adminEmail().toLowerCase()) return null;
  return value;
}

export async function requireAdmin(): Promise<string> {
  const email = await getAdminEmail();
  if (!email) redirect("/admin/login");
  return email;
}

export async function getAdminUser(): Promise<{ email: string } | null> {
  const email = await getAdminEmail();
  return email ? { email } : null;
}

export const adminCookieName = COOKIE_NAME;
