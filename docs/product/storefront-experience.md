# Customer Storefront Experience

[← Product spec hub](../product-spec.md)

**Implementation: ✅ BUILT** — the full 3-screen flow and ID/EN i18n are implemented (`app/src/components/storefront.tsx`, `app/src/lib/i18n.ts`). QRIS display is a static placeholder image only (🚧 PARTIAL, see §6.2 Screen 3 below and [implementation-status.md](../implementation-status.md)).

## 6. Customer storefront experience

### 6.1 Experience principles

**LOCKED**

- Mobile-first web storefront; no native app.
- Bahasa Indonesia is the default language.
- Provide a lightweight `ID | EN` switch in the header.
- Bahasa Indonesia is the canonical source copy. English is maintained as a paired translation in version-controlled TypeScript dictionary files.
- V1 uses no external translation service, content-management system, or database translation editor.
- Remember the selected language on the device.
- Copy should be warm, polished, and conversational, not formal or bank-like.
- No mandatory login, account, password, email, billing address, payment page, or product-detail ceremony.
- Address appears only when delivery is selected.
- A repeat customer should be able to order in approximately 10–20 seconds once saved fields are available; first-time checkout should remain around 30 seconds or less.
- Offer an optional, unchecked **Ingat data saya di perangkat ini** checkbox for repeat ordering.
- Only name, WhatsApp number, and language may be stored on the customer's device. Never remember delivery addresses, order notes, order contents, or payment information.
- The saved details remain on that browser/device and are not a customer account. Turning the option off clears previously saved name and WhatsApp details.

### 6.2 Canonical flow

#### Screen 1 — Pesan Le Nouette

- Compact branded header using the Nouette Knot, LE NOUETTE, burgundy/cream identity, and accurate thin ribbon-style product photography.
- Avoid an oversized marketing hero that pushes products below the fold.
- Display the dynamic promise, for example: **"Pesan hari ini · Estimasi siap Rabu, 16 September."**
- Product cards:
  - **Milieu · 125g · Jar — Rp50.000**
  - **Grande · 225g · Pouch — Rp70.000**
- Each product uses inline quantity controls.
- Sticky bottom summary: item count, total, and **Lanjutkan**.

#### Screen 2 — Fulfillment and identity

Canonical fulfillment options:

1. **Ambil di Kantor — Mandiri** · Gratis
2. **Ambil di Kantor — BI** · Gratis
3. **Kirim ke Alamat Saya** · Ongkir dibayar oleh pembeli

Fields:

- Nama
- Nomor WhatsApp
- Alamat pengiriman, shown only for external delivery
- Catatan untuk pesanan, optional, maximum 180 characters
- Ingat data saya di perangkat ini, optional and unchecked by default

**LOCKED:** The order note is intended for short practical instructions such as "Titip di resepsionis." It is visible to founders but does not alter fulfillment scheduling, reservations, material calculations, or packing-batch quantities.

Show the calculated ready date before the customer submits the order. Display order items, total, and **Bayar saat pesanan diterima**. Primary action: **Buat Pesanan · Rp…**

#### Screen 3 — Confirmation

Show:

- success state;
- immutable human-readable order number such as `LN-0027`;
- promised ready date;
- selected fulfillment option;
- item and total summary;
- payment state: **Bayar saat pesanan diterima**;
- optional secondary action: **Bayar sekarang dengan QRIS**;
- statement that order updates will be sent through WhatsApp.

**Implementation: 🚧 PARTIAL** — the QRIS action currently displays a static placeholder image (`storefront.tsx`); tapping it never changes payment status, matching the spec's own note that a static QRIS display does not automatically confirm payment (§11.1), but real image artwork and any confirmation UX are not finished. See [implementation-status.md](../implementation-status.md).

### 6.3 Availability-facing behavior

**LOCKED**

- Availability and promised dates must be shown before order submission.
- For a planned closure, prefer accepting future orders for the next available date rather than losing demand.
- A planned holiday or blocked date does not pause the storefront; new orders remain open and use the normal forward availability search.
- When the entire store is paused for an emergency, disable checkout and explain that ordering is temporarily closed.
- Never market the business as unconditionally available every day.

### 6.4 Referral capture

**ASSUMPTION:** An optional "Who introduced you to Le Nouette?" field or automatic referral link can be added if it remains genuinely low-friction. This is useful but should not compromise the core ordering flow.

**Implementation: ⏳ BACKLOG** — not found anywhere in the storefront code. See [implementation-status.md](../implementation-status.md).

---

## Appendix B — Canonical customer-facing Bahasa labels

| English concept | Canonical Bahasa Indonesia |
|---|---|
| Continue | Lanjutkan |
| How would you like to receive your order? | Bagaimana kamu ingin menerima pesanan? |
| Pick up at the office — Mandiri | Ambil di Kantor — Mandiri |
| Pick up at the office — BI | Ambil di Kantor — BI |
| Deliver to my address | Kirim ke Alamat Saya |
| Delivery fee paid by buyer | Ongkir dibayar oleh pembeli |
| Name | Nama |
| WhatsApp number | Nomor WhatsApp |
| Delivery address | Alamat pengiriman |
| Place order | Buat Pesanan |
| Order successful | Pesanan berhasil |
| Pay when order is received | Bayar saat pesanan diterima |
| Pay now with QRIS | Bayar sekarang dengan QRIS |
| Needs preparation | Perlu Disiapkan |
| Ready for handover | Siap Diserahkan |
| Completed | Selesai |
| Unpaid | Belum Dibayar |
| Paid | Sudah Dibayar |
| Packing complete | Packing Selesai |
| Physical stock | Stok Fisik |
| Reserved | Sudah Dialokasikan |
| Available for new orders | Tersedia untuk Pesanan Baru |
| Stock count | Stock Opname |
