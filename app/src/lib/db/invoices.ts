import "server-only";

import { desc, eq, like, sql } from "drizzle-orm";
import { db } from "./client";
import { invoices } from "./schema";
import { computeTotals, invoicePrefix, invoiceSeq, nextInvoiceNumber, type InvoiceCompany, type InvoiceDraft } from "@/lib/domain/invoice";

export type InvoiceRow = typeof invoices.$inferSelect;

export type NewInvoice = InvoiceDraft & { orderId: string | null; issuedAt: string; dueDate: string; company: InvoiceCompany };

// Own transaction with its own advisory lock (key 2; domain commands use key 1), so numbering never
// blocks or is blocked by order commands. Totals are recomputed here, never trusted from the client.
export async function createInvoice(input: NewInvoice): Promise<InvoiceRow> {
  const year = Number(input.issuedAt.slice(0, 4));
  const t = computeTotals(input);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(2)`);
    const existing = await tx.select({ number: invoices.number }).from(invoices).where(like(invoices.number, `${invoicePrefix(year)}%`));
    const last = existing.reduce((max, r) => Math.max(max, invoiceSeq(r.number)), 0);
    const [row] = await tx.insert(invoices).values({
      number: nextInvoiceNumber(year, last), orderId: input.orderId, issuedAt: input.issuedAt, dueDate: input.dueDate,
      buyerName: input.buyerName, buyerPhone: input.buyerPhone, buyerAddress: input.buyerAddress,
      lines: input.lines, deliveryFee: t.deliveryFee, paid: t.paid, notes: input.notes, company: input.company,
      subtotal: t.subtotal, tax: t.tax, total: t.total,
    }).returning();
    return row;
  });
}

export async function getInvoice(id: number): Promise<InvoiceRow | null> {
  const [row] = await db.select().from(invoices).where(eq(invoices.id, id));
  return row ?? null;
}

// List omits the company snapshot (carries the logo) - select only what the table needs.
export const listInvoices = () =>
  db.select({ id: invoices.id, number: invoices.number, orderId: invoices.orderId, buyerName: invoices.buyerName, issuedAt: invoices.issuedAt, total: invoices.total })
    .from(invoices).orderBy(desc(invoices.id));
