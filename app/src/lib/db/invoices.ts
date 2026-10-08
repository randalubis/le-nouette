import "server-only";

import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "./client";
import { auditEvents, invoiceCounters, invoices } from "./schema";
import type { PaymentMethod } from "@/lib/domain/operations";
import { computeTotals, nextInvoiceNumber, type InvoiceCompany, type InvoiceDraft } from "@/lib/domain/invoice";

export type InvoiceRow = typeof invoices.$inferSelect;

export type NewInvoice = InvoiceDraft & { orderId: string | null; issuedAt: string; dueDate: string; company: InvoiceCompany };

// Own transaction with its own advisory lock (key 2; domain commands use key 1), so numbering never
// blocks or is blocked by order commands. Totals are recomputed here, never trusted from the client.
// Numbers come from invoice_counters (highest ever issued per year), so deleting an invoice never re-issues its number.
export async function createInvoice(input: NewInvoice): Promise<InvoiceRow> {
  const year = Number(input.issuedAt.slice(0, 4));
  const t = computeTotals(input);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(2)`);
    const [counter] = await tx.insert(invoiceCounters).values({ year, lastSeq: 1 })
      .onConflictDoUpdate({ target: invoiceCounters.year, set: { lastSeq: sql`${invoiceCounters.lastSeq} + 1` } }).returning();
    const [row] = await tx.insert(invoices).values({
      number: nextInvoiceNumber(year, counter.lastSeq - 1), orderId: input.orderId, issuedAt: input.issuedAt, dueDate: input.dueDate,
      buyerName: input.buyerName, buyerPhone: input.buyerPhone, buyerAddress: input.buyerAddress,
      lines: input.lines, deliveryFee: t.deliveryFee, paid: t.paid, notes: input.notes, company: input.company,
      subtotal: t.subtotal, tax: t.tax, total: t.total,
    }).returning();
    await audit(tx, "INVOICE_CREATED", row.number);
    return row;
  });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
const audit = (tx: Tx, action: string, ref: string) => tx.insert(auditEvents).values({ at: new Date().toISOString(), action, ref });

export type UpdateInvoice = InvoiceDraft & { issuedAt: string; dueDate: string; company?: InvoiceCompany };

// Number, orderId and createdAt are kept. Company snapshot is kept unless `company` is passed (refresh from settings).
// The `paid_at is null` guard makes the lock race-free; null = missing or paid.
export async function updateInvoice(id: number, input: UpdateInvoice): Promise<InvoiceRow | null> {
  const t = computeTotals(input);
  return db.transaction(async (tx) => {
    const [row] = await tx.update(invoices).set({
      issuedAt: input.issuedAt, dueDate: input.dueDate, buyerName: input.buyerName, buyerPhone: input.buyerPhone, buyerAddress: input.buyerAddress,
      lines: input.lines, deliveryFee: t.deliveryFee, paid: t.paid, notes: input.notes, subtotal: t.subtotal, tax: t.tax, total: t.total,
      ...(input.company ? { company: input.company } : {}),
    }).where(and(eq(invoices.id, id), isNull(invoices.paidAt))).returning();
    if (row) await audit(tx, "INVOICE_EDITED", row.number);
    return row ?? null;
  });
}

// Unpaid only. Never touches the order. The number stays consumed in invoice_counters.
export async function deleteInvoice(id: number): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [row] = await tx.delete(invoices).where(and(eq(invoices.id, id), isNull(invoices.paidAt))).returning({ number: invoices.number });
    if (row) await audit(tx, "INVOICE_DELETED", row.number);
    return !!row;
  });
}

// mark: sets paidAt/method/orderPaymentId and paid = total. null: clears them and resets paid to 0.
// Guarded on the current state so a double click or stale tab is a no-op (false).
export async function setInvoicePaid(id: number, mark: { method: PaymentMethod; orderPaymentId: string | null } | null): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [row] = mark
      ? await tx.update(invoices).set({ paidAt: new Date().toISOString(), paidMethod: mark.method, orderPaymentId: mark.orderPaymentId, paid: sql`${invoices.total}` })
        .where(and(eq(invoices.id, id), isNull(invoices.paidAt))).returning({ number: invoices.number })
      : await tx.update(invoices).set({ paidAt: null, paidMethod: null, orderPaymentId: null, paid: 0 })
        .where(and(eq(invoices.id, id), isNotNull(invoices.paidAt))).returning({ number: invoices.number });
    if (row) await audit(tx, mark ? `INVOICE_PAID:${mark.method}` : "INVOICE_UNPAID", row.number);
    return !!row;
  });
}

export async function getInvoice(id: number): Promise<InvoiceRow | null> {
  const [row] = await db.select().from(invoices).where(eq(invoices.id, id));
  return row ?? null;
}

// List omits the company snapshot (carries the logo) - select only what the table needs.
export const listInvoices = () =>
  db.select({ id: invoices.id, number: invoices.number, orderId: invoices.orderId, buyerName: invoices.buyerName, issuedAt: invoices.issuedAt, total: invoices.total, paidAt: invoices.paidAt, paidMethod: invoices.paidMethod, orderPaymentId: invoices.orderPaymentId })
    .from(invoices).orderBy(desc(invoices.id));
