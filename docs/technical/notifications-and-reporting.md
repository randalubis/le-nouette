# Notifications and Reporting

[← Technical spec hub](../technical-spec.md)

**Implementation: 🚧 PARTIAL** — WhatsApp deep-link generation (§16) is built for 4 of 5 message kinds (confirmation, ready, rescheduled, cancelled); payment-reminder and customer-language selection remain backlog. Founder OS order board renders **Kirim WhatsApp** link when order is not COMPLETED and customer WhatsApp number is valid; kind selection is automatic via `waKindFor()`. Portable business-data export (§17.1) is built in CSV and XLSX formats for all-history mode (`app/src/lib/export.ts`, routes at `app/src/app/founder/export/`). Optional date-range filtering is deferred. See [implementation-status.md](../implementation-status.md).

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

**Implementation: 🚧 PARTIAL (4 of 5 kinds built)** — `app/src/lib/domain/whatsapp.ts` provides `toWaNumber()` (normalizes 0812…/+62…/62… to 62…), `waMessage(kind, order)`, and `waLink(kind, order)` pure functions. Kind selection via `waKindFor(order)`: COMPLETED → null (no message), CANCELLED → "cancelled", READY_FOR_HANDOVER → "ready", currentReadyDate !== promisedReadyDate → "rescheduled", else "confirmation". Bahasa Indonesia only (no customer-language field in V1). Founder OS order board renders **Kirim WhatsApp** link (full-width row with icon) when not COMPLETED and number valid; invalid number shows muted "Nomor WA tidak valid" instead. Payment-reminder kind not built (deferred). Message templates (items as "quantity × name", no "Kakak", handles blank firstName):

- **confirmation:** `{greeting} Terima kasih sudah memesan! Pesanan {orderId}: {items}. Total {total}. Siap {date}. {place} {paymentMsg}` — place: "Pesanan akan kami antar [ke {address}]." or "Pengambilan di Kantor [BI/Mandiri]." — paymentMsg: "Pembayaran sudah kami terima, terima kasih!" if paid, else "Pembayaran bisa lewat transfer, QRIS, atau tunai saat serah terima. Kabari kami ya kalau sudah transfer."
- **ready:** `{greeting} Pesanan {orderId} sudah siap{fulfillment}. {items}. Total {total}.{receivable} Terima kasih!` — fulfillment: " dan segera kami antar" for DELIVERY, " untuk diambil" for pickup — receivable: " Sisa pembayaran {amount}." if > 0
- **rescheduled:** `{greeting} Mohon maaf, jadwal pesanan {orderId} berubah. Pesanan kini siap {date}. {items}. Total {total}. Terima kasih atas pengertiannya!`
- **cancelled:** `{greeting} Mohon maaf, pesanan {orderId} kami batalkan.{refund} Terima kasih atas pengertiannya, semoga bisa melayani lain waktu.` — refund: " Pembayaran {amount} akan kami kembalikan, kami hubungi untuk pengembaliannya." if paid > 0

See [implementation-status.md](../implementation-status.md).

---

## 17. Reporting definitions

Use explicit definitions so metrics cannot drift:

| Metric | Definition |
|---|---|
| Ordered sales | Sum of non-cancelled order totals in period |
| Completed sales | Sum of completed non-cancelled order totals |
| Cash received | Sum of confirmed net payments in period |
| Receivables | Sum of positive balances on non-cancelled orders |
| Units sold | Sum of quantities on non-cancelled orders, filterable by status |
| COGS | Captured inventory consumption cost plus modeled untracked unit costs |
| Gross profit | Completed sales minus associated COGS |
| Gross margin | Gross profit / completed sales |
| Repeat customer | Customer with more than one non-cancelled order |
| Inventory variance | Sum of stock-opname adjustments by item/reason |
| Promise changes | Count of orders with reschedule history |

Expiration labels and packing labor remain modeled per finished product until represented by a fuller cost ledger. Order bags and QRIS MDR are actual order/payment expenses where captured.

### 17.1 Portable business-data export

**REQUIRED:** Founder OS provides an authenticated **Unduh Data Bisnis** action that creates an `.xlsx` workbook. It supports all history or an optional date range.

Workbook sheets:

```text
Orders
Order Items
Customers
Payments and Receivables
Inventory Movements
Inventory Balances
Ready Product Movements and Balances
Packing Batches
Availability Calendar
```

Each sheet includes stable internal IDs, required foreign-key IDs, business identifiers, statuses, quantities, rupiah amounts, and timestamps. It must not include authentication secrets, password data, session tokens, or environment values.

Only an authenticated active founder may generate the workbook. Generate it as a private response download without writing it into the public static-assets directory. A comprehensive export is required immediately before applying a production database migration.

**REQUIRED:** The free-plan V1 does not rely on Supabase automatic backups. XLSX exports provide portable business continuity, while version-controlled SQL migrations preserve the database structure. Paid managed backups may be adopted later without changing the domain model.
