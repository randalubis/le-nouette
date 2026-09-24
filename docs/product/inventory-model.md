# Inventory Model

[← Product spec hub](../product-spec.md)

**Implementation: ✅ BUILT** — reservation/consumption/opname math and the Product Ready to Sell tier (recordExtraPacked, adjustReady, readyBalances, FIFO allocation in createOrder, reversal on cancelOrder) are built and tested. See [implementation-status.md](../implementation-status.md) for detailed evidence and test sections §19.8 (items 47–50). Quantity-reduction reversal on editOrder is deferred.

## 10. Inventory model

### 10.1 Inventory philosophy

**LOCKED**

- Inventory is primarily **raw materials and packaging**, with a minimal **Product Ready to Sell** ledger for accidental finished-product extras.
- Le Nouette is predominantly make-to-order.
- The core flow is: **supplier receipt → reservation → packing consumption → finished customer orders**.
- Inventory movements are the source of truth; do not store an unexplained mutable "current stock" balance as the authoritative record.
- Reservations do not reduce physical on-hand inventory.
- Packing completion converts reservations into actual consumption.
- Confirmed packing-batch quantities remain exact. Accidental finished Milieu jars or Grande pouches are recorded separately rather than added to the confirmed batch.

### 10.2 Operationally tracked items in V1

| Item | Canonical unit | Purchase-entry convenience |
|---|---:|---|
| Raw cheese sticks | gram | Supplier pack count × 225 g, or actual grams |
| 125 g plastic jar | piece | Individually purchasable; normally at least 30 per order |
| 225 g plastic pouch | piece | Bundles × 100 pouches |
| Square sticker | piece | Sheets × 15 stickers |
| Round sticker | piece | Sheets × 18 stickers |
| Jar seal | piece | Packages × 50 sheets; one sheet = one seal |

Product Ready to Sell tracks finished units under the existing **Milieu** and **Grande** SKUs only; accidental extras never create another SKU. Recording an accidental extra consumes its recipe components and adds the finished unit in one auditable action. It is not a target-stock or speculative production plan.

When a new order contains a matching SKU, allocate the oldest Product Ready to Sell units first. Reserve raw materials and add packing demand only for the remaining quantity. A fully covered order is already packed; a partially covered order remains in preparation only for its uncovered units. Cancellation or quantity reduction returns allocated ready units to available Product Ready to Sell stock through an auditable reversal.

**LOCKED:** Expiration labels are excluded from V1 operational counts but remain in COGS.

### 10.3 Raw cheese units

**LOCKED**

- Canonical internal unit: **grams**.
- Canonical calculation precision: **0.01 g** for reservations, movements, consumption, and balances.
- One supplier pack: **225 g**.
- Founder OS may accept supplier packs or an actual weight and translate automatically.
- Display stock in human-friendly kilograms, whole-gram summaries, and approximate supplier packs while retaining the unrounded 0.01 g value for calculations and detailed history.
- Stock opname may accept either pack count or actual weight; collecting both is unnecessary in V1.

### 10.4 Reservation and availability

For every tracked item:

```text
AVAILABLE_TO_PROMISE = ON_HAND - RESERVED
```

**LOCKED**

- Order acceptance creates reservations according to the SKU bill of materials.
- `ON_HAND` remains unchanged when the order is placed.
- `RESERVED` increases when the order is committed.
- When packing completes, `ON_HAND` decreases and the corresponding `RESERVED` amount is released.
- Cancelling or changing an unconsumed order releases or recalculates reservations.
- Packing summaries must show both gross stock and the balance remaining after active demand.

Example for 2 Milieu + 1 Grande:

```text
Raw cheese       475 g
Plastic jars       2
Plastic pouch      1
Square stickers    3
Round stickers     2
Jar seals          2
```

Example for 10 Milieu + 5 Grande:

```text
Raw cheese       2,375 g
Plastic jars          10
Plastic pouches         5
Square stickers        15
Round stickers         10
Jar seals              10
```

### 10.5 Consumption

**LOCKED** (Superseded 24 Sep 2026 — see Changelog 0.3.1)

- ~~Milieu consumption uses 131.58 g per unit under the current 95% yield assumption.~~
- ~~The 125 g sellable portion becomes the customer product; approximately 6.58 g leaves commercial inventory as `QUALITY_SELECTION`.~~

**LOCKED** (Current as of 24 Sep 2026)

- `PACKING_COMPLETE` is the event that consumes reserved raw material and packaging.
- Milieu consumption uses exactly **125 g per unit** (pooled-stock yield; 5 supplier packs yield 9 jars).
- Grande consumes exactly 225 g per unit under the current direct-transfer rule.

### 10.6 Stock opname and adjustment

**LOCKED**

- Founder OS must support reconciliation between system stock and actual physical stock.
- The founder enters actual grams/pack count for cheese or piece counts for packaging.
- The system shows system balance, actual balance, and variance.
- Confirmation creates an auditable positive or negative `INVENTORY_ADJUSTMENT`; it never rewrites transaction history.
- Suggested reason categories:
  - weighing/count difference;
  - damaged or unsuitable;
  - internal consumption;
  - other, with note.
- Both positive and negative adjustments are valid.
- If an adjustment makes on-hand stock lower than active reservations, preserve the truthful on-hand balance, all reservations, and existing order promises.
- Allow available-to-promise to become negative and show a critical warning with the shortage quantity, earliest affected packing date, and affected orders/batches.
- The system does not cancel, reduce, or reschedule orders automatically. Founders must replenish stock or use the existing manual resolution workflow.

### 10.7 Supplier replenishment

**LOCKED**

- Current supplier price: **Rp37,000 per 225 g pack**.
- Normal lead time is approximately 1–2 business days, with delivery from the nearby production site taking about 1–2 hours once ready.
- Normal supply is often available within hours, but supplier kitchen capacity becomes unpredictable during peaks such as Lebaran and Christmas.
- In peak periods, historical fulfillment may be limited to 50–80% of the founders' requested supply.
- The founders deliberately buy approximately **1.5×–2× demand** or in batches such as 50/100 supplier packs to maintain buffer stock.
- Supplier-stated remaining shelf life is approximately three months at purchase; Le Nouette normally sells stock within one month.
- Customer packaging displays the applicable one-month expiry date.
- **Expiry is calculated from the physical packing date**, not the order, promised-ready, dispatch, pickup, or payment date. Under the current convention, the displayed expiry date is one calendar month after packing.
- Product Ready to Sell allocation uses the oldest unexpired matching unit first. Expired units are never allocated to customer orders and require a founder-recorded adjustment or internal-consumption resolution.

Stock receipt should capture:

```text
supplier_pack_quantity
grams_per_pack = 225
price_per_pack
supplier_delivery_cost
received_at
```

The system calculates total grams and records actual acquisition cost by receipt batch so later supplier price changes do not rewrite historical COGS.

### 10.8 Shortage behavior

**LOCKED:** Insufficient physical stock should not automatically reject an order when replenishment can occur before the promised packing date. Inventory is a planning system as well as a stock counter.

Founder OS should show:

- projected shortage quantity;
- date by which restocking is needed;
- required components;
- a practical replenishment recommendation.

**LOCKED:** Reorder thresholds are founder-configurable warning levels only. Crossing a threshold or detecting a projected reservation shortage creates a visible Founder OS reminder and suggested purchase quantity. The system never creates, sends, or places a supplier order automatically; a founder decides whether and when to purchase.

**LOCKED:** Purchase recommendations round upward to the next complete configured supplier unit so the suggestion always covers the shortage. Raw cheese rounds to 225 g packs, square stickers to 15-sticker sheets, and round stickers to 18-sticker sheets. Jars are individually purchasable, but the recommendation has a practical minimum of 30 jars. Pouches round upward to bundles of 100. Jar seals round upward to packages of 50 sheets, with one sheet treated as one seal consumed per jar.

Initial V1 warning thresholds:

| Inventory item | Warning threshold |
|---|---:|
| Raw cheese | 10 supplier packs = 2,250 g |
| Jars | 10 pieces |
| Pouches | 10 pieces |
| Square stickers | 20 pieces |
| Round stickers | 10 pieces |
| Jar seals | 10 pieces |

Either founder may change these planning values later without changing historical inventory movements or reservations.

Stop accepting a SKU only when it is explicitly unavailable, the supplier is unreliable/unavailable, or the fulfillment calendar leaves insufficient procurement time.
