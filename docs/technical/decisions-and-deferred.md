# Build Sequence, Open Decisions, and Deferred Technical Capabilities

[← Technical spec hub](../technical-spec.md)

**Note:** §20's phased build sequence below is the original pre-implementation plan and is now historical — for the actual current build state, see [implementation-status.md](../implementation-status.md), which reflects what's really built versus backlog as of this restructure.

## 20. Build sequence

### Phase 1 — Transactional foundation

- relational schema and migrations;
- founder authentication;
- products and active recipes;
- availability/store status;
- order creation and scheduling tests;
- reservations and inventory ledger.

### Phase 2 — Customer storefront

- Bahasa-first mobile product selection;
- fulfillment and customer form;
- confirmation and optional QRIS display;
- device language/customer convenience;
- server-side pause and availability validation.

### Phase 3 — Founder operations

- action dashboard;
- mobile order tabs and detail;
- packing summary/completion;
- stock receipt and stock opname;
- Product Ready to Sell balance, history, and accidental-extra entry;
- payment capture and receivables.

### Phase 4 — Availability and reporting

- calendar range editing;
- affected-order rescheduling workflow;
- financial/inventory summaries;
- audit/history views;
- prefilled founder-initiated WhatsApp messages.

### Phase 5 — Production readiness

- upgrade the Vercel project from Hobby to Pro before enabling live commercial ordering;
- backup and restore procedure;
- XLSX business-data export and pre-migration export workflow;
- privacy and retention decisions;
- concurrency/idempotency verification;
- mobile/browser accessibility QA;
- production monitoring and error reporting;
- founder operating guide.

Do not begin deferred features until the V1 flow has real orders and measured operational friction.

---

## 21. Open decisions before implementation

### Blocking decisions

No blocking business decisions remain in this section. Implementation may begin once project credentials and the two founder account details are available.

### Non-blocking defaults

The following can start with these defaults and change later:

- weighted-average inventory costing;
- one active packing batch per ready date;
- no customer self-service order editing;
- no daily order caps.

---

## 22. Deferred technical capabilities

- payment-gateway webhooks;
- automated bank/QRIS reconciliation;
- WhatsApp chatbot or conversational ordering;
- WhatsApp Business API automated delivery, webhooks, retries, and delivery-status tracking;
- customer authentication and order history;
- customer self-service edits/cancellations;
- delivery-provider integration;
- supplier purchase orders;
- automatic reorder placement;
- lot-level FIFO and expiry traceability;
- helper accounts;
- granular founder permissions;
- partial packing lines and warehouse picking;
- partial packing-batch completion and partial material allocation (per-order packing is built; see [workflows §9.4](./workflows.md#94-complete-packing));
- per-batch weighing and entry of Milieu quality-selection remainder;
- push notifications;
- offline-first synchronization;
- data warehouse and advanced analytics;
- Supabase Storage and Founder OS asset uploads;
- multi-location stock;
- office-specific availability calendars;
- planned finished-goods targets, forecasting, and warehouse allocation;
- promotion, loyalty, referral-reward, and review engines.
- translation services, CMS integration, database-managed translations, and runtime machine translation;

---

## 23. Open follow-ups from order-flow review (0.15.0)

Found in review of the 0.15.0 per-order packing and unpaid dispatch/complete change. Items marked **CLOSED — BUILT** were fixed in 0.16.0 (delivery timeline, Keuangan split, toolbar). Items marked **OPEN** are not fixed.

Closed in 0.16.0:

- **CLOSED — BUILT — delivery wording after dispatch:** tracking shows "Sedang diantar" and the timeline; the WhatsApp `dispatched` kind replaces "ready" after dispatch ("sedang kami antar"). See [ui-requirements §13.4](./ui-requirements.md#134-customer-convenience-and-privacy).
- **CLOSED — BUILT — Keuangan method share:** three method cards from `percentShares` (totals 100); "—" when nothing is received.
- **CLOSED — BUILT — Keuangan piutang rows:** split into Piutang (completed) and Menunggu pembayaran (in progress), grouped in the list.
- **CLOSED — BUILT — orders toolbar cramped on mobile:** 2x2 status grid and equal-column chips at ≤560px, search and sort on their own row. Reviewer pass 2 checked 320, 600 and 1440 by screenshot; see the OPEN status-grid item below.
- **CLOSED — BUILT — dark tracking total colour:** the total uses the neutral text colour.
- **CLOSED — BUILT — delivery WhatsApp confirmation wording:** unpaid delivery orders say "saat pesanan diterima" (matches ready message).

Still open:

- **OPEN — payment details missing from WhatsApp:** the payment, ready (with balance), dispatched and confirmation messages in `app/src/lib/domain/whatsapp.ts` do not include bank account or QRIS payment details.
- **OPEN — payment policy wording vs LOCKED rule:** customer-facing tracking and WhatsApp for unpaid delivery orders say pay on receipt ("Bayar saat pesanan diterima", "tunai saat pesanan diterima"), but [payments-and-receivables §11.1](../product/payments-and-receivables.md#111-customer-payment-model) is LOCKED that external delivery is paid before dispatch (with a confirmed unpaid dispatch). The founder needs to confirm which rule the wording follows.
- **OPEN — Keuangan hero at 1440px:** the `financeSide` grid has three columns, so the fourth card sits alone on the second row and the left column under Omzet is empty. Fix: four columns, or a 2x2 plus a method strip.
- **OPEN — Keuangan hero values at 320px:** values such as "Rp440.000" overflow the card content box below 360px (not clipped). Fix: smaller hero value size under 360px.
- **OPEN — bottom-nav label at 320px:** "Keuangan" truncates to "Keuang…".
- **OPEN — orders status grid at ≤560px:** the 2x2 grid is uneven because labels differ in length. Cosmetic.
- **OPEN — bulk-dispatch bar not verified:** the bar needs a selection state to be checked in the browser.
- **OPEN — delivery dispatch flow not browser-checked:** "Sedang diantar" is covered by domain tests only, because dispatch is blocked until `current_ready_date`.
