# Notifications and Reporting

[← Technical spec hub](../technical-spec.md)

**Implementation: 🚧 PARTIAL** — WhatsApp deep-link generation (§16) is built for all 6 message kinds (confirmation, ready, dispatched (0.16.0), rescheduled, cancelled, payment); customer-language selection remains backlog. Open WhatsApp follow-ups are in [decisions-and-deferred §23](./decisions-and-deferred.md#23-open-follow-ups-from-order-flow-review-0150). Founder OS order board renders **Kirim WhatsApp** link when order is not COMPLETED and customer WhatsApp number is valid; kind selection is automatic via `waKindFor()`. Portable business-data export (§17.1) is ✅ built in CSV and XLSX formats with optional date-range filtering (`app/src/lib/export.ts`, routes at `app/src/app/founder/export/`). See [implementation-status.md](../implementation-status.md).

## 16. Notifications

### 16.1 Message events

Potential messages:

- order confirmation;
- ready for handover;
- ready earlier due to founder reschedule;
- manually resolved later/cancelled exception;
- payment reminder.

### 16.2 Delivery strategy

**REQUIRED:** V1 generates prefilled WhatsApp text for a founder to review and send manually.

- Founder OS exposes **Kirim WhatsApp** from the relevant order action.
- Generate a standard message for order confirmation, payment reminder, ready-for-handover, or rescheduling.
- Select the Bahasa Indonesia or English template from the order's customer-language value, falling back to Bahasa Indonesia.
- Construct an encoded WhatsApp deep link using the normalized customer phone number and generated message.
- Opening the link is a convenience action only; do not record it as confirmed sending or delivery.
- Failure to open WhatsApp must never roll back or block the underlying order, payment, packing, or rescheduling transaction.
- Do not integrate WhatsApp Business API, automated delivery, webhooks, chatbot behavior, retries, or delivery-status tracking in V1.

**Implementation: 🚧 PARTIAL (6 of 6 kinds built; customer-language selection backlog)** — `app/src/lib/domain/whatsapp.ts` provides `toWaNumber()` (normalizes 0812…/+62…/62… to 62…), `waMessage(kind, order)`, and `waLink(kind, order)` pure functions. Kind selection via `waKindFor(order)`: COMPLETED with receivable → "payment" (added 0.15.0), COMPLETED paid → null (no message), CANCELLED → "cancelled", READY_FOR_HANDOVER with `dispatchedAt` → "dispatched" (0.16.0), READY_FOR_HANDOVER → "ready", currentReadyDate !== promisedReadyDate → "rescheduled", else "confirmation". The "ready" delivery text reads "akan segera kami antar" and the unpaid payment line for delivery reads "saat pesanan diterima" (0.16.0; pickup keeps "saat serah terima"). Bahasa Indonesia only (no customer-language field in V1). Founder OS order board renders **Kirim WhatsApp** link (full-width row with icon) when the order has a kind and number valid; invalid number shows muted "Nomor WA tidak valid" instead. Message templates use multi-line format (paragraphs separated by blank lines) with order details as a block:

- **confirmation:**
  ```
  Halo [first], ini Le Nouette.
  
  Terima kasih sudah memesan! Pesanan *LN-0001*
  • 1 × Milieu 125g
  • 2 × Grande 250g
  Total: Rp 45.000
  Siap: 2 Oktober 2026
  Pesanan akan kami antar ke Jl. Gatot Subroto 123.
  
  Pembayaran sudah kami terima, terima kasih!
  ```
  — place: "Pesanan akan kami antar [ke {address}]." or "Pengambilan di Kantor [BI/Mandiri]." — paymentMsg: "Pembayaran sudah kami terima, terima kasih!" if paid, else "Pembayaran bisa lewat transfer, QRIS, atau tunai saat serah terima (delivery: saat pesanan diterima). Kabari kami ya kalau sudah transfer."

- **ready:**
  ```
  Pesanan *LN-0001* sudah siap dan akan segera kami antar.
  
  • 1 × Milieu 125g
  • 2 × Grande 250g
  Total: Rp 45.000
  
  Sisa pembayaran Rp 5.000. Bisa lewat transfer, QRIS, atau tunai saat pesanan diterima; kabari kami ya kalau sudah transfer.
  
  Terima kasih!
  ```
  — fulfillment in intro: " dan akan segera kami antar" for DELIVERY, " untuk diambil" for pickup — receivable paragraph included only if > 0

- **dispatched** (0.16.0; READY_FOR_HANDOVER with `dispatchedAt`, delivery only):
  ```
  Pesanan *LN-0001* sedang kami antar ke Jl. Gatot Subroto 123.

  • 1 × Milieu 125g
  • 2 × Grande 250g
  Total: Rp 45.000

  Sisa pembayaran Rp 5.000. Bisa lewat transfer, QRIS, atau tunai saat pesanan diterima; kabari kami ya kalau sudah transfer.
  ```
  — the address clause is omitted when no address is set; the remaining-payment paragraph is included only if receivable > 0

- **payment** (0.15.0; only for COMPLETED orders with a receivable):
  ```
  Halo [first], ini Le Nouette.

  Pesanan *LN-0001* sudah selesai. Sisa pembayaran Rp 5.000.

  Bisa lewat transfer atau QRIS; kabari kami ya kalau sudah dibayar. Terima kasih!
  ```

- **rescheduled:**
  ```
  Mohon maaf, jadwal pesanan *LN-0001* berubah.
  
  • 1 × Milieu 125g
  • 2 × Grande 250g
  Total: Rp 45.000
  Kini siap: 3 Oktober 2026
  
  Terima kasih atas pengertiannya!
  ```

- **cancelled:**
  ```
  Mohon maaf, pesanan *LN-0001* kami batalkan.
  
  Pembayaran Rp 45.000 akan kami kembalikan, kami hubungi untuk pengembaliannya.
  
  Terima kasih atas pengertiannya, semoga bisa melayani lain waktu.
  ```
  — refund paragraph included only if paid > 0

See [implementation-status.md](../implementation-status.md).

---

## 17. Reporting definitions

Use explicit definitions so metrics cannot drift:

| Metric | Definition |
|---|---|
| Ordered sales | Sum of non-cancelled order totals in period |
| Completed sales | Sum of completed order totals (COMPLETED status only) |
| Cash received | Sum of confirmed net payments on COMPLETED orders in period |
| Receivables | Sum of positive balances on non-cancelled orders (including in-progress and completed); equals Piutang + Menunggu pembayaran |
| Piutang (pesanan selesai) | Positive balances on COMPLETED non-cancelled orders |
| Menunggu pembayaran (pesanan berjalan) | Positive balances on NEEDS_PREPARATION and READY_FOR_HANDOVER orders |
| Units sold | Sum of quantities on non-cancelled orders, filterable by status |
| COGS | Captured inventory consumption cost plus modeled untracked unit costs |
| Gross profit | Completed sales minus associated COGS |
| Gross margin | Gross profit / completed sales |
| Repeat customer | Customer with more than one non-cancelled order |
| Inventory variance | Sum of stock-opname adjustments by item/reason |
| Promise changes | Count of orders with reschedule history |

Expiration labels and packing labor remain modeled per finished product until represented by a fuller cost ledger. Order bags and QRIS MDR are actual order/payment expenses where captured.

### 17.1 Portable business-data export

**REQUIRED:** Founder OS provides an authenticated **Unduh Data Bisnis** action that creates a `.csv` or `.xlsx` workbook. It supports all history or an optional date range via query params `from` and `to` (YYYY-MM-DD, WIB, inclusive).

**Built:** Founder export menu includes compact date range controls (Dari / Sampai date inputs with "Kosongkan" clear button, ~44px height) plus a helper line explaining which date each dataset uses. Query params on `/founder/export/csv?from=YYYY-MM-DD&to=YYYY-MM-DD` and `/founder/export/xlsx?from=...&to=...` filter data as follows:
- Orders by `createdAt` (WIB); customers derived from filtered orders but stats (order_count, total_ordered, first_order_at) computed from full history.
- Payments by `paid_at` (WIB); included only if within range.
- Stock and ready movements by `at` (WIB).
- Availability calendar by date.
- Snapshot datasets (inventory balances, ready balances) remain unfiltered.
- Invalid params ignored (all history on that side); reversed range (`from > to`) yields empty result and disables export links.
- Filenames: `le-nouette-{key}-{date}.csv` (all-history) or `le-nouette-{key}_{from ?? "awal"}_sd_{to ?? "akhir"}.csv` (range); e.g., `le-nouette-orders_2026-09-01_sd_2026-10-01.csv`, `le-nouette-orders_awal_sd_2026-09-30.csv`, `le-nouette-all-2026-10-01.xlsx`.

Workbook sheets:

```text
Orders
Order Items
Customers
Payments
Inventory Movements
Inventory Balances
Ready Product Movements
Ready Product Balances
Availability Calendar
```

Each sheet includes stable internal IDs, required foreign-key IDs, business identifiers, statuses, quantities, rupiah amounts, and timestamps. It must not include authentication secrets, password data, session tokens, or environment values.

**Formula injection protection:** User-supplied text cells in the Orders sheet (referral_name, customer_note) and Customers sheet (name) are prefixed with a single-quote apostrophe (`'`) if they begin with `=`, `+`, `@`, tab, or CR, preventing formula injection when opened in Excel or Google Sheets. Phone columns are similarly prefixed.

**Referral capture columns:** The Orders sheet includes `referral_source` (enum: Teman, keluarga, Instagram, WhatsApp, Lainnya, or null) and `referral_name` (customer-supplied referrer name or account, max 60 chars) to track order referral source if captured on order success.

Only an authenticated active founder may generate the workbook. Generate it as a private response download without writing it into the public static-assets directory. A comprehensive export is required immediately before applying a production database migration.

**REQUIRED:** The free-plan V1 does not rely on Supabase automatic backups. XLSX exports provide portable business continuity, while version-controlled SQL migrations preserve the database structure. Paid managed backups may be adopted later without changing the domain model.

### 17.2 Invoice PDF (Founder OS)

**Implementation: 🚧 PARTIAL** — built, including edit, mark/undo paid and delete; browser audit at 390/1440 is done (0.19.0, 0.20.3) and reviewer passes 1 and 2 are done (fixes in 0.20.3); the invoice edit page PDF content is not checked, and migrations 0005 and 0006 are applied to production (verified 9 October 2026 via Supabase `list_migrations`). See [implementation-status.md](../implementation-status.md).

- Number: `INV/YYYY/NNNN`, per-year sequence allocated from `invoice_counters` under advisory lock key 2. Numbers are never reused: deleting an invoice leaves a gap.
- Edit: only while unpaid. Number, order link and created time stay; dates and lines are editable; totals are recomputed; company info is re-copied from Pengaturan only if the founder ticks the checkbox.
- Paid state: mark paid sets `paid = total` and stores `paid_at`, `paid_method`. Undo clears them and sets `paid` back to 0. Edit and delete are blocked while paid (undo first).
- Delete: only unpaid invoices; never touches the order.
- Audit: `INVOICE_CREATED`, `INVOICE_EDITED`, `INVOICE_DELETED`, `INVOICE_PAID:<method>`, `INVOICE_UNPAID` rows in `audit_events` with the invoice number as `ref`, written in the same transaction as the invoice write. Order payments write their own `PAYMENT_RECORDED` / `PAYMENT_REVERSED` rows.
- Per line: amount (Jumlah) = max(quantity × unit price − discount, 0), before tax; tax = round(amount × taxPercent / 100). The wizard applies one VAT % to every line.
- Subtotal = Σ amount; Pajak = Σ tax; Total = Subtotal + Pajak + Ongkir; Jumlah Tertagih = max(Total − Lunas, 0).
- Whole rupiah, displayed `Rp 500.000`. Totals are recomputed on the server from submitted lines.
- Invoices are stored snapshots ([data-model §6.20](./data-model.md#620-invoices)); re-download never recalculates from the order.
- PDF: pdfkit with built-in Helvetica. Table header repeats and a footer "INV/… · hal x/y" appears on every page; the summary may move to a new page.
- Route `GET /founder/invoices/[id]/pdf` uses the same cookie gate as the export routes.
