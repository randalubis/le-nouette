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
- partial packing-batch completion and partial material allocation;
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
