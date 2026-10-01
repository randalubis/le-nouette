"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { withDomainTransaction } from "@/lib/db/with-domain-transaction";
import type { ItemId, ProductId } from "@/lib/domain/catalog";
import type { DateStatus } from "@/lib/domain/schedule";
import { requireFounder } from "@/lib/founder-session";
import * as op from "./operations";

// Best-effort cache invalidation: the domain mutation has already committed by the
// time this runs, so a failed revalidation must never fail the action.
//
// ponytail: revalidatePath throws "static generation store missing" when called
// outside a Next.js request scope (e.g. the integration test, or any future
// script-driven call). That specific case is expected and swallowed; anything
// else re-throws, since a real regression here should stay visible rather than
// go silently stale in production.
const revalidateAll = () => {
  try {
    // "/" stays page-scoped (not "layout"): the storefront is a client component
    // that holds its own step state (shop/details/success). A "layout" revalidation
    // forces a full remount of everything below the layout when the RSC payload
    // lands, which wiped out setStep("success") right after order creation.
    revalidatePath("/");
    revalidatePath("/founder", "layout");
  } catch (e) {
    if (e instanceof Error && e.message.includes("static generation store missing")) return;
    throw e;
  }
};

// Token is generated here (not in the domain) and never taken from the client; the browser stores it
// from this response. Returns customer-safe fields only (no whatsapp/address/note/payments).
export async function createOrderAction(input: Omit<op.CreateOrderInput, "publicToken">) {
  const publicToken = randomBytes(16).toString("hex");
  const { error, state } = await withDomainTransaction((current, now) => op.createOrder(current, { ...input, publicToken }, now));
  if (!error) revalidateAll();
  const found = state?.orders.find((order) => order.idempotencyKey === input.idempotencyKey);
  // Duplicate submit returns the existing order, whose stored token differs from the one just generated.
  return { error, order: found ? { ...op.toCustomerView(found), publicToken: found.publicToken } : null };
}

export async function trackOrdersAction(pairs: { id: string; token: string }[]) {
  const { trackOrders } = await import("@/lib/db/track-orders");
  return trackOrders(Array.isArray(pairs) ? pairs : []);
}

export async function cancelOrderAction(id: string) {
  await requireFounder();
  const { error } = await withDomainTransaction((state, now) => op.cancelOrder(state, id, now));
  if (!error) revalidateAll();
  return { error };
}

export async function rescheduleOrderAction(id: string, date: string) {
  await requireFounder();
  const { error } = await withDomainTransaction((state, now) => op.rescheduleOrder(state, id, date, now));
  if (!error) revalidateAll();
  return { error };
}

export async function completeBatchAction(readyDate: string) {
  await requireFounder();
  const { error } = await withDomainTransaction((state, now) => op.completeBatch(state, readyDate, now));
  if (!error) revalidateAll();
  return { error };
}

export async function dispatchOrderAction(id: string) {
  await requireFounder();
  const { error } = await withDomainTransaction((state, now) => op.dispatchOrder(state, id, now));
  if (!error) revalidateAll();
  return { error };
}

export async function dispatchOrdersAction(ids: string[]) {
  await requireFounder();
  const { error } = await withDomainTransaction((state, now) => op.dispatchOrders(state, new Set(ids), now));
  if (!error) revalidateAll();
  return { error };
}

export async function completeOrderAction(id: string) {
  await requireFounder();
  const { error } = await withDomainTransaction((state, now) => op.completeOrder(state, id, now));
  if (!error) revalidateAll();
  return { error };
}

export async function recordPaymentAction(id: string, method: op.PaymentMethod) {
  await requireFounder();
  const { error } = await withDomainTransaction((state, now) => op.recordPayment(state, id, method, now));
  if (!error) revalidateAll();
  return { error };
}

export async function reversePaymentAction(id: string, paymentId: string) {
  await requireFounder();
  const { error } = await withDomainTransaction((state, now) => op.reversePayment(state, id, paymentId, now));
  if (!error) revalidateAll();
  return { error };
}

export async function receiveStockAction(itemId: ItemId, quantity: number) {
  await requireFounder();
  const { error } = await withDomainTransaction((state, now) => op.receiveStock(state, itemId, quantity, now));
  if (!error) revalidateAll();
  return { error };
}

export async function stockOpnameAction(itemId: ItemId, counted: number) {
  await requireFounder();
  const { error } = await withDomainTransaction((state, now) => op.stockOpname(state, itemId, counted, now));
  if (!error) revalidateAll();
  return { error };
}

export async function recordExtraPackedAction(productId: ProductId, quantity: number, note?: string) {
  await requireFounder();
  const { error } = await withDomainTransaction((state, now) => op.recordExtraPacked(state, productId, quantity, now, note));
  if (!error) revalidateAll();
  return { error };
}

export async function adjustReadyAction(sourceId: string, quantity: number, note?: string) {
  await requireFounder();
  const { error } = await withDomainTransaction((state, now) => op.adjustReady(state, sourceId, quantity, note, now));
  if (!error) revalidateAll();
  return { error };
}

export async function setDateStatusAction(date: string, status: DateStatus | null) {
  await requireFounder();
  const { error } = await withDomainTransaction((state, now) => op.setDateStatus(state, date, status, now));
  if (!error) revalidateAll();
  return { error };
}

export async function setStoreStatusAction(status: op.State["storeStatus"]) {
  await requireFounder();
  const { error } = await withDomainTransaction((state, now) => op.setStoreStatus(state, status, now));
  if (!error) revalidateAll();
  return { error };
}

export async function resetSeedAction(key?: string) {
  await requireFounder();
  const secret = process.env.RESET_TOOL_SECRET;
  const authorized = process.env.NODE_ENV !== "production" || (!!secret && key === secret);
  if (!authorized) return { error: "Reset tidak diizinkan." };
  const { db } = await import("@/lib/db/client");
  const schema = await import("@/lib/db/schema");
  await db.transaction(async (tx) => {
    await tx.delete(schema.readyProductMovements);
    await tx.delete(schema.reservations);
    await tx.delete(schema.orderItems);
    await tx.delete(schema.payments);
    await tx.delete(schema.orders);
    await tx.delete(schema.movements);
    await tx.delete(schema.auditEvents);
    await tx.delete(schema.calendarDates);
    await tx.update(schema.storeStatus).set({ status: "OPEN" });
  });
  revalidateAll();
  return { error: null };
}
