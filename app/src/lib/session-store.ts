"use client";

import { useSyncExternalStore } from "react";
import * as op from "@/lib/domain/operations";
import { jakartaNow } from "@/lib/domain/schedule";

// ponytail: sessionStorage stands in for Supabase. Data survives reloads and storefront → Founder OS
// navigation in the same tab, and resets when the tab closes. Swap for server actions + Postgres later.
const KEY = "le-nouette:session:v1";
const listeners = new Set<() => void>();
let state: op.State | null = null;

function seed(now: Date): op.State {
  const hours = (h: number) => new Date(now.getTime() - h * 3_600_000);
  const stock = [["raw_cheese", 211500], ["jar", 34], ["pouch", 118], ["sticker_square", 46], ["sticker_round", 18], ["jar_seal", 42]] as const;
  let s = stock.reduce((acc, [item, qty]) => op.receiveStock(acc, item, qty, hours(24 * 7)), op.emptyState());
  // One past order already packed, handed over, and paid.
  s = op.createOrder(s, { idempotencyKey: "seed-1", name: "Rizky Mahendra", whatsapp: "081234560001", fulfillment: "PICKUP_BI", quantities: { milieu: 1 } }, hours(24 * 6));
  s = op.completeBatch(s, s.orders[0].currentReadyDate, hours(24 * 4));
  s = op.completeOrder(op.recordPayment(s, "LN-0001", "TRANSFER", hours(24 * 4)), "LN-0001", hours(24 * 4));
  // Open orders for the next batch.
  s = op.createOrder(s, { idempotencyKey: "seed-2", name: "Harry Sofri", whatsapp: "081234560002", fulfillment: "PICKUP_MANDIRI", quantities: { milieu: 2, grande: 1 } }, hours(3));
  s = op.createOrder(s, { idempotencyKey: "seed-3", name: "Dina Prameswari", whatsapp: "081234560003", fulfillment: "PICKUP_BI", quantities: { milieu: 1 } }, hours(2));
  s = op.recordPayment(s, "LN-0003", "QRIS", hours(2));
  s = op.createOrder(s, { idempotencyKey: "seed-4", name: "Andi Wirawan", whatsapp: "081234560004", fulfillment: "DELIVERY", address: "Jl. Kemang Raya 10, Jakarta Selatan", quantities: { milieu: 1, grande: 1 } }, hours(1));
  return s;
}

function snapshot(): op.State {
  if (state) return state;
  try { state = JSON.parse(sessionStorage.getItem(KEY) ?? "null"); } catch { state = null; }
  return (state ??= seed(new Date()));
}

function commit(next: op.State | null) {
  state = next;
  try { if (next) sessionStorage.setItem(KEY, JSON.stringify(next)); else sessionStorage.removeItem(KEY); } catch {}
  listeners.forEach((listener) => listener());
}

/** Session state, or null during server render / hydration. */
export const useSession = () =>
  useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    snapshot,
    () => null,
  );

/** Runs a domain command against session state. Returns an error message, or null on success. */
export function run(command: (current: op.State, now: Date) => op.State): string | null {
  try {
    commit(command(snapshot(), new Date()));
    return null;
  } catch (error) {
    if (error instanceof op.DomainError) return error.message;
    throw error;
  }
}

export const resetSession = () => commit(null);

export const today = () => jakartaNow(new Date()).date;
