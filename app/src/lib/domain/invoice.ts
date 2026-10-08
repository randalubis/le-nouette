// Pure invoice logic: prefill from an order, totals, numbering. No DB / framework imports.
import { productById } from "./catalog.ts";
import { amountPaid, type Order } from "./operations.ts";

export type InvoiceLine = { name: string; description: string; quantity: number; unitPrice: number; discount: number; taxPercent: number };
export type InvoiceCompany = { name: string; phone: string; email: string; address: string; instagram: string; paymentInfo: string; footerNote: string; signatureName: string; logoBase64: string | null; logoMime: string | null };
export type InvoiceDraft = { buyerName: string; buyerPhone: string; buyerAddress: string; lines: InvoiceLine[]; deliveryFee: number; paid: number; notes: string };

const packaging = { milieu: "dalam toples", grande: "dalam pouch" } as const;

export const catalogLine = (id: "milieu" | "grande"): InvoiceLine => {
  const p = productById(id);
  return { name: p.name, description: `Cheese Stick ${p.netGrams}gr ${packaging[id]}`, quantity: 1, unitPrice: p.price, discount: 0, taxPercent: 0 };
};

export function buildInvoiceFromOrder(order: Order, company: Pick<InvoiceCompany, "footerNote">): InvoiceDraft {
  return {
    buyerName: order.customer.name,
    buyerPhone: order.customer.whatsapp,
    buyerAddress: order.address ?? "",
    lines: order.items.map((item) => ({
      name: item.name,
      description: `Cheese Stick ${productById(item.productId).netGrams}gr ${packaging[item.productId]}`,
      quantity: item.quantity, unitPrice: item.unitPrice, discount: 0, taxPercent: 0,
    })),
    deliveryFee: 0,
    paid: amountPaid(order),
    notes: company.footerNote,
  };
}

const clampInt = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0);

// Discount is a Rupiah amount per line. Line "amount" (Jumlah) is net of discount, before tax.
export const lineNet = (l: InvoiceLine) => Math.max(clampInt(l.quantity) * clampInt(l.unitPrice) - clampInt(l.discount), 0);
export const lineTax = (l: InvoiceLine) => Math.round((lineNet(l) * Math.min(Math.max(l.taxPercent, 0), 100)) / 100);

export function computeTotals(input: { lines: InvoiceLine[]; deliveryFee: number; paid: number }) {
  const subtotal = input.lines.reduce((sum, l) => sum + lineNet(l), 0);
  const tax = input.lines.reduce((sum, l) => sum + lineTax(l), 0);
  const deliveryFee = clampInt(input.deliveryFee), paid = clampInt(input.paid);
  const total = subtotal + tax + deliveryFee;
  return { subtotal, tax, deliveryFee, total, paid, amountDue: Math.max(total - paid, 0) };
}

// Browser textareas submit CRLF; pdfkit only breaks on \n and draws a lone \r as "Ð".
export const normalizeNewlines = (s: string) => s.replace(/\r\n?/g, "\n");

export const invoicePrefix =(year: number) => `INV/${year}/`;
export const nextInvoiceNumber = (year: number, lastSeq: number) => `${invoicePrefix(year)}${String(lastSeq + 1).padStart(4, "0")}`;
export const invoiceSeq = (number: string) => Number(number.split("/")[2]) || 0;

// "8 Oktober 2026" - formatDate in schedule.ts omits the year.
export const formatInvoiceDate = (date: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(date));

// Indonesian separators: Rp 500.000
export const rupiah = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;
