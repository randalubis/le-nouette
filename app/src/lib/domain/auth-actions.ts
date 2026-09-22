"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  checkCredentials,
  createSessionCookieValue,
  FOUNDER_SESSION_COOKIE,
  FOUNDER_SESSION_MAX_AGE_SECONDS,
} from "@/lib/founder-auth";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!checkCredentials(email, password)) {
    redirect("/login?error=1");
  }

  (await cookies()).set(FOUNDER_SESSION_COOKIE, createSessionCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: FOUNDER_SESSION_MAX_AGE_SECONDS,
  });

  redirect("/founder");
}

export async function logoutAction() {
  (await cookies()).delete(FOUNDER_SESSION_COOKIE);
  redirect("/login");
}
