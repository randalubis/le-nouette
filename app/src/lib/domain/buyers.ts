import { toWaNumber } from "./whatsapp.ts";

/** Directory key for a buyer: the normalised 62… number, or null when the phone is empty or invalid. */
export const buyerKey = (phone: string): string | null => toWaNumber(phone);

/** Key back to the local form the owner types (6281… becomes 081…). */
export const buyerDisplayPhone = (key: string): string => `0${key.slice(2)}`;

/** LIKE prefix pattern for name search, or null under 2 characters. Escapes \, % and _ so they match literally. */
export function searchPattern(query: string): string | null {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return null;
  return `${q.replace(/[\\%_]/g, "\\$&")}%`;
}
