# Le Nouette · Content Guide

The single source of truth for **language**, **error format**, and **color contrast** rules across the app. Update this when the rules change. The voice (warmth, sentence length, "kamu" vs "Anda") lives in the sister doc, [VOICE_GUIDE.md](VOICE_GUIDE.md).

---

## Language rule

| Surface | Language | Examples |
|---|---|---|
| **Storefront** (everything a customer sees) | **Bahasa Indonesia** | UI labels, toasts, errors, URL slugs, page titles, WhatsApp messages |
| **Admin back office** (everything the operator sees while signed in) | **English** | UI labels, table headers, status badges, form helper text |

When something straddles the boundary (e.g. an order's `paymentMethod` value), expose **two** helpers — one Bahasa for customer code paths and one English for admin code paths. See [src/lib/orders.ts](../src/lib/orders.ts) `paymentMethodLabel` (id) vs `paymentMethodLabelEn`.

### URL slugs

All customer-visible URLs use Bahasa:

| Customer-facing URL | What it does |
|---|---|
| `/` | Storefront landing (open round or closed-state teaser) |
| `/keranjang` | Cart |
| `/pembayaran` | Checkout (payment-method selection + form) |
| `/pesanan/[shortCode]` | Order confirmation / status |
| `/pesanan/[shortCode]/bayar` | Payment proof upload (QRIS / Transfer Bank) |
| `/riwayat` | Customer's local order history |

Legacy English slugs (`/checkout`, `/order/...`, the old `/pesanan` history page) are kept alive via 308 redirects in [middleware.ts](../src/middleware.ts) so existing bookmarks and shared WhatsApp links don't break.

### Translation table for common strings

| English (admin) | Bahasa (customer) |
|---|---|
| Cart | Keranjang |
| Checkout / Payment | Pembayaran |
| Order | Pesanan |
| Order history | Riwayat pesanan |
| QRIS | QRIS *(unchanged)* |
| Bank Transfer | Transfer Bank |
| Cash on Delivery | Bayar di Tempat |
| Delivery date | Tanggal antar |
| Pending payment | Menunggu pembayaran |
| Paid | Pembayaran diterima |
| Confirmed | Pesanan dikonfirmasi |
| Delivered | Sudah diantar |
| Cancelled | Dibatalkan |

---

## Color and contrast (N-04)

- **`--muted`** is **incidental microcopy only** — captions, status timestamps, helper text under inputs, "Pesanan disimpan di perangkat kamu"-style footers.
- **Primary body text** (product descriptions, order line items, confirmation summaries) uses **`--foreground`**.
- Every storefront page must report **zero** color-contrast violations in axe DevTools and a Lighthouse Accessibility score of **100** on a simulated mid-tier mobile device.

The current `--muted` value is `#6b5c4d` (~7:1 against `--background` `#faf7f2`, AAA). If you ever lighten it, re-verify body-text usages aren't reading "primary" off it.

---

## Error message template (N-10)

Every customer-visible error answers three questions, in this order:

1. **What happened.** Short, human-language sentence.
2. **Why** (optional — only if the cause is meaningful and known).
3. **What the customer should do next.** A concrete next action, not "try again".

Use the helper in [src/lib/errors.ts](../src/lib/errors.ts) so the same error always reads the same way.

### Examples

| Bad (generic) | Good (what-why-action) |
|---|---|
| `Gagal membuat pesanan.` | `Pesanan tidak bisa dibuat. Coba lagi sebentar atau hubungi admin via WhatsApp kalau terus error.` |
| `Stok tidak cukup.` | `Cookie Cokelat kehabisan stok. Sisa hanya 2. Hapus dari keranjang atau kurangi jumlahnya untuk lanjut.` |
| `Network error.` | `Koneksi internet kamu putus. Cek sinyal lalu coba lagi.` |

### Fallback for genuinely unknown server errors

> Maaf, ada error saat memproses pesanan. Coba lagi sebentar atau hubungi admin via WhatsApp.

Use this verbatim from `src/lib/errors.ts` rather than improvising.

---

## When this guide changes

If you add a new customer-visible string or a new error type, add a row to the relevant table here in the same PR. The CI grep that catches stray English on the storefront and stray Bahasa on the admin reads from this doc.
