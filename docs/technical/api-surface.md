# Application Actions and API Surface

[← Technical spec hub](../technical-spec.md)

**Implementation: ✅ MOSTLY BUILT** — domain commands and reads are implemented as Next.js Server Actions in `app/src/lib/domain/actions.ts` and server-rendered Founder OS components. No separate REST API routes exist; the application uses Server Actions and server-side data fetching instead. See [implementation-status.md](../implementation-status.md) for details.

## 14. Application actions and API surface

Exact URLs may follow the chosen framework. The domain actions are:

### 14.1 Public reads/actions

```text
get storefront catalog
calculate fulfillment promise
create order
get order confirmation by short-lived or unguessable token
track order status (read-only lookup by id + public_token)
save referral source and name (write-once, verified with public_token)
```

No authentication required. `createOrderAction`, `trackOrdersAction`, and `saveReferralAction` are Server Actions without `requireFounder()`. `saveReferralAction({id, token, source, name})` verifies the order's public_token, validates the source enum (Teman, keluarga, Instagram, WhatsApp, Lainnya), and records the referral as set-once (idempotent, no overwrite). Returns `{error}` on validation failure.

### 14.2 Founder reads

```text
get dashboard
list/search/filter orders
get order detail
get packing batch/detail
get inventory balances/history/projection
get receivables/payments/financial summary
get availability month
get invoice list; invoice PDF via GET /founder/invoices/[id]/pdf (same cookie gate as export routes)
```

Authenticated server-rendered components; no mutation required.

### 14.3 Founder commands

```text
edit/cancel/reschedule order
change order fulfillment status
complete packing batch
mark one order packed (Selesai Packing, per order)
dispatch order(s) (`allowUnpaid` only after the UI confirm); complete order (no payment check)
receive inventory
perform stock opname
record/reverse payment
block/unblock availability dates
pause/resume store
enable/disable product ordering
create invoice (full draft, or prefilled from an order id)
edit unpaid invoice (number kept)
mark invoice paid (may record the linked order payment) / undo paid (may reverse it)
delete unpaid invoice
save company settings and logo
```

All 22 founder command server actions call `requireFounder()` as their first line (`app/src/lib/founder-session.ts`), verifying an HMAC-signed `founder_session` cookie and redirecting unauthenticated requests to `/login`. Commands: `cancelOrderAction`, `rescheduleOrderAction`, `completeBatchAction`, `markOrderReadyAction`, `dispatchOrderAction(id, allowUnpaid?)`, `dispatchOrdersAction(ids, allowUnpaid?)`, `completeOrderAction`, `recordPaymentAction`, `reversePaymentAction`, `receiveStockAction`, `stockOpnameAction`, `recordExtraPackedAction`, `adjustReadyAction`, `setDateStatusAction`, `setStoreStatusAction`, `resetSeedAction`, `createInvoiceAction`, `updateInvoiceAction`, `markInvoicePaidAction`, `undoInvoicePaidAction`, `deleteInvoiceAction`, `saveSettingsAction`. Invoice actions live in `app/src/lib/domain/invoice-actions.ts`, not `actions.ts`. `createInvoiceAction` returns `{error, id, number}`; `saveSettingsAction` takes `FormData` (`logo`, `removeLogo`). Mark/undo paid act on the order through the same `recordPayment`/`reversePayment` domain ops as the Pesanan board; see [payments-and-receivables §11.4](../product/payments-and-receivables.md#114-invoice-payment-founder-os).

Use command-specific server actions rather than a generic endpoint that permits arbitrary status or balance mutation.

### 14.4 Concurrency and idempotency

- `create order`, `complete packing`, `receive stock`, `stock adjustment`, and `record payment` accept an idempotency key.
- Use row-level locking or equivalent transaction isolation when completing a packing batch or changing the same order.
- Duplicate submissions return the existing result rather than creating duplicate orders/payments/movements.

### 14.5 Connectivity model

**REQUIRED:** Founder OS is online-only in V1.

- Do not cache founder mutations for later replay or present stale data as editable current state.
- Disable or stop a submitted action when the browser detects loss of connectivity, and show a clear Indonesian error with a retry action.
- After an uncertain network result, reload the authoritative server state before allowing the founder to repeat the action.
- Idempotency keys protect retryable commands from duplicate orders, payments, stock movements, or packing completion.
- Offline storage, background synchronization, and service-worker mutation queues are deferred.
