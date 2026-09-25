# Technical and Data Rules (Business-Authored Constraints)

[← Product spec hub](../product-spec.md)

These are the business-side technical constraints founders and product decisions impose on the implementation. Detailed schema, algorithms, and API design live in the technical spec — see [Architecture](../technical/architecture.md) and [Data Model](../technical/data-model.md).

## 12. Technical and data rules

### 12.1 Architecture principles

**ASSUMPTION**

- Build a mobile-first responsive web application with a public storefront and authenticated Founder OS.
- Deploy the V1 web application on Vercel for managed hosting and rapid delivery. Database, authentication, and file storage remain separate technology decisions.
- Use Vercel Hobby only for development and non-commercial testing. Upgrade to Vercel Pro before the storefront accepts its first live commercial order; the upgrade is a production-launch gate, not merely a later scaling decision.
- Use Next.js with TypeScript for both the public storefront and Founder OS in one application. The exact framework version is selected and pinned when implementation begins.
- Use Supabase PostgreSQL as the managed relational database. Supabase authentication and storage remain separate follow-up decisions.
- Use Drizzle ORM for type-safe server-side database access and transactions. Database changes are applied through reviewed, version-controlled SQL migrations; direct production schema pushes are not allowed.
- Store V1 logos, product images, packaging imagery, QRIS artwork, and interface assets in the Next.js project and deploy them with the application through Vercel. Supabase Storage and founder-managed uploads are deferred.
- Use `Asia/Jakarta` for business-day boundaries and fulfillment calculations.
- Store monetary amounts as integer rupiah.
- Store raw cheese quantities in grams to two decimal places. Round only once at each persisted movement or reservation boundary using standard half-up rounding; never calculate from rounded display values.
- Generate immutable, human-readable order identifiers such as `LN-0027`.
- Treat ledger entries and status-transition events as auditable records.
- Do not retroactively change historical promised dates, acquisition costs, COGS, or transactions when settings change.

**Implementation: ✅ BUILT** — Vercel deployment is live at `le-nouette.vercel.app`; Supabase PostgreSQL with Drizzle ORM persistence is integrated via `app/src/lib/db/` with migrations at `app/drizzle/`; application uses Next.js/TypeScript Server Actions for domain commands (`app/src/lib/domain/actions.ts`). All principles above are implemented. See [implementation-status.md](../implementation-status.md).

### 12.2 Core entities

**ASSUMPTION:** The implementation is expected to need at least:

| Entity | Purpose |
|---|---|
| `Product` | Milieu/Grande definitions, weight, package, price, availability |
| `ProductRecipe` | Per-SKU material quantities and yield rules |
| `Customer` | Name and WhatsApp number only in V1 |
| `Order` | Header, totals, statuses, promised dates, timestamps |
| `OrderItem` | Product, quantity, captured unit price |
| `Fulfillment` | Method, office or address, current ready date |
| `Payment` | Amount, method, status, paid time, optional MDR |
| `InventoryItem` | Cheese and packaging master data |
| `InventoryMovement` | Receipts, consumption, adjustments, and reasons |
| `InventoryReservation` | Material commitment tied to active orders/batches |
| `PackingBatch` | Date-based aggregate packing demand and completion |
| `AvailabilityCalendar` | Date, availability status, reason, creator |
| `StoreStatus` | Open/paused state, reason, optional resume date |
| `FounderUser` | The two equal-access founders |
| `BusinessSetting` | Timezone, lead rules, QRIS display, thresholds |

See the full field-level schema in [Data Model](../technical/data-model.md).

### 12.3 Required order timestamps and fields

**ASSUMPTION**

```text
ordered_at
promised_ready_date
current_ready_date
actual_ready_at
completed_at
paid_at
fulfillment_status
payment_status
rescheduled_at
rescheduled_by
reschedule_reason
```

Customer address belongs to the fulfillment/order record, not the customer profile, because office pickup requires no address and delivery addresses may vary.

### 12.4 State-transition rules

**ASSUMPTION**

- Create order → validate store/fulfillment availability → capture prices → set promise → create material reservations → status `NEEDS_PREPARATION` and payment `UNPAID`.
- Edit active order → recalculate totals and reservations; preserve an audit trail.
- Cancel before packing → release reservations; status `CANCELLED`.
- Packing complete → consume reserved items and set relevant orders `READY_FOR_HANDOVER`.
- Handover → set fulfillment `COMPLETED`; do not change payment automatically.
- Mark paid → create/complete payment record and set `PAID` with timestamp and method.
- Stock opname → create adjustment movement rather than overwrite balance.
- Change availability affecting confirmed orders → require rescheduling workflow before calendar block confirmation.

**Implementation: ✅ BUILT** — this state machine is fully implemented and tested in `app/src/lib/domain/operations.ts`, ahead of persistence.

### 12.5 Notifications

**LOCKED:** V1 uses founder-initiated, prefilled WhatsApp messages rather than automatic WhatsApp Business API delivery.

- Founder OS provides a **Kirim WhatsApp** action that generates the agreed message and opens the customer's WhatsApp conversation.
- The founder reviews and manually sends the message; opening WhatsApp does not count as proof that it was sent or delivered.
- Prefilled messages cover order confirmation, payment reminder, ready-for-handover notification, and rescheduling notification.
- Message text uses the customer's selected language where available and includes only the relevant order details.
- Order creation, payment updates, packing completion, and rescheduling never depend on a WhatsApp message being sent successfully.
- V1 does not require WhatsApp Business API approval, automated delivery, webhooks, a chatbot, or delivery-status tracking.

**Implementation: ⏳ BACKLOG** — no WhatsApp deep-link generation found in the codebase yet.

### 12.6 Business data export and backup

**LOCKED**

- Founder OS provides **Unduh Data Bisnis** as an authenticated, on-demand `.xlsx` export.
- The workbook contains separate sheets for orders, order items, customers, payments and receivables, inventory movements, inventory balances, Product Ready to Sell movements and balances, and availability dates. (Packing Batches sheet is deferred.)
- Exports retain stable record IDs and timestamps so related records can be reconciled and reconstructed.
- Founders may export all history. Optional date-range filtering is deferred.
- A comprehensive export is required immediately before every production database migration.
- Database schema and SQL migrations remain version-controlled in the code repository.
- V1 does not assume Supabase automatic backups because they require a paid plan.
- Managed automatic backups may be reconsidered when live volume or recovery risk justifies the subscription.

**Implementation: ✅ BUILT** — CSV and XLSX exports are implemented in `app/src/lib/export.ts` with routes at `app/src/app/founder/export/{csv,xlsx}/route.ts`. Exports include 9 datasets: Orders, Order Items, Customers, Payments, Inventory Movements, Inventory Balances, Ready Movements, Ready Balances, Availability Calendar. All-history export is ready; optional date-range filtering and Packing Batches sheet are deferred. See [implementation-status.md](../implementation-status.md).

### 12.7 Customer-data retention

**LOCKED**

- Orders, order totals, payments, inventory movements, packing history, and audit history remain as business records.
- Customer name and WhatsApp number may be retained for repeat-order recognition until a founder manually anonymizes that customer.
- Delivery addresses and customer order notes are automatically removed 90 days after order completion.
- Customer anonymization removes identifying profile data without deleting financial, operational, or inventory history. Historical orders remain linked to an anonymized customer record.
- XLSX exports contain private customer and business information and must be handled as private files.
