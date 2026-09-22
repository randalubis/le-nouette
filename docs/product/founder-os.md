# Founder OS and Packing Workflow

[← Product spec hub](../product-spec.md)

**Implementation: 🚧 PARTIAL** — the full Founder OS UI (Beranda, Pesanan Kanban, Stok, Availability, Keuangan) is built at `app/founder/*`. §8.1 Access model is partially built: `/founder/*` is gated by a login screen and signed session cookie, but with a single shared env-var credential rather than per-founder Supabase Auth accounts. See [implementation-status.md](../implementation-status.md).

## 8. Founder OS

### 8.1 Access model

**LOCKED**

- Both founders have identical access and permissions in V1.
- No role-management system is needed in V1.
- The household helper has no account and no system access.
- Founder OS is restricted to two pre-approved individual founder accounts; public signup and shared credentials are not allowed.
- Founder login uses Supabase Auth with individual email/password accounts. The two launch accounts are manually provisioned, public signup is disabled, and access is verified server-side against the approved founder records.

**Implementation: 🚧 PARTIAL** — login screen and session gating exist (`app/src/proxy.ts`), but as a single shared credential, not individual per-founder Supabase Auth accounts as specced above.

### 8.2 Information architecture

Primary navigation:

1. **Beranda** — attention, today's operation, availability snapshot, and compact business health.
2. **Pesanan** — operational Kanban, order detail, history, and search.
3. **Stok** — raw materials, packaging, reservations, packing requirements, receipts, projected shortages, and stock opname.
4. **Keuangan** — payment reconciliation, receivables, revenue, costs, and estimated gross profit.

**ASSUMPTION:** Availability Calendar and Pause Orders may live within Beranda and/or Pengaturan, but must remain easy to reach.

### 8.3 Beranda

**LOCKED:** Beranda is an action dashboard, not primarily an analytics dashboard. Within five seconds, a founder should understand what requires attention.

Priority content:

- orders needing preparation;
- orders ready for handover;
- unpaid/overdue receivables;
- next packing batch;
- material shortages or restock deadlines;
- affected orders requiring rescheduling;
- store pause/availability state.

Secondary business summary:

- sales;
- estimated gross profit;
- order and unit count;
- receivables;
- inventory health.

Every attention card should deep-link to the relevant filtered work list.

### 8.4 Mobile order Kanban

**LOCKED:** The operational order states are:

```text
NEEDS_PREPARATION → READY_FOR_HANDOVER → COMPLETED
                                  ↘ CANCELLED when applicable
```

Canonical Bahasa labels:

- **Perlu Disiapkan**
- **Siap Diserahkan**
- **Selesai**

Rules:

- An accepted customer order immediately enters **Perlu Disiapkan**; there is no manual "approve new order" stage.
- "Baru" may exist as an unread badge, never as a fulfillment state.
- On mobile, states appear as horizontally selectable tabs with vertical order cards beneath, rather than squeezed side-by-side columns.
- Cards show order number, customer, concise item quantities, fulfillment location/date, fulfillment status, and separate payment status.
- Primary state changes use explicit buttons such as **Tandai Siap Diserahkan** and **Tandai Selesai**.
- Swipe-to-change-status is not a V1 primary action because accidental transitions have operational consequences.

### 8.5 Independent payment state

**LOCKED:** Payment status and fulfillment status are independent dimensions.

```text
payment_status = UNPAID | PAID | REFUNDED
```

Therefore, `COMPLETED + UNPAID` is valid and represents a receivable. Completed-but-unpaid orders leave the active fulfillment board but remain visible as required attention in Beranda and Keuangan.

---

## 9. Packing workflow

### 9.1 Real-world workflow

**LOCKED**

1. Customer orders are accepted into the system.
2. The system groups demand by promised ready date.
3. Founder OS aggregates required units by SKU and calculates the bill of materials.
4. A founder communicates the simple quantities to the helper verbally or through normal WhatsApp.
5. The helper repacks, weighs, seals, applies brand stickers and expiration labels, and arranges finished orders for transport.
6. A founder confirms **Packing Selesai** after the helper reports completion.
7. The relevant orders move from **Perlu Disiapkan** to **Siap Diserahkan**.
8. Founders transport office orders during their normal commute or arrange customer-paid external delivery.
9. Handover marks the order **Selesai**; payment may remain unpaid independently.

**Implementation: 🚧 PARTIAL** — step 8's "allocate from Product Ready to Sell first" behavior (§10.1) is explicitly not built; every reservation currently draws straight from raw materials (`app/src/lib/domain/operations.ts:100`). See [implementation-status.md](../implementation-status.md).

### 9.2 Packing batch behavior

**LOCKED:** Packing batches arise automatically from orders sharing a promised ready date. Founders do not need to create batches manually.

A packing summary should show:

- promised ready date;
- number of orders;
- quantity of Milieu and Grande;
- calculated cheese requirement;
- packaging requirement for all tracked components;
- available inventory and any shortage;
- affected order detail when needed.

**LOCKED:** **Packing Selesai** confirms the entire date-based batch. If any required quantity remains unpacked, the batch stays open and none of its included orders move automatically to **Siap Diserahkan**. Partial batch completion and partial material allocation are excluded from V1.

### 9.3 Capacity context

**LOCKED:** The helper typically packs at night and historically spends about 5–6 hours on a batch around 40–50 supplier packs/products, including weighing, repacking, sealing, labeling, and boxing.

**ASSUMPTION:** Packing capacity is currently manageable but should be observed as volume grows. The calendar may later need daily order caps or a `LIMITED` state.
