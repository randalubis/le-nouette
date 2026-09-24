# Core Data Model

[← Technical spec hub](../technical-spec.md)

**Implementation: 🚧 PARTIAL** — Postgres persistence is live (`app/src/lib/db/`, migrations via Drizzle at `app/drizzle/`). The lean schema reflects `operations.ts` state shape, not the full 18-table spec (see `docs/superpowers/specs/2026-09-21-supabase-persistence-design.md`). In-memory fallback to browser sessionStorage remains for offline handling during development. See [implementation-status.md](../implementation-status.md).

## 6. Core data model

The field lists below define required business data, not exact migration syntax.

### 6.1 `founder_users`

| Field | Type | Rule |
|---|---|---|
| `id` | identifier | primary key |
| `name` | text | required |
| `login_identifier` | text | unique |
| `auth_user_id` | identifier | unique reference to Supabase Auth user |
| `active` | boolean | default true |
| timestamps | timestamp | required |

Both founders have the same authorization policy in V1.

**REQUIRED:** Use Supabase Auth with email/password. Exactly two pre-approved individual founder accounts are provisioned manually for launch. Public self-registration and shared credentials are prohibited. Each authenticated Supabase user must map to one active `founder_users` record before Founder OS access is granted.

### 6.2 `customers`

| Field | Type | Rule |
|---|---|---|
| `id` | identifier | primary key |
| `name` | text | required for active customer; nullable after anonymization |
| `whatsapp_normalized` | text | required and unique for active customer; nullable after anonymization |
| `whatsapp_display` | text | optional original formatting |
| `anonymized_at` | timestamp | nullable |
| timestamps | timestamp | required |

**PROPOSED:** match repeat customers using normalized WhatsApp number. Do not require an account, email, birthday, saved address, or password.

### 6.3 `products`

| Field | Type | Rule |
|---|---|---|
| `id` | identifier | primary key |
| `code` | enum/text | `MILIEU`, `GRANDE`; unique |
| `name` | text | customer-facing name |
| `sellable_weight_g` | decimal | 125 or 225 |
| `package_label` | text | Jar or Pouch |
| `current_price_rp` | integer | non-negative |
| `active` | boolean | controls catalog visibility |
| `ordering_enabled` | boolean | independent SKU availability switch |
| display fields | text/assets | localized copy and imagery |
| timestamps | timestamp | required |

### 6.4 `inventory_items`

| Field | Type | Rule |
|---|---|---|
| `id` | identifier | primary key |
| `code` | enum/text | unique |
| `name` | text | required |
| `unit` | enum | `GRAM` or `PIECE` |
| `active` | boolean | default true |
| `reorder_threshold` | decimal | nullable until configured |
| `purchase_increment` | decimal | nullable |
| `minimum_recommended_purchase` | decimal | nullable; applied after upward rounding |
| timestamps | timestamp | required |

Required V1 item codes:

```text
RAW_CHEESE_G
JAR_125
POUCH_225
STICKER_SQUARE
STICKER_ROUND
JAR_SEAL
```

Expiration labels remain a COGS assumption rather than operational inventory in V1.

### 6.5 `product_recipe_items`

| Field | Type | Rule |
|---|---|---|
| `id` | identifier | primary key |
| `product_id` | identifier | foreign key |
| `inventory_item_id` | identifier | foreign key |
| `quantity_per_unit` | decimal | positive |
| `effective_from` | date | required |
| `effective_to` | date | nullable |

Initial active recipes:

| Product | Item | Quantity |
|---|---|---:|
| Milieu | Raw cheese | 131.58 g |
| Milieu | Jar | 1 |
| Milieu | Square sticker | 1 |
| Milieu | Round sticker | 1 |
| Milieu | Jar seal | 1 |
| Grande | Raw cheese | 225 g |
| Grande | Pouch | 1 |
| Grande | Square sticker | 1 |

Recipe versions must be effective-dated so a later yield correction does not alter old reservations or consumption records.

### 6.6 `orders`

| Field | Type | Rule |
|---|---|---|
| `id` | identifier | primary key |
| `order_number` | text | immutable, unique |
| `customer_id` | identifier | foreign key |
| `fulfillment_status` | enum | required |
| `payment_status` | enum | derived or synchronized |
| `currency` | text | fixed `IDR` |
| `subtotal_rp` | integer | captured at order creation/edit |
| `delivery_fee_rp` | integer | normally zero/pass-through in V1 |
| `total_rp` | integer | required |
| `customer_locale` | enum | `id` or `en` |
| `ordered_at` | timestamp | immutable |
| `actual_ready_at` | timestamp | nullable |
| `completed_at` | timestamp | nullable |
| `cancelled_at` | timestamp | nullable |
| `cancellation_reason` | text | nullable |
| timestamps | timestamp | required |

Fulfillment states:

```text
NEEDS_PREPARATION
READY_FOR_HANDOVER
COMPLETED
CANCELLED
```

Payment states:

```text
UNPAID
PARTIALLY_PAID
PAID
REFUNDED
```

`PARTIALLY_PAID` is included because the data model supports multiple payment records even if the UI rarely uses it.

### 6.7 `order_items`

| Field | Type | Rule |
|---|---|---|
| `id` | identifier | primary key |
| `order_id` | identifier | foreign key |
| `product_id` | identifier | foreign key |
| `product_name_snapshot` | text | historical display value |
| `unit_price_rp` | integer | captured current price |
| `quantity` | integer | positive |
| `line_total_rp` | integer | unit price × quantity |
| `ready_quantity` | integer | quantity allocated from Product Ready to Sell; default zero |
| `recipe_snapshot` | JSON or child rows | exact material quantities used for reservation |

**PROPOSED:** use normalized `order_item_recipe_snapshots` child rows instead of JSON if the selected stack makes relational reporting straightforward. Use one method, not both.

### 6.8 `fulfillments`

| Field | Type | Rule |
|---|---|---|
| `id` | identifier | primary key |
| `order_id` | identifier | unique foreign key |
| `method` | enum | required |
| `promised_ready_date` | date | immutable original promise |
| `current_ready_date` | date | active operational date |
| `delivery_address` | text | required only for delivery |
| `customer_note` | text | nullable; maximum 180 Unicode characters |
| `dispatched_at` | timestamp | nullable; external delivery only |
| `personal_data_purged_at` | timestamp | nullable; set after address/note removal |
| timestamps | timestamp | required |

Methods:

```text
PICKUP_MANDIRI
PICKUP_BI
DELIVERY
```

### 6.9 `payments`

| Field | Type | Rule |
|---|---|---|
| `id` | identifier | primary key |
| `order_id` | identifier | foreign key |
| `amount_rp` | integer | positive for receipt; negative for refund |
| `method` | enum | required |
| `status` | enum | `CONFIRMED`, `REVERSED` |
| `paid_at` | timestamp | required for confirmed receipt; defaults to current time |
| `verified_by` | founder ID | required; derived from authenticated founder session |
| `external_reference` | text | optional bank/QRIS reference |
| `mdr_rp` | integer | default zero |
| `note` | text | nullable founder note |
| timestamps | timestamp | required |

Methods:

```text
QRIS
BANK_TRANSFER
CASH
```

**REQUIRED:** These are the only payment methods selectable in V1. Every confirmed payment is manually verified by one of the two founders; displaying QRIS or receiving a customer claim does not confirm payment.

**REQUIRED:** Do not accept or store receipt-image uploads in V1. The payment row, audit event, optional reference, and optional note are the complete V1 evidence trail.

Order payment status is derived from confirmed net payments relative to `total_rp`. If stored for filtering performance, it must update in the same transaction as the payment record.

### 6.10 `inventory_movements`

| Field | Type | Rule |
|---|---|---|
| `id` | identifier | primary key |
| `inventory_item_id` | identifier | foreign key |
| `movement_type` | enum | required |
| `quantity_delta` | decimal | signed; never zero |
| `unit_cost_rp` | decimal/integer | nullable except receipts where known |
| `total_cost_rp` | integer | nullable except receipts where known |
| `occurred_at` | timestamp | required |
| `packing_batch_id` | identifier | nullable foreign key |
| `order_id` | identifier | nullable foreign key |
| `created_by` | founder ID | nullable for system-generated entries |
| `reason_code` | enum/text | nullable |
| `note` | text | nullable |
| timestamps | timestamp | required |

Movement types:

```text
RECEIPT
PACKING_CONSUMPTION
ADJUSTMENT
REVERSAL
```

Reason codes include:

```text
PHYSICAL_COUNT
WEIGHING_DIFFERENCE
DAMAGED_OR_UNSUITABLE
INTERNAL_CONSUMPTION
QUALITY_SELECTION
OTHER
```

**REQUIRED:** movements are append-only. Corrections use reversal/adjustment entries.

### 6.11 `inventory_reservations`

| Field | Type | Rule |
|---|---|---|
| `id` | identifier | primary key |
| `order_id` | identifier | foreign key |
| `inventory_item_id` | identifier | foreign key |
| `quantity` | decimal | positive |
| `status` | enum | required |
| `created_at` | timestamp | required |
| `released_at` | timestamp | nullable |
| `release_reason` | enum/text | nullable |

Statuses:

```text
ACTIVE
CONSUMED
RELEASED
```

Only `ACTIVE` reservations contribute to reserved stock.

### 6.12 `packing_batches`

| Field | Type | Rule |
|---|---|---|
| `id` | identifier | primary key |
| `ready_date` | date | unique for active batch in V1 |
| `status` | enum | `OPEN`, `COMPLETED`, `REOPENED` |
| `completed_at` | timestamp | nullable |
| `completed_by` | founder ID | nullable |
| timestamps | timestamp | required |

### 6.13 `packing_batch_orders`

| Field | Type | Rule |
|---|---|---|
| `packing_batch_id` | identifier | foreign key |
| `order_id` | identifier | foreign key, unique while active |
| `assigned_at` | timestamp | required |

Orders join the batch matching `current_ready_date`. Cancelling or rescheduling an uncompleted order removes or reassigns that membership transactionally.

### 6.14 `ready_product_movements`

| Field | Type | Rule |
|---|---|---|
| `id` | identifier | primary key |
| `product_id` | identifier | Milieu or Grande foreign key |
| `quantity_delta` | integer | signed; never zero |
| `movement_type` | enum | `EXTRA_PACKED`, `ALLOCATED_TO_ORDER`, `ADJUSTMENT`, `REVERSAL` |
| `packed_at` | timestamp | required for `EXTRA_PACKED` |
| `expires_on` | date | required for `EXTRA_PACKED`; one calendar month after local packing date |
| `packing_batch_id` | identifier | nullable source batch reference |
| `order_id` | identifier | nullable when allocated |
| `source_movement_id` | identifier | source `EXTRA_PACKED` movement for FIFO allocation/reversal |
| `created_by` | founder ID | required for manual entries |
| `note` | text | nullable |
| timestamps | timestamp | required |

`READY_TO_SELL = SUM(ready_product_movements.quantity_delta)` by product. The only product values are the existing Milieu and Grande SKUs; movements never create product variants. Movements are append-only.

Recording `EXTRA_PACKED` is a separate founder command after the confirmed batch remains exact. In one transaction, post component `PACKING_CONSUMPTION` movements from the active product recipe and add the positive ready-product movement. Reject the action if it would produce a negative component balance without explicit stock reconciliation.

For a new or edited order, allocate ready units automatically from the oldest positive, unexpired `EXTRA_PACKED` sources first. Post negative `ALLOCATED_TO_ORDER` movements linked to the order and source. Exclude sources whose `expires_on` is before the local allocation date. `to_pack_quantity = order_item.quantity - order_item.ready_quantity`; only `to_pack_quantity` creates component reservations and packing demand. If every order item is fully covered, set the order to `READY_FOR_HANDOVER`; otherwise keep it `NEEDS_PREPARATION` until the uncovered quantities are packed. Cancellation or quantity reduction posts reversals that restore the linked ready units when still valid; expired restored units remain unavailable for allocation.

**Implementation: ✅ BUILT** — the ready-product tier is fully implemented. Schema: `ready_product_movements` table applied via migration `app/drizzle/0001_smart_spiral.sql`, with `order_items.ready_quantity` column for allocation tracking. Domain logic in `app/src/lib/domain/operations.ts` (recordExtraPacked, adjustReady, readyBalances, readySources, FIFO allocation in createOrder, reversal on cancelOrder). Quantity-reduction reversal on editOrder is deferred. See [Founder OS](../product/founder-os.md) and [Inventory Model](../product/inventory-model.md).

### 6.15 `availability_dates`

| Field | Type | Rule |
|---|---|---|
| `date` | date | primary/unique business date |
| `status` | enum | `AVAILABLE`, `UNAVAILABLE`, `HOLIDAY` |
| `reason` | text | nullable |
| `source` | enum | `FOUNDER_CLOSURE`, `FOUNDER_HOLIDAY`, `SYSTEM` |
| `created_by` | founder ID | nullable |
| timestamps | timestamp | required |

Indonesian national holidays are entered and maintained manually by the founders. Initial setup may create multiple holiday dates in one batch; later dates may be added or edited individually. A holiday defaults to `HOLIDAY` and unavailable. Calendar changes affecting confirmed orders must use the explicit rescheduling workflow. V1 does not call an external holiday provider.

### 6.16 `store_status`

Singleton configuration:

| Field | Type | Rule |
|---|---|---|
| `status` | enum | `OPEN`, `PAUSED` |
| `pause_reason` | text | nullable |
| `resume_date` | date | nullable |
| `updated_by` | founder ID | required for change |
| `updated_at` | timestamp | required |

### 6.17 `order_reschedules`

| Field | Type | Rule |
|---|---|---|
| `id` | identifier | primary key |
| `order_id` | identifier | foreign key |
| `from_ready_date` | date | required |
| `to_ready_date` | date | required |
| `reason_code` | enum/text | required |
| `reason_note` | text | nullable |
| `changed_by` | founder ID | required |
| `changed_at` | timestamp | required |
| `customer_notified_at` | timestamp | nullable |

### 6.18 `audit_events`

Record consequential actions not already self-evident from append-only ledgers:

```text
ORDER_CREATED
ORDER_EDITED
ORDER_CANCELLED
ORDER_STATUS_CHANGED
PACKING_COMPLETED
PAYMENT_RECORDED
PAYMENT_REVERSED
STOCK_RECEIVED
STOCK_ADJUSTED
DATE_BLOCKED
ORDER_RESCHEDULED
STORE_PAUSED
STORE_RESUMED
```

Store actor, timestamp, entity type/ID, and compact before/after metadata. Do not duplicate whole database rows.

---

## 7. Derived values and invariants

### 7.1 Inventory balances

For each inventory item:

```text
ON_HAND = SUM(inventory_movements.quantity_delta)
RESERVED = SUM(active inventory_reservations.quantity)
AVAILABLE_TO_PROMISE = ON_HAND - RESERVED
```

`AVAILABLE_TO_PROMISE` may be negative when accepted future demand relies on replenishment. Negative ATP is a planning warning, not database corruption.

### 7.2 Order totals

```text
line_total = unit_price × quantity
subtotal = SUM(line_total)
total = subtotal + delivery_fee
amount_paid = SUM(confirmed payments) - SUM(confirmed refunds)
receivable = MAX(total - amount_paid, 0)
```

### 7.3 Required invariants

1. Order item quantity is a positive integer.
2. Every non-cancelled order has at least one item.
3. Delivery fulfillment requires a non-empty address.
4. Office pickup must not require an address.
5. Original `promised_ready_date` never changes.
6. `current_ready_date` changes only through a recorded reschedule.
7. A completed packing batch cannot be completed twice.
8. Packing consumption and reservation consumption occur in the same transaction.
9. A cancelled order has no active reservations.
10. A completed order may be unpaid.
11. Payment status does not change fulfillment status.
12. Inventory movements cannot be edited or deleted after posting.
13. Historical order price does not follow current product price.
14. Historical material usage follows the recipe snapshot, not the current recipe.
15. Only founders may access Founder OS or mutate operational data.

**Implementation: ✅ BUILT** — this invariant set is enforced by the pure domain state machine (`app/src/lib/domain/operations.ts`, `DomainError`) and covered by `app/src/lib/domain/domain.test.ts`. Invariant 15 (auth) is not yet enforced anywhere since Founder OS has no access control.
