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
- Catalog section heading: **"Pilih yang ingin kamu pesan"** (EN: "Pick what you want to order").
- Product cards:
  - **Milieu · 125g · Jar — Rp50.000**
  - **Grande · 225g · Pouch — Rp70.000**
- Each product uses inline quantity controls.
- Sticky bottom summary: item count, total, and **Lanjutkan**.

**Implementation: ✅ BUILT** — Sticky bottom remains fixed and responsive; header uses `position: sticky` with `overflow-x: clip` on the body to prevent scroll-container collapse. All step transitions (shop → details, details → success, tracking toggle) scroll the viewport to top to ensure primary content is visible.

#### Screen 2 — Fulfillment and identity

Canonical fulfillment options:

1. **Ambil di Kantor — Mandiri** · Gratis
2. **Ambil di Kantor — BI** · Gratis
3. **Kirim ke Alamat Saya** · Ongkir dibayar oleh pembeli

Fields:

- Nama (required)
- Nomor WhatsApp (required, validated for Indonesian phone format)
- Alamat pengiriman, shown only for external delivery (required when Delivery chosen)
- Catatan untuk pesanan, optional, maximum 180 characters
- Ingat data saya di perangkat ini, optional and unchecked by default

**LOCKED:** The order note is intended for short practical instructions such as "Titip di resepsionis." It is visible to founders but does not alter fulfillment scheduling, reservations, material calculations, or packing-batch quantities.

**Implementation: ✅ BUILT** — Form uses `noValidate` (disables browser validation) with custom inline field error messages. Validation rules: name required, WhatsApp format validated via regex pattern, delivery address required only when Delivery fulfillment is selected. Errors appear only after submission attempt and clear as user types in the field. On submission with errors, the form focuses and scrolls to the first invalid field. Order item display shows thumbnail (52px), product name, size detail (e.g., "125g · Jar"), and line total.

Show the calculated ready date before the customer submits the order. Display order items, total, and **Bayar saat pesanan diterima**. Primary action: **Buat Pesanan** (price shown in summary above, not in button label for mobile fit).

#### Screen 3 — Confirmation

Show:

- success state;
- immutable human-readable order number such as `LN-0027`;
- promised ready date;
- selected fulfillment option;
- item and total summary (with product thumbnail, name, size detail, and line total);
- payment state: **Bayar saat pesanan diterima**;
- optional secondary action: **Bayar sekarang dengan QRIS**;
- statement that order updates will be sent through WhatsApp;
- optional hint that order status can be checked using the **Lacak** (Track) button at the top of the screen;
- optional **Lacak Pesanan** (Track Order) button linking to the tracking view.

**Implementation: 🚧 PARTIAL** — the QRIS action currently displays a static placeholder image (`storefront.tsx`); tapping it never changes payment status, matching the spec's own note that a static QRIS display does not automatically confirm payment (§11.1), but real image artwork and any confirmation UX are not finished. A share-invite button ('Ajak teman'/'Invite friends') is implemented below the QRIS section; it uses navigator.share with a wa.me fallback and sends a plain origin link. See [implementation-status.md](../implementation-status.md).

**Implementation: ✅ BUILT** — Customer order tracking: **Lacak** button in storefront header opens a tracking view. Orders stored locally on customer's phone in localStorage (`le-nouette:orders`, max 20 newest first) as `{id, token}` pairs. Status fetched on-demand via read-only server action `trackOrdersAction` only when tracking view opens or customer manually refreshes (no polling). Lookup matches both order id and secret 128-bit `public_token`; bad token returns not-found. Response is customer-safe projection only (`toCustomerView`): id, status, fulfillment, ready dates, items (name/qty), total, isPaid, timestamps (including `createdAt`) — never WhatsApp, address, note, or payment details. Success page includes an inline tracking hint to make order status checking discoverable.

**Implementation: ✅ BUILT** (0.16.0) — Delivery tracking shows a four-step timeline (Pesanan diterima → Dikemas → Sedang diantar → Selesai) with the date and time of each completed step, the current step marked `aria-current="step"`, and a single "Dibatalkan {date}" line for cancelled orders. The status chip reads "Siap dikirim" for a ready delivery order not yet dispatched. Unpaid delivery orders show "Bayar saat pesanan diterima" until completion (the earlier pay-before-delivery note was removed; see [decisions-and-deferred §23](../technical/decisions-and-deferred.md#23-open-follow-ups-from-order-flow-review-0150)). Pickup tracking is unchanged. The tracking total uses the neutral text colour in dark mode. See [implementation-status.md](../implementation-status.md).

### 6.3 Availability-facing behavior

**LOCKED**

- Availability and promised dates must be shown before order submission.
- For a planned closure, prefer accepting future orders for the next available date rather than losing demand.
- A planned holiday or blocked date does not pause the storefront; new orders remain open and use the normal forward availability search.
- When the entire store is paused for an emergency, disable checkout and explain that ordering is temporarily closed.
- Never market the business as unconditionally available every day.

### 6.4 Referral capture

**ASSUMPTION:** An optional "Who introduced you to Le Nouette?" field or automatic referral link can be added if it remains genuinely low-friction. This is useful but should not compromise the core ordering flow.

**Implementation: ✅ BUILT** — A one-time native HTML `<dialog>` appears on the order success screen (Screen 3) after the customer places an order, asking **"Siapa yang memperkenalkan Le Nouette ke kamu?"** (EN: "Who introduced you to Le Nouette?"). Dialog may be dismissed by (1) selecting one of five referral source chips (Teman, keluarga, Instagram, WhatsApp, Lainnya) + optional name/account field (max 60 characters, control chars stripped), (2) pressing Lewati (skip), or (3) pressing Escape. The dialog state is tracked client-side via localStorage key `le-nouette:referral-asked` keyed by phone number, so it displays only once per phone. Submitted referrals are recorded via public server action `saveReferralAction({id, token, source, name})` which verifies the order's public_token, validates the source enum, and stores the referral as a set-once operation (no overwrite). Returns `{error}` on validation failure; on success, resolves quietly. See [implementation-status.md](../implementation-status.md).

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
| Ready for handover (delivery) | Siap dikirim |
| Order received (delivery timeline) | Pesanan diterima |
| Packed (delivery timeline) | Dikemas |
| Out for delivery | Sedang diantar |
| Cancelled on {date} | Dibatalkan {date} |
| Completed | Selesai |
| Unpaid | Belum Dibayar |
| Paid | Sudah Dibayar |
| Packing complete | Packing Selesai |
| Physical stock | Stok Fisik |
| Reserved | Sudah Dialokasikan |
| Available for new orders | Tersedia untuk Pesanan Baru |
| Stock count | Stock Opname |
