# Payments, Cash, and Receivables

[← Product spec hub](../product-spec.md)

**Implementation: 🚧 PARTIAL** — record/reverse payment and receivable math are built and tested (`app/src/lib/domain/operations.ts`), but QRIS is a static placeholder and there is no real payment-confirmation path yet. Income is counted only from COMPLETED orders; payments on in-progress orders are held and not counted as revenue; payments on cancelled orders are recorded as refunds due. See [implementation-status.md](../implementation-status.md).

## 11. Payments, cash, and receivables

### 11.1 Customer payment model

**LOCKED**

- Mandiri and BI office pickup may use **pay when the customer receives the order**.
- External delivery should be paid in full before the order is handed to the courier or otherwise dispatched outside the office. A founder may dispatch an unpaid external-delivery order after an explicit confirmation that shows the remaining amount; that remainder stays a receivable until settled. Completing an order (pickup or dispatched delivery) does not require payment.
- The official V1 payment methods are **bank transfer, QRIS, and cash**.
- Checkout does not require payment.
- The confirmation page may offer optional immediate QRIS payment.
- Founder OS should offer fulfillment-time actions such as **Show QRIS**, **Paid by Transfer**, **Cash**, and **Mark as Paid**.
- A static QRIS display does not automatically confirm payment.
- In V1, founders manually verify bank or merchant-app receipts and mark the related order paid.
- Every confirmed payment automatically records the verifying founder and verification timestamp.
- A bank/QRIS transaction reference and founder note are optional; V1 does not upload or store receipt images.

### 11.2 Receivables

**LOCKED**

- Every order has an amount due and independent payment status.
- Founder OS must show total receivables and the exact unpaid orders/customers composing the balance.
- A handed-over order may remain unpaid and must stay visible until settled or otherwise resolved.
- Sales, cash received, and receivables are distinct business measures.

### 11.3 Current cash handling context

**LOCKED:** One founder currently verifies transfer/QRIS receipts, settles QRIS proceeds, and transfers sales proceeds to a separate Le Nouette business account managed by the other founder. The new system should provide shared order-level visibility even if bank reconciliation remains manual.

**DEFERRED:** Automatic bank, QRIS-acquirer, or payment-gateway reconciliation.

### 11.4 Invoice payment (Founder OS)

**Implementation: 🚧 PARTIAL** — built and backend-tested on local `le_nouette_e2e`; browser pass and migration 0006 on production pending. See [implementation-status.md](../implementation-status.md).

- Marking an invoice paid records the linked order's remaining payment (`recordPayment`) first, then flags the invoice. Amount is the order's receivable, not the invoice total; the confirm shows both and warns if they differ.
- If the order is already paid, or the invoice is manual (no order), marking paid sets the flag only and creates no payment.
- A cancelled order blocks mark paid.
- Undo reverses only the payment that invoice created. It is blocked once the order is dispatched ("Pesanan sudah dikirim; koreksi pembayaran lewat Pesanan."), and the invoice stays paid.
- Edit and delete are unpaid-only. Delete never touches the order.
- Technical detail: [notifications-and-reporting §17.2](../technical/notifications-and-reporting.md#172-invoice-pdf-founder-os).
