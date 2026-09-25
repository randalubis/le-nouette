"use client";

// Storefront copy. Bahasa Indonesia is canonical; English is the paired translation (tech spec §13.3).
// `en` is typed against `id`, so a missing or stray key fails the build. Founder OS stays Bahasa-only.

import { useSyncExternalStore } from "react";

export type Locale = "ID" | "EN";

const id = {
  langSwitch: "Ganti bahasa",
  eyebrow: "Gourmet cheese sticks",
  heroTitle: "Good food brings people together.",
  heroSub: "Pesan kapan saja. Siap dalam 2 hari kerja.",
  openForOrders: "Tersedia untuk dipesan",
  readyEstimate: "Estimasi siap {date}",
  pausedTitle: "Pemesanan ditutup sementara",
  pausedSub: "Silakan kembali lagi nanti",
  catalogTitle: "Pilih yang ingin kamu bagikan",
  milieuDetail: "125g · Jar",
  milieuBlurb: "Pas untuk teman kerja, meeting, atau dinikmati sendiri.",
  grandeDetail: "225g · Pouch",
  grandeBlurb: "Lebih banyak untuk dinikmati dan dibagikan.",
  decrease: "Kurangi {product}",
  increase: "Tambah {product}",
  quantityOf: "Jumlah {product}",
  itemCount: "{count} produk",
  continue: "Lanjutkan",
  placeOrder: "Buat Pesanan",
  back: "Kembali",
  yourOrder: "Pesananmu",
  fulfillmentQuestion: "Bagaimana kamu ingin menerima pesanan?",
  readyEstimateSentence: "Estimasi siap {date}.",
  fulfillmentLegend: "Cara menerima pesanan",
  pickupMandiri: "Ambil di Kantor Mandiri",
  pickupBi: "Ambil di Kantor BI",
  delivery: "Kirim ke alamat saya",
  free: "Gratis",
  deliveryFee: "Ongkir dibayar pembeli",
  customerSection: "Informasi pemesan",
  name: "Nama lengkap",
  whatsapp: "Nomor WhatsApp",
  whatsappHint: "Contoh: 0812 3456 7890",
  address: "Alamat pengiriman",
  addressPlaceholder: "Tulis alamat lengkap",
  note: "Catatan untuk pesanan (opsional)",
  notePlaceholder: "Contoh: titip di resepsionis",
  remember: "Ingat data saya di perangkat ini",
  summaryTitle: "Ringkasan pesanan",
  total: "Total",
  payOnDelivery: "Lunasi sebelum pesanan dikirim. Ongkir menyusul lewat WhatsApp.",
  payOnReceipt: "Bayar saat pesanan diterima: transfer, QRIS, atau tunai.",
  successEyebrow: "Pesanan berhasil",
  thanks: "Terima kasih, {name}.",
  readyOn: "Pesananmu akan siap {date}.",
  payWithQris: "Bayar sekarang dengan QRIS",
  qrisTitle: "QRIS Le Nouette",
  qrisNote: "Scan dengan aplikasi bank atau e-wallet, lalu kirim bukti lewat WhatsApp. Pembayaran tetap dikonfirmasi manual oleh kami.",
  whatsappUpdates: "Update pesanan akan kami kirim melalui WhatsApp.",
  orderAgain: "Pesan lagi",
  inviteFriends: "Ajak teman",
  inviteText: "Aku baru pre-order cheese stick Le Nouette, renyah dan gurih banget. Yuk ikut pesan juga!",
} as const;

const en: Record<keyof typeof id, string> = {
  langSwitch: "Change language",
  eyebrow: "Gourmet cheese sticks",
  heroTitle: "Good food brings people together.",
  heroSub: "Order any time. Ready in 2 working days.",
  openForOrders: "Open for orders",
  readyEstimate: "Estimated ready {date}",
  pausedTitle: "Ordering is paused",
  pausedSub: "Please check back soon",
  catalogTitle: "Pick what you want to share",
  milieuDetail: "125g · jar",
  milieuBlurb: "Right for a coworker, a meeting, or just for yourself.",
  grandeDetail: "225g · pouch",
  grandeBlurb: "More to enjoy and pass around.",
  decrease: "Remove one {product}",
  increase: "Add one {product}",
  quantityOf: "{product} quantity",
  itemCount: "{count} items",
  continue: "Continue",
  placeOrder: "Place order",
  back: "Back",
  yourOrder: "Your order",
  fulfillmentQuestion: "How would you like to receive your order?",
  readyEstimateSentence: "Estimated ready {date}.",
  fulfillmentLegend: "How to receive your order",
  pickupMandiri: "Pick up at Mandiri office",
  pickupBi: "Pick up at BI office",
  delivery: "Deliver to my address",
  free: "Free",
  deliveryFee: "Delivery paid by the customer",
  customerSection: "Your details",
  name: "Full name",
  whatsapp: "WhatsApp number",
  whatsappHint: "Example: 0812 3456 7890",
  address: "Delivery address",
  addressPlaceholder: "Write the full address",
  note: "Order note (optional)",
  notePlaceholder: "Example: leave it at reception",
  remember: "Remember my details on this device",
  summaryTitle: "Order summary",
  total: "Total",
  payOnDelivery: "Pay in full before dispatch. We will send the delivery fee on WhatsApp.",
  payOnReceipt: "Pay when you receive the order: transfer, QRIS, or cash.",
  successEyebrow: "Order placed",
  thanks: "Thank you, {name}.",
  readyOn: "Your order will be ready {date}.",
  payWithQris: "Pay now with QRIS",
  qrisTitle: "Le Nouette QRIS",
  qrisNote: "Scan with your bank or e-wallet app, then send the receipt on WhatsApp. We still confirm every payment manually.",
  whatsappUpdates: "We will send order updates on WhatsApp.",
  orderAgain: "Order again",
  inviteFriends: "Invite friends",
  inviteText: "I just preordered Le Nouette cheese sticks, crispy and so cheesy. Come preorder yours too!",
};

const dictionaries = { ID: id, EN: en };
export type Key = keyof typeof id;

const KEY = "le-nouette:locale";
const listeners = new Set<() => void>();
let locale: Locale | null = null;

const read = (): Locale => (locale ??= (safe(() => localStorage.getItem(KEY)) === "EN" ? "EN" : "ID"));
const safe = <T,>(fn: () => T) => { try { return fn(); } catch { return null; } };

export function setLocale(next: Locale) {
  locale = next;
  safe(() => localStorage.setItem(KEY, next)); // language preference may stay even when identity is cleared (§13.4)
  listeners.forEach((listener) => listener());
}

export function useTranslation() {
  const active = useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    read,
    () => "ID" as Locale,
  );
  const t = (key: Key, vars?: Record<string, string | number>) =>
    Object.entries(vars ?? {}).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), dictionaries[active][key] as string);
  return { t, locale: active, setLocale };
}
