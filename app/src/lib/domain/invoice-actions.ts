"use server";

import { revalidatePath } from "next/cache";
import { createInvoice } from "@/lib/db/invoices";
import { getSettings, saveSettings } from "@/lib/db/settings";
import { getState } from "@/lib/db/get-state";
import { buildInvoiceFromOrder, normalizeNewlines, type InvoiceDraft, type InvoiceLine } from "@/lib/domain/invoice";
import { jakartaNow } from "@/lib/domain/schedule";
import { requireFounder } from "@/lib/founder-session";

const MAX_LOGO = 500 * 1024;
const str = (v: unknown, max: number) => normalizeNewlines(String(v ?? "")).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, max);
const num = (v: unknown, max = 1_000_000_000) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0; };
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

export type CreateInvoiceInput = Partial<InvoiceDraft> & { orderId?: string | null; issuedAt?: string; dueDate?: string };

// Returns the new invoice id (client navigates to /founder/invoices/<id>/pdf) or {error}.
export async function createInvoiceAction(input: CreateInvoiceInput): Promise<{ error: string | null; id: number | null; number: string | null }> {
  await requireFounder();
  const company = await getSettings();
  const today = jakartaNow(new Date()).date;
  const orderId = input?.orderId ? str(input.orderId, 40) : null;
  let draft: Partial<InvoiceDraft> = input ?? {};
  if (orderId && !input.lines?.length) {
    const order = (await getState()).orders.find((o) => o.id === orderId);
    if (!order) return { error: "Pesanan tidak ditemukan.", id: null, number: null };
    draft = buildInvoiceFromOrder(order, company);
  }
  const lines: InvoiceLine[] = (Array.isArray(draft.lines) ? draft.lines : []).slice(0, 100).map((l) => ({
    name: str(l?.name, 120), description: str(l?.description, 240), quantity: num(l?.quantity, 100000), unitPrice: num(l?.unitPrice), discount: num(l?.discount), taxPercent: Math.min(num(l?.taxPercent), 100),
  })).filter((l) => l.name && l.quantity > 0);
  const buyerName = str(draft.buyerName, 120).trim();
  if (!buyerName) return { error: "Nama pembeli wajib diisi.", id: null, number: null };
  if (!lines.length) return { error: "Tambahkan minimal satu produk.", id: null, number: null };
  const issuedAt = isDate(input.issuedAt) ? input.issuedAt : today;
  const dueDate = isDate(input.dueDate) ? input.dueDate : issuedAt;
  const row = await createInvoice({
    orderId, issuedAt, dueDate, company, lines, buyerName,
    buyerPhone: str(draft.buyerPhone, 40), buyerAddress: str(draft.buyerAddress, 400),
    deliveryFee: num(draft.deliveryFee), paid: num(draft.paid), notes: str(draft.notes, 2000),
  });
  revalidatePath("/founder/invoices");
  return { error: null, id: row.id, number: row.number };
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
