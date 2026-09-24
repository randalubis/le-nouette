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
```

### 14.2 Founder reads

```text
get dashboard
list/search/filter orders
get order detail
get packing batch/detail
get inventory balances/history/projection
get receivables/payments/financial summary
get availability month
```

### 14.3 Founder commands

```text
edit/cancel/reschedule order
change order fulfillment status
complete packing batch
receive inventory
perform stock opname
record/reverse payment
block/unblock availability dates
pause/resume store
enable/disable product ordering
```

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
