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

**Implementation: ⏳ BACKLOG** — the Produk Siap Dijual section is not built; the panel was explicitly removed pending the Ready-to-Sell tier (`app/founder/page.tsx:7`).

### 12.5 Keuangan

- unpaid orders and total receivables;
- payment capture;
- recent payments;
- revenue, received cash, estimated COGS, and estimated gross profit;
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
- If a public order-status page is later added, require an unguessable token.

### 13.5 Static assets

**REQUIRED:** Keep V1 logos, product photographs, packaging imagery, QRIS artwork, and interface assets in the Next.js repository and deploy them with the application through Vercel. Do not add Supabase Storage or Founder OS upload management in V1. Secrets and private customer documents must never be placed in the public static directory.
