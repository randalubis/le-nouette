import assert from "node:assert/strict";
import { test } from "node:test";
import { buildInvoiceFromOrder, computeTotals, formatInvoiceDate, invoiceSeq, nextInvoiceNumber, rupiah } from "./invoice.ts";
import type * as op from "./operations.ts";

const line = (o: Partial<Parameters<typeof computeTotals>[0]["lines"][number]> = {}) => ({ name: "Milieu", description: "", quantity: 2, unitPrice: 50000, discount: 0, taxPercent: 0, ...o });

test("totals: subtotal, discount, tax, fee, paid, due", () => {
  const t = computeTotals({ lines: [line({ discount: 10000, taxPercent: 11 }), line({ name: "Grande", quantity: 1, unitPrice: 70000 })], deliveryFee: 15000, paid: 50000 });
  assert.deepEqual(t, { subtotal: 160000, tax: 9900, deliveryFee: 15000, total: 184900, paid: 50000, amountDue: 134900 });
});

test("totals: tax rounds per line, overpayment never negative, garbage clamps to 0", () => {
  assert.equal(computeTotals({ lines: [line({ quantity: 1, unitPrice: 1050, taxPercent: 11 })], deliveryFee: 0, paid: 0 }).tax, 116);
  assert.equal(computeTotals({ lines: [line()], deliveryFee: 0, paid: 999999 }).amountDue, 0);
  const t = computeTotals({ lines: [line({ discount: 999999 }), line({ quantity: NaN })], deliveryFee: -5, paid: NaN });
  assert.deepEqual([t.subtotal, t.deliveryFee, t.paid, t.total], [0, 0, 0, 0]);
});

test("invoice numbers: padded, sequential, parsed back", () => {
  assert.equal(nextInvoiceNumber(2026, 0), "INV/2026/0001");
  assert.equal(nextInvoiceNumber(2026, 41), "INV/2026/0042");
  assert.equal(invoiceSeq("INV/2026/0042"), 42);
  assert.equal(invoiceSeq("garbage"), 0);
});

test("format helpers", () => {
  assert.equal(rupiah(500000), "Rp 500.000");
  assert.equal(formatInvoiceDate("2026-10-08"), "8 Oktober 2026");
});

test("buildInvoiceFromOrder prefills lines, paid and notes", () => {
  const order = {
    id: "LN-0001", customer: { name: "Sari", whatsapp: "0812" }, address: "Jl. Mawar 1", payments: [{ id: "p1", amount: 30000, method: "CASH", at: "x" }, { id: "p2", amount: 5000, method: "CASH", at: "x", reversedAt: "y" }],
    items: [{ productId: "milieu", name: "Milieu", unitPrice: 50000, quantity: 2, recipe: {} }, { productId: "grande", name: "Grande", unitPrice: 70000, quantity: 1, recipe: {} }],
  } as unknown as op.Order;
  const d = buildInvoiceFromOrder(order, { footerNote: "Terima kasih" });
  assert.equal(d.lines[0].description, "Cheese Stick 125gr dalam toples");
  assert.equal(d.lines[1].description, "Cheese Stick 225gr dalam pouch");
  assert.equal(d.paid, 30000);
  assert.equal(d.buyerAddress, "Jl. Mawar 1");
  assert.equal(d.notes, "Terima kasih");
});
