"use server";

import { revalidatePath } from "next/cache";
import { createInvoice, deleteInvoice, getInvoice, setInvoicePaid, updateInvoice } from "@/lib/db/invoices";
import { withDomainTransaction } from "@/lib/db/with-domain-transaction";
import { getSettings, saveSettings } from "@/lib/db/settings";
import { getState } from "@/lib/db/get-state";
import { buildInvoiceFromOrder, canDeleteInvoice, canEditInvoice, normalizeNewlines, planMarkPaid, planUndoPaid, type InvoiceDraft, type InvoiceLine } from "@/lib/domain/invoice";
import { recordPayment, reversePayment, type PaymentMethod } from "@/lib/domain/operations";
import { jakartaNow } from "@/lib/domain/schedule";
import { requireFounder } from "@/lib/founder-session";

const MAX_LOGO = 500 * 1024;
const str = (v: unknown, max: number) => normalizeNewlines(String(v ?? "")).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, max);
const num = (v: unknown, max = 1_000_000_000) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0; };
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

// Order pages/cards read payments: refresh them after an invoice changed an order payment (same scope as actions.ts revalidateAll).
const revalidateOrders = () => { revalidatePath("/"); revalidatePath("/founder", "layout"); };

export type CreateInvoiceInput = Partial<InvoiceDraft> & { orderId?: string | null; issuedAt?: string; dueDate?: string };

// Returns the new invoice id (client navigates to /founder/invoices/<id>/pdf) or {error}.
export async function createInvoiceAction(input: CreateInvoiceInput): Promise<{ error: string | null; id: number | null; number: string | null }> {
  await requireFounder();
  const company = await getSettings();
  const orderId = input?.orderId ? str(input.orderId, 40) : null;
  let draft: Partial<InvoiceDraft> = input ?? {};
  if (orderId && !input.lines?.length) {
    const order = (await getState()).orders.find((o) => o.id === orderId);
    if (!order) return { error: "Pesanan tidak ditemukan.", id: null, number: null };
    draft = buildInvoiceFromOrder(order, company);
  }
  const clean = cleanDraft(draft, input);
  if ("error" in clean) return { error: clean.error, id: null, number: null };
  const row = await createInvoice({ ...clean, orderId, company });
  revalidatePath("/founder/invoices");
  return { error: null, id: row.id, number: row.number };
}

// Shared sanitising for create and edit: caps lengths, clamps numbers, validates required fields and dates.
function cleanDraft(draft: Partial<InvoiceDraft>, dates: { issuedAt?: string; dueDate?: string }): InvoiceDraft & { issuedAt: string; dueDate: string } | { error: string } {
  const lines: InvoiceLine[] = (Array.isArray(draft.lines) ? draft.lines : []).slice(0, 100).map((l) => ({
    name: str(l?.name, 120), description: str(l?.description, 240), quantity: num(l?.quantity, 100000), unitPrice: num(l?.unitPrice), discount: num(l?.discount), taxPercent: Math.min(num(l?.taxPercent), 100),
  })).filter((l) => l.name && l.quantity > 0);
  const buyerName = str(draft.buyerName, 120).trim();
  if (!buyerName) return { error: "Nama pembeli wajib diisi." };
  if (!lines.length) return { error: "Tambahkan minimal satu produk." };
  const issuedAt = isDate(dates.issuedAt) ? dates.issuedAt : jakartaNow(new Date()).date;
  const dueDate = isDate(dates.dueDate) ? dates.dueDate : issuedAt;
  return {
    issuedAt, dueDate, lines, buyerName,
    buyerPhone: str(draft.buyerPhone, 40), buyerAddress: str(draft.buyerAddress, 400),
    deliveryFee: num(draft.deliveryFee), paid: num(draft.paid), notes: str(draft.notes, 2000),
  };
}

const METHODS: PaymentMethod[] = ["TRANSFER", "QRIS", "CASH"];
const NOT_FOUND = "Invoice tidak ditemukan.";
const LOCKED = "Invoice sudah lunas; batalkan lunas dulu.";
type Result = { error: string | null };

// Edit unpaid invoice. Number/order link kept; company snapshot refreshed from settings only on request.
export async function updateInvoiceAction(id: number, input: Partial<InvoiceDraft> & { issuedAt?: string; dueDate?: string; refreshCompany?: boolean }): Promise<Result> {
  await requireFounder();
  const inv = await getInvoice(Number(id));
  if (!inv) return { error: NOT_FOUND };
  if (!canEditInvoice(inv)) return { error: LOCKED };
  const clean = cleanDraft(input ?? {}, input ?? {});
  if ("error" in clean) return { error: clean.error };
  const row = await updateInvoice(inv.id, { ...clean, company: input?.refreshCompany ? await getSettings() : undefined });
  if (!row) return { error: LOCKED };
  revalidatePath("/founder/invoices");
  return { error: null };
}

// Order payment FIRST (order is source of truth): a retry after a partial failure sees the order paid and just flags the invoice.
export async function markInvoicePaidAction(id: number, method: PaymentMethod): Promise<Result> {
  await requireFounder();
  if (!METHODS.includes(method)) return { error: "Metode pembayaran tidak valid." };
  const inv = await getInvoice(Number(id));
  if (!inv) return { error: NOT_FOUND };
  const order = inv.orderId ? (await getState()).orders.find((o) => o.id === inv.orderId) ?? null : null;
  const plan = planMarkPaid(order, inv);
  if ("error" in plan) return { error: plan.error };
  let orderPaymentId: string | null = null;
  if (plan.kind === "record-order-payment") {
    const { error, state } = await withDomainTransaction((s, now) => recordPayment(s, order!.id, method, now));
    if (error) return { error };
    orderPaymentId = state!.orders.find((o) => o.id === order!.id)!.payments.at(-1)!.id;
  }
  const ok = await setInvoicePaid(inv.id, { method, orderPaymentId });
  revalidatePath("/founder/invoices");
  if (plan.kind === "record-order-payment") revalidateOrders();
  return ok ? { error: null } : { error: "Invoice sudah lunas." };
}

export async function undoInvoicePaidAction(id: number): Promise<Result> {
  await requireFounder();
  const inv = await getInvoice(Number(id));
  if (!inv) return { error: NOT_FOUND };
  const order = inv.orderId ? (await getState()).orders.find((o) => o.id === inv.orderId) ?? null : null;
  const plan = planUndoPaid(order, inv);
  if ("error" in plan) return { error: plan.error };
  if (plan.kind === "reverse-order-payment") {
    const { error } = await withDomainTransaction((s, now) => reversePayment(s, order!.id, plan.paymentId, now));
    if (error) return { error };
  }
  await setInvoicePaid(inv.id, null);
  revalidatePath("/founder/invoices");
  if (plan.kind === "reverse-order-payment") revalidateOrders();
  return { error: null };
}

// Unpaid only; never touches the order.
export async function deleteInvoiceAction(id: number): Promise<Result> {
  await requireFounder();
  const inv = await getInvoice(Number(id));
  if (!inv) return { error: NOT_FOUND };
  if (!canDeleteInvoice(inv)) return { error: LOCKED };
  if (!(await deleteInvoice(inv.id))) return { error: LOCKED };
  revalidatePath("/founder/invoices");
  return { error: null };
}

// FormData: text fields + optional "logo" file (PNG/JPG, magic bytes checked) + "removeLogo".
export async function saveSettingsAction(form: FormData): Promise<{ error: string | null }> {
  await requireFounder();
  const patch: Parameters<typeof saveSettings>[0] = {
    name: str(form.get("name"), 120).trim() || "Le Nouette", phone: str(form.get("phone"), 60), email: str(form.get("email"), 120),
    address: str(form.get("address"), 400), instagram: str(form.get("instagram"), 80), paymentInfo: str(form.get("paymentInfo"), 1000),
    footerNote: str(form.get("footerNote"), 1000), signatureName: str(form.get("signatureName"), 120),
  };
  const logo = form.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (logo.size > MAX_LOGO) return { error: "Logo maksimal 500 KB." };
    const bytes = Buffer.from(await logo.arrayBuffer());
    const png = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const jpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (!png && !jpg) return { error: "Logo harus berupa PNG atau JPG." };
    patch.logoBase64 = bytes.toString("base64");
    patch.logoMime = png ? "image/png" : "image/jpeg";
  } else if (form.get("removeLogo")) {
    patch.logoBase64 = null; patch.logoMime = null;
  }
  await saveSettings(patch);
  revalidatePath("/founder/settings");
  return { error: null };
}
