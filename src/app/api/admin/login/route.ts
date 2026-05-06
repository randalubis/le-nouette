import { NextResponse, type NextRequest } from "next/server";
import { verifyCredentials, createAdminSession } from "@/lib/auth";

// Per-IP login throttle. In-memory; per-instance only, but raises the bar for
// trivial password brute-forcing without adding infra. A determined attacker
// across many Vercel regions/IPs is still bounded by the constant-time delay
// below + admin-password entropy.
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;
const FAILED_DELAY_MS = 600;
const attempts = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function recordFailure(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count += 1;
}

function isLockedOut(key: string): boolean {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (entry.resetAt < Date.now()) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

export async function POST(request: NextRequest) {
  const key = clientKey(request);
  if (isLockedOut(key)) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again later." },
      { status: 429 },
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const email = String(body.email ?? "");
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Email and password are required." },
      { status: 400 },
    );
  }

  const ok = await verifyCredentials(email, password);
  if (!ok) {
    recordFailure(key);
    await new Promise((r) => setTimeout(r, FAILED_DELAY_MS));
    return NextResponse.json(
      { ok: false, error: "Invalid email or password." },
      { status: 401 },
    );
  }

  attempts.delete(key);
  await createAdminSession();
  return NextResponse.json({ ok: true });
}
