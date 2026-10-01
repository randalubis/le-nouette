import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "./client";
import * as schema from "./schema";
import { toCustomerView, type CustomerOrderView, type Order, type OrderItem } from "@/lib/domain/operations";

export const TRACK_CAP = 20;

// Direct read-only lookup (not loadState): returns only orders whose id AND secret token both match,
// projected through toCustomerView. Unmatched pairs are simply absent (uniform "not found").
export async function trackOrders(pairs: { id: string; token: string }[]): Promise<CustomerOrderView[]> {
  const valid = pairs.filter((p) => p && typeof p.id === "string" && typeof p.token === "string").slice(0, TRACK_CAP);
  if (valid.length === 0) return [];
  const rows = await db.select().from(schema.orders).where(or(...valid.map((p) => and(eq(schema.orders.id, p.id), eq(schema.orders.publicToken, p.token))))!);
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [itemRows, paymentRows] = await Promise.all([
    db.select().from(schema.orderItems).where(inArray(schema.orderItems.orderId, ids)).orderBy(schema.orderItems.id),
    db.select().from(schema.payments).where(inArray(schema.payments.orderId, ids)),
  ]);
  return rows.map((row) => toCustomerView({
    id: row.id, idempotencyKey: "", publicToken: "", createdAt: row.createdAt,
    customer: { name: "", whatsapp: "" }, fulfillment: row.fulfillment as Order["fulfillment"],
    items: itemRows.filter((i) => i.orderId === row.id).map((i): OrderItem => ({ productId: i.productId as OrderItem["productId"], name: i.name, unitPrice: i.unitPrice, quantity: i.quantity, recipe: i.recipe as OrderItem["recipe"] })),
    total: row.total, promisedReadyDate: row.promisedReadyDate, currentReadyDate: row.currentReadyDate, status: row.status as Order["status"],
    readyAt: row.readyAt ?? undefined, dispatchedAt: row.dispatchedAt ?? undefined, completedAt: row.completedAt ?? undefined, cancelledAt: row.cancelledAt ?? undefined,
    payments: paymentRows.filter((p) => p.orderId === row.id).map((p) => ({ id: p.id, amount: p.amount, method: p.method as Order["payments"][number]["method"], at: p.at, reversedAt: p.reversedAt ?? undefined })),
  }));
}
