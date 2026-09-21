import { eq } from "drizzle-orm";
import * as schema from "./schema";
import type { Tx } from "./client";
import type { LoadedReservation } from "./load-state";
import type * as op from "@/lib/domain/operations";

export async function diffAndWrite(tx: Tx, prev: op.State, next: op.State): Promise<void> {
  const prevOrders = new Map(prev.orders.map((order) => [order.id, order]));
  for (const order of next.orders) {
    const before = prevOrders.get(order.id);
    if (!before) {
      await tx.insert(schema.orders).values({
        id: order.id, idempotencyKey: order.idempotencyKey, createdAt: order.createdAt,
        customerName: order.customer.name, customerWhatsapp: order.customer.whatsapp,
        fulfillment: order.fulfillment, address: order.address ?? null, note: order.note ?? null,
        total: order.total, promisedReadyDate: order.promisedReadyDate, currentReadyDate: order.currentReadyDate,
        status: order.status, readyAt: order.readyAt ?? null, dispatchedAt: order.dispatchedAt ?? null,
        completedAt: order.completedAt ?? null, cancelledAt: order.cancelledAt ?? null,
      });
      if (order.items.length > 0) {
        await tx.insert(schema.orderItems).values(order.items.map((item) => ({
          orderId: order.id, productId: item.productId, name: item.name,
          unitPrice: item.unitPrice, quantity: item.quantity, recipe: item.recipe,
        })));
      }
    } else if (
      before.status !== order.status ||
      before.currentReadyDate !== order.currentReadyDate ||
      before.readyAt !== order.readyAt ||
      before.dispatchedAt !== order.dispatchedAt ||
      before.completedAt !== order.completedAt ||
      before.cancelledAt !== order.cancelledAt
    ) {
      await tx.update(schema.orders).set({
        status: order.status, currentReadyDate: order.currentReadyDate,
        readyAt: order.readyAt ?? null, dispatchedAt: order.dispatchedAt ?? null,
        completedAt: order.completedAt ?? null, cancelledAt: order.cancelledAt ?? null,
      }).where(eq(schema.orders.id, order.id));
    }
  }

  const prevPaymentById = new Map(prev.orders.flatMap((order) => order.payments.map((payment) => [payment.id, payment] as const)));
  for (const order of next.orders) {
    for (const payment of order.payments) {
      const before = prevPaymentById.get(payment.id);
      if (!before) {
        await tx.insert(schema.payments).values({
          id: payment.id, orderId: order.id, amount: payment.amount,
          method: payment.method, at: payment.at, reversedAt: payment.reversedAt ?? null,
        });
      } else if (before.reversedAt !== payment.reversedAt) {
        await tx.update(schema.payments).set({ reversedAt: payment.reversedAt ?? null }).where(eq(schema.payments.id, payment.id));
      }
    }
  }

  if (next.movements.length > prev.movements.length) {
    const newRows = next.movements.slice(prev.movements.length);
    await tx.insert(schema.movements).values(newRows.map((movement) => ({
      id: movement.id, itemId: movement.itemId, delta: movement.delta,
      reason: movement.reason, at: movement.at, ref: movement.ref ?? null,
    })));
  }

  const prevReservationsByDbId = new Map((prev.reservations as LoadedReservation[]).map((r) => [r.dbId, r]));
  const newReservations = (next.reservations as LoadedReservation[]).filter((r) => r.dbId === undefined);
  if (newReservations.length > 0) {
    await tx.insert(schema.reservations).values(newReservations.map((r) => ({ orderId: r.orderId, itemId: r.itemId, quantity: r.quantity, state: r.state })));
  }
  for (const r of next.reservations as LoadedReservation[]) {
    if (r.dbId === undefined) continue;
    const before = prevReservationsByDbId.get(r.dbId);
    if (before && before.state !== r.state) {
      await tx.update(schema.reservations).set({ state: r.state }).where(eq(schema.reservations.id, r.dbId));
    }
  }

  if (next.audit.length > prev.audit.length) {
    const newRows = next.audit.slice(prev.audit.length);
    await tx.insert(schema.auditEvents).values(newRows.map((event) => ({ at: event.at, action: event.action, ref: event.ref ?? null })));
  }

  const prevCalendarKeys = new Set(Object.keys(prev.calendar));
  for (const [dateKey, status] of Object.entries(next.calendar)) {
    if (prev.calendar[dateKey] !== status) {
      await tx.insert(schema.calendarDates).values({ date: dateKey, status })
        .onConflictDoUpdate({ target: schema.calendarDates.date, set: { status } });
    }
  }
  for (const dateKey of prevCalendarKeys) {
    if (!(dateKey in next.calendar)) await tx.delete(schema.calendarDates).where(eq(schema.calendarDates.date, dateKey));
  }

  if (prev.storeStatus !== next.storeStatus) {
    await tx.update(schema.storeStatus).set({ status: next.storeStatus }).where(eq(schema.storeStatus.id, 1));
  }
}
