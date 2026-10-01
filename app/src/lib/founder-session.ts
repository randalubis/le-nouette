import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FOUNDER_SESSION_COOKIE, verifySessionCookieValue } from "@/lib/founder-auth";

// Server actions are public POST endpoints: every founder action must call this first.
export async function requireFounder(): Promise<void> {
  const store = await cookies();
  if (!verifySessionCookieValue(store.get(FOUNDER_SESSION_COOKIE)?.value)) redirect("/login");
}
