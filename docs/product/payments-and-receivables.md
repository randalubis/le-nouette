# Payments, Cash, and Receivables

[← Product spec hub](../product-spec.md)

**Implementation: 🚧 PARTIAL** — record/reverse payment and receivable math are built and tested (`app/src/lib/domain/operations.ts`), but QRIS is a static placeholder and there is no real payment-confirmation path yet. See [implementation-status.md](../implementation-status.md).

## 11. Payments, cash, and receivables

### 11.1 Customer payment model

**LOCKED**

- Mandiri and BI office pickup may use **pay when the customer receives the order**.
- External delivery must be paid in full before the order is handed to the courier or otherwise dispatched outside the office.
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
