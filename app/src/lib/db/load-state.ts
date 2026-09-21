import * as schema from "./schema";
import type { Db, Tx } from "./client";
import type * as op from "@/lib/domain/operations";

// `reservations` has no id in the domain type; we attach the DB row id at runtime as `dbId` so
// diffAndWrite (Task 5) can update the right row without positional matching. operations.ts only
// ever spreads reservation objects (`{ ...r, state: ... }`), so this extra field survives every
// mutation untouched even though it isn't part of the declared `Reservation` type.
export type LoadedReservation = op.Reservation & { dbId: number };

export async function loadState(executor: Db | Tx): Promise<op.State> {
  const [orderRows, itemRows, paymentRows, movementRows, reservationRows, calendarRows, storeRow, auditRows] = await Promise.all([
    executor.select().from(schema.orders).orderBy(schema.orders.createdAt),
    executor.select().from(schema.orderItems).orderBy(schema.orderItems.id),
    executor.select().from(schema.payments).orderBy(schema.payments.at),
    executor.select().from(schema.movements).orderBy(schema.movements.at),
    executor.select().from(schema.reservations).orderBy(schema.reservations.id),
    executor.select().from(schema.calendarDates),
    executor.select().from(schema.storeStatus),
    executor.select().from(schema.auditEvents).orderBy(schema.auditEvents.at),
  ]);

  const itemsByOrder = new Map<string, op.OrderItem[]>();
  for (const row of itemRows) {
    const list = itemsByOrder.get(row.orderId) ?? [];
    list.push({ productId: row.productId as op.OrderItem["productId"], name: row.name, unitPrice: row.unitPrice, quantity: row.quantity, recipe: row.recipe as op.OrderItem["recipe"] });
    itemsByOrder.set(row.orderId, list);
  }

  const paymentsByOrder = new Map<string, op.Payment[]>();
  for (const row of paymentRows) {
    const list = paymentsByOrder.get(row.orderId) ?? [];
    list.push({ id: row.id, amount: row.amount, method: row.method as op.Payment["method"], at: row.at, reversedAt: row.reversedAt ?? undefined });
    paymentsByOrder.set(row.orderId, list);
  }

  const orders: op.Order[] = orderRows.map((row) => ({
    id: row.id,
    idempotencyKey: row.idempotencyKey,
    createdAt: row.createdAt,
    customer: { name: row.customerName, whatsapp: row.customerWhatsapp },
    fulfillment: row.fulfillment as op.Order["fulfillment"],
    address: row.address ?? undefined,
    note: row.note ?? undefined,
    items: itemsByOrder.get(row.id) ?? [],
    total: row.total,
    promisedReadyDate: row.promisedReadyDate,
    currentReadyDate: row.currentReadyDate,
    status: row.status as op.Order["status"],
    readyAt: row.readyAt ?? undefined,
    dispatchedAt: row.dispatchedAt ?? undefined,
    completedAt: row.completedAt ?? undefined,
    cancelledAt: row.cancelledAt ?? undefined,
    payments: paymentsByOrder.get(row.id) ?? [],
  }));

  const calendar: op.State["calendar"] = {};
  for (const row of calendarRows) calendar[row.date] = row.status as op.State["calendar"][string];

  const reservations: LoadedReservation[] = reservationRows.map((row) => ({
    orderId: row.orderId,
    itemId: row.itemId as op.Reservation["itemId"],
    quantity: row.quantity,
    state: row.state as op.Reservation["state"],
    dbId: row.id,
  }));

  return {
    version: 1,
    seq: orders.length,
    orders,
    movements: movementRows.map((row) => ({ id: row.id, itemId: row.itemId as op.Movement["itemId"], delta: row.delta, reason: row.reason as op.Movement["reason"], at: row.at, ref: row.ref ?? undefined })),
    reservations,
    calendar,
    storeStatus: (storeRow[0]?.status as op.State["storeStatus"]) ?? "OPEN",
    audit: auditRows.map((row) => ({ at: row.at, action: row.action, ref: row.ref ?? undefined })),
  };
}
