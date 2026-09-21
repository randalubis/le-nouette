# Notifications and Reporting

[← Technical spec hub](../technical-spec.md)

**Implementation: ⏳ BACKLOG** — neither WhatsApp deep-link generation nor the XLSX export exist in the codebase yet. See [implementation-status.md](../implementation-status.md).

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
