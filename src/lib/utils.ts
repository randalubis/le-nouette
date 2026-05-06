import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function parseIDR(input: string): number {
  const digits = input.replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

export function formatIDRInput(value: number | string): string {
  const num = typeof value === "string" ? parseIDR(value) : value;
  if (!num) return "";
  return new Intl.NumberFormat("id-ID").format(num);
}

/**
 * Normalize an Indonesian phone number to international E.164 form
 * without the leading `+`. Accepts inputs like:
 *   +628123456789  ->  628123456789
 *   628123456789   ->  628123456789
 *   08123456789    ->  628123456789  (replace local 0 with 62)
 *   8123456789     ->  628123456789  (assume Indonesian)
 *   "" / non-digits-only -> ""
 */
export function normalizeWhatsApp(input: string): string {
  if (!input) return "";
  const digits = input.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return "62" + digits;
}

export function formatWhatsAppLink(phone: string, message: string): string {
  const clean = normalizeWhatsApp(phone);
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export function generateShortCode(seq: number): string {
  return `LN-${String(seq).padStart(4, "0")}`;
}
