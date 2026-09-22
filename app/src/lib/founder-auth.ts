import { createHash, createHmac, timingSafeEqual } from "node:crypto";

function constantTimeEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

// ponytail: single hardcoded founder credential via env vars, HMAC-signed cookie.
// No user table, no Supabase Auth — upgrade to per-founder accounts if V1's two-founder
// access model (docs/product/founder-os.md §8.1) needs individually revocable logins.

export const FOUNDER_SESSION_COOKIE = "founder_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
export const FOUNDER_SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;

function sign(payload: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function checkCredentials(email: string, password: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return false;
  return constantTimeEqual(email, adminEmail) && constantTimeEqual(password, adminPassword);
}

export function createSessionCookieValue(): string {
  const payload = `founder.${Date.now() + SESSION_TTL_MS}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionCookieValue(cookie: string | undefined | null): boolean {
  if (!cookie) return false;
  const lastDot = cookie.lastIndexOf(".");
  if (lastDot === -1) return false;
  const payload = cookie.slice(0, lastDot);
  const signature = cookie.slice(lastDot + 1);
  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return false;
  }
  const provided = Buffer.from(signature);
  const known = Buffer.from(expected);
  if (provided.length !== known.length || !timingSafeEqual(provided, known)) return false;

  const expires = Number(payload.slice("founder.".length));
  return Number.isFinite(expires) && Date.now() < expires;
}
