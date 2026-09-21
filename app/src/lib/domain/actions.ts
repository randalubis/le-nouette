"use server";

import { revalidatePath } from "next/cache";
import { withDomainTransaction } from "@/lib/db/with-domain-transaction";
import type { ItemId } from "@/lib/domain/catalog";
import type { DateStatus } from "@/lib/domain/schedule";
import * as op from "./operations";

// ponytail: revalidatePath throws when called outside a Next.js request scope
// (e.g. the integration test, or any future script-driven call). The mutation
// already committed by this point, so a missing cache invalidation shouldn't
// fail the action — swallow it rather than adding a "are we in Next" check.
const revalidateAll = () => {
  try {
    revalidatePath("/", "layout");
    revalidatePath("/founder", "layout");
  } catch {
    // no-op outside a Next.js request scope
  }
};

export async function createOrderAction(input: op.CreateOrderInput) {
  const { error, state } = await withDomainTransaction((current, now) => op.createOrder(current, input, now));
  if (!error) revalidateAll();
  return { error, order: state?.orders.find((order) => order.idempotencyKey === input.idempotencyKey) ?? null };
}

export async function cancelOrderAction(id: string) {
  const { error } = await withDomainTransaction((state, now) => op.cancelOrder(state, id, now));
  if (!error) revalidateAll();
  return { error };
}

export async function rescheduleOrderAction(id: string, date: string) {
  const { error } = await withDomainTransaction((state, now) => op.rescheduleOrder(state, id, date, now));
  if (!error) revalidateAll();
  return { error };
}

export async function completeBatchAction(readyDate: string) {
  const { error } = await withDomainTransaction((state, now) => op.completeBatch(state, readyDate, now));
  if (!error) revalidateAll();
  return { error };
}

export async function dispatchOrderAction(id: string) {
  const { error } = await withDomainTransaction((state, now) => op.dispatchOrder(state, id, now));
  if (!error) revalidateAll();
  return { error };
}

export async function completeOrderAction(id: string) {
  const { error } = await withDomainTransaction((state, now) => op.completeOrder(state, id, now));
  if (!error) revalidateAll();
  return { error };
}

export async function recordPaymentAction(id: string, method: op.PaymentMethod) {
  const { error } = await withDomainTransaction((state, now) => op.recordPayment(state, id, method, now));
  if (!error) revalidateAll();
  return { error };
}

export async function reversePaymentAction(id: string, paymentId: string) {
  const { error } = await withDomainTransaction((state, now) => op.reversePayment(state, id, paymentId, now));
  if (!error) revalidateAll();
  return { error };
}

export async function receiveStockAction(itemId: ItemId, quantity: number) {
  const { error } = await withDomainTransaction((state, now) => op.receiveStock(state, itemId, quantity, now));
  if (!error) revalidateAll();
  return { error };
}

export async function stockOpnameAction(itemId: ItemId, counted: number) {
  const { error } = await withDomainTransaction((state, now) => op.stockOpname(state, itemId, counted, now));
  if (!error) revalidateAll();
  return { error };
}

export async function setDateStatusAction(date: string, status: DateStatus | null) {
  const { error } = await withDomainTransaction((state, now) => op.setDateStatus(state, date, status, now));
  if (!error) revalidateAll();
  return { error };
}

export async function setStoreStatusAction(status: op.State["storeStatus"]) {
  const { error } = await withDomainTransaction((state, now) => op.setStoreStatus(state, status, now));
  if (!error) revalidateAll();
  return { error };
}
