"use client";

// Device-local convenience record (spec §6.1, tech spec §13.4): name and WhatsApp number only.
// Never address, note, cart, order number, or payment data. Not an account, never synced.

const KEY = "le-nouette:customer";

export type Remembered = { name: string; whatsapp: string };

export function readRemembered(): Remembered | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return saved && typeof saved.name === "string" && typeof saved.whatsapp === "string" ? { name: saved.name, whatsapp: saved.whatsapp } : null;
  } catch {
    return null;
  }
}

export function saveRemembered(value: Remembered | null) {
  try {
    if (value) localStorage.setItem(KEY, JSON.stringify(value)); else localStorage.removeItem(KEY);
  } catch {}
}
