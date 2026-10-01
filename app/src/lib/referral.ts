"use client";

// Device-local flag: the post-order "who introduced you?" prompt is shown once per device.
const KEY = "le-nouette:referral-asked";

export function wasAsked(): boolean {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

export function markAsked() {
  try { localStorage.setItem(KEY, "1"); } catch {}
}
