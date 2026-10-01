# Founder OS and Storefront UI Requirements

[← Technical spec hub](../technical-spec.md)

**Implementation: ✅ BUILT** — every screen listed below exists (`app/founder/*` and `app/src/components/storefront.tsx`). See [implementation-status.md](../implementation-status.md) for the few gaps (auth gating, QRIS confirmation, referral field).

## 12. Founder OS screen requirements

### 12.1 Beranda

Show actionable counts first:

- Perlu Disiapkan;
- Siap Diserahkan;
- Belum Dibayar;
- next packing summary;
- material shortages/restock deadline;
- affected rescheduling tasks;
- store/availability state.

Every count opens the corresponding filtered screen.

### 12.2 Pesanan

- Mobile tabs: **Perlu Disiapkan**, **Siap Diserahkan**, **Selesai**.
- Vertical cards with order number, customer, item summary, fulfillment method/date, and payment badge.
- Search by order number, customer name, and WhatsApp number.
- Explicit primary buttons for status transitions.
- External-delivery cards show payment status and expose dispatch only after full payment.
- Swipe may remain a nonessential shortcut but cannot be the only way to change status.

### 12.3 Packing

- Date and order count.
- Milieu and Grande totals.
- Material requirement table.
- On-hand, reserved, and projected shortage indicators.
- Order list.
- Explicit **Tandai Packing Selesai** confirmation.

### 12.4 Stok

For each tracked item show:

- physical/system on-hand;
- reserved;
- available-to-promise;
- demand through upcoming packing dates;
- status/warning;
- receipt, history, and stock-opname actions.

Show a separate **Produk Siap Dijual** section with Milieu and Grande unit balances, append-only movement history, and a **Catat Produk Ekstra** action. Do not merge ready-product units into component on-hand, active reservations, or confirmed packing-batch quantities.

**Implementation: ✅ BUILT** — the Produk Siap Dijual section is implemented in `app/src/components/founder-boards.tsx` (ReadyToSell component) with available/expired unit display per source, write-off actions, and append-only ledger history. See [implementation-status.md](../implementation-status.md) for full integration details.

### 12.5 Keuangan

- Omzet (revenue from COMPLETED orders only);
- Sudah diterima (payments on COMPLETED orders);
- Dibayar, belum selesai (payments on in-progress orders, held, not counted as revenue);
- Perlu refund (unreversed payments on CANCELLED orders);
- Belum dibayar (receivables on non-cancelled orders);
- payment method share (computed from received payments on COMPLETED orders);
- unpaid orders and receivables detail;
- payment capture;
- filters by date, method, fulfillment state, and payment state.

### 12.6 Availability

- month calendar with available/unavailable/holiday states;
- order and unit counts by date;
- date/range blocking;
- manual holiday creation individually or in an initial batch;
- affected-order resolution workflow;
- Pause Orders control.

---

## 13. Public storefront requirements

### 13.1 Catalog and cart

- Return only active and ordering-enabled products.
- Quantity changes update total immediately.
- At least one product is required to continue.

### 13.2 Fulfillment form

- Show all currently supported methods.
- Delivery requires an address.
- Accept an optional customer order note with a maximum of 180 characters.
- Treat the note as informational only; it must not influence scheduling, reservations, inventory consumption, or packing quantities.
- Show calculated date before submission.
- Revalidate the date and store status server-side during submission.

**Implementation: ✅ BUILT** — Form uses `noValidate` with custom inline field error messages (name required, WhatsApp format validated, address required when Delivery selected). Errors appear only after submission attempt and clear as user types. On submission with errors, form focuses and scrolls to the first invalid field. Order item summary displays product thumbnail (52px), name, size detail (e.g., "125g · Jar"), and line total.

### 13.3 Localization

- Bahasa Indonesia default.
- `ID | EN` switch.
- Persist preference locally on the device.
- Keep Bahasa Indonesia as the canonical copy and English as the paired translation in version-controlled TypeScript dictionary files inside the application repository.
- Use stable translation keys shared by both dictionaries and fail the type check or build when a key is missing from either language.
- Do not add a translation service, CMS, database translation table/editor, or runtime machine translation in V1.
- Never store translated enum labels as business data; persist stable domain values and translate only for display.

### 13.4 Customer convenience and privacy

- Show **Ingat data saya di perangkat ini** unchecked by default.
- On successful order submission, save name, normalized WhatsApp number, and selected language in browser-local storage only when the customer opted in.
- Never persist delivery address, customer note, cart contents, order number, order history, or payment information in this convenience record.
- When the customer turns the option off, clear any previously saved name and WhatsApp data. The non-identifying language preference may remain so the interface opens in the last selected language.
- Treat local values as untrusted convenience input: prefill the form, but validate and normalize them again on submission.
- Do not synchronize this preference between devices and do not represent it as a customer account or server-side consent record.
- Do not expose founder-only order data through predictable order numbers.
- Customer order tracking: A **Lacak** (Track) button in the storefront header opens a tracking view. Customer phones store order records locally (localStorage, max 20 newest first) as `{id, token}` pairs. Status is fetched on-demand only when the tracking view opens or when the customer manually refreshes (no polling). Lookups use both order id and unguessable 128-bit `public_token`; bad tokens return not-found (uniform with missing orders). The tracking response is read-only and customer-safe only: `{id, status, fulfillment, readyDates, items, total, isPaid, timestamps}` — never WhatsApp, address, note, or payment details.

### 13.5 Viewport and navigation

**Sticky header:** Storefront header uses `position: sticky` to remain fixed at the top of the viewport during scroll. Root body element uses `overflow-x: clip` (not `overflow-x: hidden`) to avoid creating a scroll container that would collapse sticky positioning.

**Scroll-to-top on step change:** Every transition between storefront steps (shop → details, details → success, tracking toggle) calls `window.scrollTo(0, 0)` to ensure primary content is visible at the top of the viewport, improving navigation clarity and reducing friction.

**Implementation: ✅ BUILT** — Both behaviors implemented in `app/src/components/storefront.tsx`. The sticky header fix resolves an earlier issue where `overflow-x: hidden` on the body created an unintended scroll container; `overflow-x: clip` maintains the same overflow behavior without affecting sticky positioning (https://github.com/w3c/csswg-drafts/issues/5903).

### 13.6 Static assets

**REQUIRED:** Keep V1 logos, product photographs, packaging imagery, QRIS artwork, and interface assets in the Next.js repository and deploy them with the application through Vercel. Do not add Supabase Storage or Founder OS upload management in V1. Secrets and private customer documents must never be placed in the public static directory.
