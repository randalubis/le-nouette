# Order, Inventory, and Payment Workflows

[← Technical spec hub](../technical-spec.md)

**Implementation: ✅ BUILT** — the transaction logic in §9–§11 is fully implemented, including Ready-to-Sell allocation (§9.1 step 8) as pure state machine functions in `app/src/lib/domain/operations.ts` with Postgres persistence via server actions. Order cancellation (§9.3) reverses ready allocations; order editing (§9.2) for quantity reduction reversal is deferred. See [implementation-status.md](../implementation-status.md).

## 9. Order lifecycle

### 9.1 Create order

Single database transaction:

1. validate store is open;
2. validate active products and positive quantities;
3. calculate the current promised date;
4. normalize or create customer by WhatsApp number;
5. capture product names, prices, and recipe quantities;
6. create order, items, and fulfillment;
7. calculate totals;
8. lock and allocate the oldest matching Product Ready to Sell units;
9. create active component reservations only for remaining `to_pack_quantity`;
10. assign the order to the date-based packing batch only when an uncovered quantity remains;
11. set `READY_FOR_HANDOVER` immediately when ready stock covers every item, otherwise `NEEDS_PREPARATION`;
12. write audit event;
13. commit;
14. send notification after commit, if configured.

If any database step fails, no order or partial reservation survives.

### 9.2 Edit order before packing

**PROPOSED:** Allow founders to edit quantity, items, fulfillment method, address, and current ready date while status is `NEEDS_PREPARATION`.

The same transaction must:

- recalculate captured totals;
- reverse and reallocate Product Ready to Sell units oldest-first;
- replace active component reservations only for uncovered quantities using the captured recipe;
- reassign packing batch if the ready date changes;
- create a reschedule record when the date changes;
- audit the edit.

**OPEN:** Decide whether customers may edit orders themselves through a secure order link. Exclude from V1 unless required.

### 9.3 Cancel order

- Set status `CANCELLED` and timestamp/reason.
- Release active reservations.
- Reverse Product Ready to Sell allocations so the linked units become available again.
- Remove active packing-batch membership.
- Do not delete order, items, payments, or history.
- If payment exists, flag for manual refund handling.

### 9.4 Complete packing

Single database transaction:

1. lock the `OPEN` packing batch;
2. load eligible `NEEDS_PREPARATION` orders in the batch;
3. sum active reservations by inventory item;
4. create negative `PACKING_CONSUMPTION` movements;
5. mark reservations `CONSUMED`;
6. set included orders to `READY_FOR_HANDOVER` and `actual_ready_at`;
7. mark batch `COMPLETED` with actor/time;
8. write audit event;
9. commit.

For Milieu, the 125 g reservation represents exactly the sellable quantity under the current pooled-stock yield rule (5 supplier packs yield 9 jars).

Set customer-facing expiry to one calendar month after the physical local packing date for every completed product, including confirmed-order units and accidental extras. Order, promised-ready, dispatch, pickup, and payment dates never reset expiry.

**REQUIRED:** Any later yield revision creates a new effective-dated recipe and applies only to subsequent reservations and batches.

**REQUIRED:** Packing completion is whole-batch only in V1. If any required quantity remains unpacked, the batch stays `OPEN`; no consumption movements are posted and none of its orders move automatically to `READY_FOR_HANDOVER`. Partial completion and partial material allocation are deferred.

### 9.5 Handover and external dispatch

- For Mandiri and BI pickup, a founder explicitly marks the handed-over order `COMPLETED`, sets `completed_at`, and does not automatically mark it paid. If unpaid, surface it in receivables immediately.
- For external delivery, `current_ready_date` is the planned dispatch date. The dispatch command must verify that the order is `READY_FOR_HANDOVER`, the local date in `Asia/Jakarta` is on or after `current_ready_date`, and `payment_status = PAID` in the same transaction before setting `dispatched_at`.
- V1 promises the dispatch date, not a dispatch time. Courier booking and handoff remain manual founder operations.
- Courier handoff does not itself change payment status. A founder marks the order `COMPLETED` after delivery is confirmed.
- Do not add a fourth Kanban column for dispatch in V1; show a dispatched indicator on the existing ready-order card until completion.

---

## 10. Inventory workflows

### 10.1 Receive raw cheese

Founder enters:

- supplier pack quantity;
- grams per pack, default 225;
- price per pack;
- inbound delivery cost;
- receipt date.

System calculates:

```text
received_grams = packs × grams_per_pack
total_cost = packs × price_per_pack + inbound_delivery_cost
unit_cost_per_gram = total_cost / received_grams
```

Post a positive `RECEIPT` movement for raw cheese with total and unit cost.

### 10.2 Receive packaging

Founder selects an inventory item and enters purchased piece count and total landed cost. Convenience conversions:

- square stickers: sheets × 15;
- round stickers: sheets × 18;
- pouches: bundles × 100;
- jar seals: packages × 50 sheets, with one sheet equal to one seal;
- raw cheese: supplier packs × 225 g.

Do not require founders to calculate unit cost manually.

### 10.3 Stock opname

For each selected item:

1. calculate current `ON_HAND`;
2. accept actual physical quantity;
3. show variance;
4. require reason when variance is non-zero;
5. after explicit confirmation, post an `ADJUSTMENT` equal to `actual - system`;
6. audit actor, time, reason, before, actual, and difference.

For raw cheese, allow input by exact grams or supplier-pack count. Convert pack count to grams before posting.

### 10.4 Shortage projection

For every open packing date, display:

```text
required = active reservations due through date
on_hand = current ledger balance
shortage = MAX(required - on_hand, 0)
```

Warn rather than block orders when replenishment can arrive before packing. A founder-controlled SKU availability switch remains the hard stop.

**REQUIRED:** Treat `inventory_items.reorder_threshold` and `purchase_increment` as founder-managed planning values. Show a low-stock warning when available-to-promise reaches or falls below the threshold, and always show a critical warning for a projected reservation shortage. Calculate a suggested purchase quantity using the configured increment, but never create or transmit a supplier order.

If an item has no configured threshold or purchase increment, shortage projection still works; show the exact shortage and let the founder decide the purchase quantity.

**REQUIRED:** Round every suggested purchase upward using:

```text
rounded_shortage = CEILING(shortage / purchase_increment) × purchase_increment
suggested_quantity = MAX(rounded_shortage, minimum_recommended_purchase or 0)
```

Initial purchase increments are 225 g for raw cheese, 15 pieces for square stickers, 18 pieces for round stickers, one piece for jars, 100 pieces for pouches, and 50 pieces for jar seals. Jars have `minimum_recommended_purchase = 30`; other items have no separate minimum. Never round a recommendation downward.

Seed these editable `reorder_threshold` values:

| Inventory item | Base-unit threshold |
|---|---:|
| Raw cheese | 2,250.00 g |
| Jar | 10 pieces |
| Pouch | 10 pieces |
| Square sticker | 20 pieces |
| Round sticker | 10 pieces |
| Jar seal | 10 pieces |

Threshold edits affect subsequent warning evaluation only; they never create inventory movements or rewrite historical warnings, reservations, or consumption.

### 10.5 Costing method

**PROPOSED:** Use weighted-average inventory cost in V1 because it is sufficient for a small homogeneous raw-material pool and simpler than lot-level FIFO.

```text
new_average_cost =
  (existing_on_hand_cost + receipt_cost) /
  (existing_on_hand_quantity + receipt_quantity)
```

Packing consumption captures the current average cost at posting time. Packaging does the same.

**OPEN:** If expiry/batch traceability becomes mandatory, introduce purchase lots and FIFO later rather than complicating V1 preemptively.

---

## 11. Payment workflow

### 11.1 Record payment

Founder selects an order and enters:

- method: bank transfer, QRIS, or cash;
- amount, default remaining receivable;
- paid time, default now;
- optional external reference;
- optional QRIS MDR;
- note.

Single transaction:

1. validate amount;
2. create confirmed payment;
3. recompute order payment status;
4. write audit event;
5. commit.

The server takes `verified_by` from the authenticated founder session rather than accepting a founder ID from the client. `paid_at` defaults to the server time but may be corrected explicitly when recording an earlier receipt.

### 11.2 Reverse payment

Never edit or delete a confirmed payment. Add a reversal/refund record linked to the original payment and recompute payment status.

### 11.3 Static QRIS

- Customer confirmation and founder handover screens may display the configured QRIS image.
- Displaying QRIS does not change payment status.
- Founder verification remains required.

### 11.4 Payment gate for external delivery

- External-delivery orders may be packed and become `READY_FOR_HANDOVER` while unpaid.
- Disable the dispatch action and show the remaining amount until the order is fully paid.
- Revalidate payment status on the server when dispatch is submitted; a client-side disabled button is not sufficient enforcement.
- This gate does not apply to Mandiri or BI office pickup.
- Satisfying the payment gate does not permit dispatch before `current_ready_date` or before packing completion.

---

## 18. Failure handling

### 18.1 Order created but notification fails

Keep the order. Show confirmation in-browser and flag notification for manual retry.

### 18.2 Duplicate checkout submission

Return the original order associated with the idempotency key.

### 18.3 Stock below reservations

Allow negative ATP, show a critical replenishment warning, and identify the earliest affected packing date. Do not corrupt or delete reservations.

### 18.4 Stock opname below reserved demand

Post the truthful adjustment and allow available-to-promise to become negative. Preserve active reservations, order quantities, and promised/current ready dates. Surface a critical warning with the shortage quantity, earliest affected packing date, and affected orders/batches. Do not cancel, reduce, or reschedule anything automatically; the founder must replenish or invoke the existing manual order-resolution workflow. Physical truth takes precedence over a cosmetically non-negative balance.

### 18.5 Two founders update one order

Use optimistic concurrency/versioning or row locking. Reject the stale update with the current order state instead of silently overwriting it.

### 18.6 Packing transaction failure

Roll back the entire batch completion. No order may become ready unless its reservations and material consumption are committed together.

### 18.7 Payment entered incorrectly

Create a reversal and replacement; never overwrite the original confirmed record.

### 18.8 Connection lost during a founder action

Show that the result is unknown, restore connectivity, then reload the authoritative record before retrying. Never claim success from client state alone.
