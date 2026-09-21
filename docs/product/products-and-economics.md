# Products, Pricing, and Economics

[← Product spec hub](../product-spec.md)

## 4. Products, pricing, and recipes

### 4.1 Product catalog

| Product | Sellable weight | Package | Current price | Role |
|---|---:|---|---:|---|
| **Milieu** | 125 g | Clear plastic jar | **Rp50,000** | Hero SKU and current bestseller |
| **Grande** | 225 g | Plastic pouch | **Rp70,000** | Larger, better-value format |

**LOCKED:** Keep the names **Milieu** and **Grande**, but always display the weight and package type immediately beside or beneath the name so the customer does not need to interpret the French naming.

**LOCKED:** Rp50,000 and Rp70,000 are the current selling prices. The old Rp45,000 Milieu price shown on the launch flyer was a 10% launch promotion and is not the current standard price.

**ASSUMPTION:** Keep both current prices during the initial always-on launch and observe 1–2 months of real transaction data before deciding whether to increase Grande to Rp75,000.

**Implementation: ✅ BUILT** — catalog is implemented in `app/src/lib/domain/catalog.ts` (static, not yet DB-backed). See [implementation-status.md](../implementation-status.md).

### 4.2 Bill of materials

| Inventory item | Canonical unit | Milieu 125 g | Grande 225 g |
|---|---:|---:|---:|
| Raw cheese sticks | gram | **131.58 g theoretical input** | **225 g** |
| Plastic jar | piece | 1 | 0 |
| Plastic pouch | piece | 0 | 1 |
| Square sticker | piece | 1 | 1 |
| Round sticker | piece | 1 | 0 |
| Jar seal | piece | 1 | 0 |
| Expiration label | piece | 1 for costing | 1 for costing |

**LOCKED:** Expiration labels remain part of COGS but are not tracked as operational inventory in V1 because they are inexpensive, purchased in very large quantities, and unlikely to constrain fulfillment.

### 4.3 Yield rules

**LOCKED**

- **Milieu:** 95% assumed packing yield for commercial presentation.
- Formula: `125 g ÷ 0.95 = 131.5789 g`, rounded for planning to **131.58 g** raw input.
- The approximate **6.58 g** difference per Milieu is a **quality-selection / packing yield remainder**. It consists of broken or unsuitable-length sticks that are excluded to preserve a consistent premium presentation.
- The remainder is still edible and is consumed personally; it is not discarded and is not returned to commercial inventory.
- Use movement/reason code `QUALITY_SELECTION` where the implementation records the yield component separately.
- **Grande:** direct transfer with no 5% yield adjustment; **225 g input → 225 g sold**.

**LOCKED FOR V1:** The system infers Milieu quality-selection remainder from a fixed 95% yield and consumes 131.58 g per sellable jar. Founders do not weigh or enter the remainder for each packing batch. A later measured yield change must create a new effective-dated recipe and must not rewrite historical batches.

---

## 5. Unit economics and COGS

### 5.1 Current costing assumptions

| Component | Basis | Working unit cost |
|---|---|---:|
| Supplier cheese sticks | Rp37,000 per 225 g supplier pack | Rp164.44/g before inbound delivery |
| Supplier inbound delivery | Rp13,000 per 50 supplier packs | Rp260 per supplier pack, about Rp1.16/g |
| Plastic jar | Rp123,000/40 + assumed Rp6,000 non-promo delivery | Rp3,225 each |
| Plastic pouch | Rp114,000/100 + assumed Rp10,000 non-promo delivery | Rp1,240 each |
| Square sticker | Shared invoice allocated per sheet; conservatively rounded | Rp550 each |
| Round sticker | Shared invoice allocated per sheet; conservatively rounded | Rp450 each |
| Expiration label | Rp60,000 landed / 6,000 labels | Rp10 each |
| Jar seal | Rp7,500 / 50 sheets | Rp150 each |
| Packing labor | Rp10,000 / 10 finished products | Rp1,000 per finished product |
| Order-separation plastic bag | Rp15,000 / 100 bags | Rp150 per bag at order level |

Sticker calculation used a conservative no-promo delivery assumption: Rp97,000 printing plus Rp18,000 delivery across 10 square sheets and 5 round sheets. Each square sheet yields 15 stickers; each round sheet yields 18 stickers. The shared cost was provisionally allocated equally per sheet and rounded upward.

### 5.2 Working product economics

| Component | Milieu 125 g | Grande 225 g |
|---|---:|---:|
| Cheese sticks including Milieu yield rule | ~Rp21,640 | Rp37,000 |
| Supplier delivery allocation | ~Rp152 | Rp260 |
| Jar / pouch | Rp3,225 | Rp1,240 |
| Brand sticker(s) | Rp1,000 | Rp550 |
| Expiration label | Rp10 | Rp10 |
| Jar seal | Rp150 | — |
| Packing labor | Rp1,000 | Rp1,000 |
| **Estimated product COGS** | **~Rp27,177** | **~Rp40,060** |
| Selling price | Rp50,000 | Rp70,000 |
| **Estimated gross profit per unit** | **~Rp22,823** | **~Rp29,940** |
| **Estimated gross margin** | **~45.6%** | **~42.8%** |

**ASSUMPTION:** These figures are planning baselines, not audited accounting values. Actual purchase batches and landed costs should eventually drive rolling COGS without modifying historical records.

### 5.3 Costs outside standard product COGS

**LOCKED**

- Plastic shopping/order-separation bags are order-level fulfillment costs because usage varies from approximately one to seven bags per customer order.
- Office delivery has no incremental business cost.
- External delivery cost is paid by the customer.
- QRIS MDR is not included in standard product COGS. The acquirer charges 0.7% only for transactions above Rp500,000, which occur infrequently; record MDR as an actual payment expense when incurred.

### 5.4 Metrics to establish after launch

**ASSUMPTION:** Founder OS should make the following measurable without imposing manual reporting work:

- units sold by month and SKU;
- revenue and gross profit;
- gross margin by SKU;
- jar/pouch sales mix;
- average order value and basket size;
- repeat-purchase rate and purchase frequency;
- receivables and days to payment;
- actual inventory variance and yield;
- referral source when captured;
- supplier stock cost and rolling acquisition cost.

**Implementation: ⏳ BACKLOG** — none of these metrics are instrumented yet; Founder OS's Keuangan screen shows only basic revenue/receivables/payment mix. See [implementation-status.md](../implementation-status.md).

---

## Appendix A — Example material planning

For a packing date with 18 Milieu and 7 Grande:

```text
Milieu cheese requirement = 18 × 131.58 g = 2,368.44 g
Grande cheese requirement = 7 × 225 g    = 1,575.00 g
Total raw cheese          =                3,943.44 g

Plastic jars              = 18
Plastic pouches           = 7
Square stickers           = 25
Round stickers            = 18
Jar seals                 = 18
```

Founder OS should compare every requirement with both `ON_HAND` and `AVAILABLE_TO_PROMISE`, then state whether materials are sufficient and, if not, the shortage and required restock date.
