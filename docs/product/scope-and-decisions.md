# V1 Scope, Deferred Features, and Open Questions

[← Product spec hub](../product-spec.md)

For a build-status view of these items (what's actually shipped vs still backlog), see [implementation-status.md](../implementation-status.md). This section preserves the original decision-confidence record; it does not track build status.

## 13. V1 scope

### 13.1 Customer-facing

- Mobile-first branded storefront.
- Bahasa Indonesia default with ID/EN switch.
- Milieu and Grande quantity selection and total calculation.
- Mandiri office pickup, BI office pickup, and customer-paid delivery.
- Conditional address field.
- Name and WhatsApp capture, with device-level convenience where appropriate.
- Optional order note with a 180-character maximum.
- Authoritative promised-ready-date calculation before submission.
- Order confirmation and order number.
- Pay-on-receipt message and optional static QRIS display.
- Planned closure messaging and Pause Orders behavior.

### 13.2 Founder-facing

- Equal founder access.
- Action-oriented Beranda.
- Mobile Kanban: Perlu Disiapkan, Siap Diserahkan, Selesai.
- Searchable order detail/history.
- Date-based packing summaries and packing-complete action.
- Availability Calendar and affected-order rescheduling workflow.
- Store pause/resume control.
- Payment verification, method capture, paid/unpaid status, and receivables.
- Inventory for raw cheese, jars, pouches, square stickers, round stickers, and seals.
- Reservations, available-to-promise, packing consumption, supplier receipts, shortage projection, and stock opname adjustments.
- Basic sales, COGS, estimated gross profit, order/unit counts, and inventory health.
- Authenticated on-demand comprehensive XLSX business-data export.
- Prefilled founder-initiated WhatsApp messages for confirmation, payment reminder, readiness, and rescheduling.
- Online-only Founder OS with clear connection errors and safe retries; offline operation is not supported in V1.

### 13.3 Operational

- Helper remains outside the system.
- Founders communicate aggregate packing quantities to the helper.
- Minimal Product Ready to Sell inventory tracks accidental extra Milieu and Grande units; active order demand remains the main production driver.
- Maintain historical auditability for inventory, promises, payments, and costs.

---

## 14. Deferred features

The following are deliberately deferred until validated demand or operating scale justifies them:

- native iOS/Android customer app;
- offline Founder OS operation and offline synchronization;
- customer accounts and passwords;
- loyalty points;
- promo-code engine;
- product reviews;
- elaborate CRM;
- WhatsApp chatbot;
- automatic WhatsApp Business API delivery, webhooks, and delivery-status tracking;
- automated bank or QRIS reconciliation;
- mandatory online payment gateway;
- integrated GoSend/Grab delivery APIs;
- automated supplier ordering;
- helper login or packing app;
- founder role/permission tiers;
- swipe as the primary order-state control;
- complex finished-goods inventory;
- planned finished-goods production targets, forecasting, and warehouse allocation;
- supplier-lot-to-finished-product traceability and FIFO lot allocation, unless later required by regulation;
- AI features;
- daily order caps and `LIMITED` calendar state;
- loyalty/referral rewards;
- smaller office-pantry SKU;
- bundles, gifting packs, and broader food categories;
- final print production files until QR destination and label obligations are validated.

---

## 15. Open questions

### 15.1 Business and pricing

1. Should Grande remain Rp70,000 after the initial always-on measurement period, or move to Rp75,000?
2. What minimum sample period/order volume is sufficient for the first pricing review?
3. What safety-stock target should be held in normal periods and before Lebaran/Christmas?
4. How should the business allocate and report order-level plastic bags in profitability views?

### 15.2 Product and packaging

5. What exact regulatory/label content is required for the jar and pouch?
6. What are the final dimensions, artwork, typography, color values, and print specifications for the Nouette Knot system?

---

## 16. Locked decisions summary

This section is a compact index; detailed rules in the topic spokes above remain authoritative.

- One cheese-stick flavor; Milieu 125 g jar at Rp50,000 and Grande 225 g pouch at Rp70,000 currently.
- Accessible-premium, family-made, indulgent brand built around connection and togetherness.
- Nouette Knot master symbol; burgundy and warm cream core palette; flexible seasonal palettes.
- Round sticker is brand-only; square/portrait sticker is product-specific; no separate back sticker.
- Bahasa Indonesia storefront by default with ID/EN switch.
- Mobile web, no mandatory account or upfront payment.
- Fulfillment options are Mandiri office pickup, BI office pickup, and customer-paid delivery.
- Mandiri and BI share one operational availability calendar in V1; no office-specific calendar is maintained.
- Weekday mapping: Mon→Wed, Tue→Thu, Wed→Fri, Thu–Sun→Mon.
- Daily scheduling cutoff is 18:00 WIB; orders at or after the cutoff use the following calendar day for scheduling.
- A midweek holiday does not add a day unless the intended fulfillment date itself is unavailable.
- Founder Availability Calendar plus emergency Pause Orders.
- Planned closures keep future ordering open; only an explicit Pause Orders action stops all new orders.
- Existing commitments must be resolved before blocking their date: move later when the next operational date is within three calendar days; otherwise move to the nearest earlier available date.
- When no qualifying earlier date exists, the system requires a manually recorded customer-agreed later date or cancellation before the block can proceed.
- Equal access for both founders; helper has no access.
- Kanban states: Perlu Disiapkan → Siap Diserahkan → Selesai.
- Payment status is independent; completed and unpaid is a valid receivable.
- V1 accepts bank transfer, QRIS, and cash, with payment confirmation performed manually by a founder.
- External delivery requires full payment before dispatch; office pickup may remain pay-on-receipt.
- External delivery is planned for `current_ready_date` after packing and payment verification, without a guaranteed dispatch hour.
- Confirmed payments record the verifying founder and timestamp; references and notes are optional, and receipt images are not stored.
- Remembering customer details is explicit opt-in and device-local; only name, WhatsApp number, and language are eligible for storage.
- Founder OS requires an internet connection in V1; interrupted actions fail visibly and can be retried safely.
- Bahasa Indonesia is the canonical interface copy, with English maintained in repository TypeScript dictionaries and no translation service, CMS, or database editor.
- Demand is aggregated into date-based packing summaries.
- Packing completion is whole-batch only in V1; incomplete batches remain open.
- Inventory tracks raw cheese in grams plus jars, pouches, square stickers, round stickers, and jar seals.
- Raw-cheese reservations, movements, consumption, and balances use 0.01 g precision internally.
- One supplier pack equals 225 g.
- Available-to-promise equals on hand minus reserved.
- Order placement reserves; packing completion consumes.
- Stock opname creates auditable adjustments, not overwritten balances.
- Stock opname below reserved demand preserves physical truth, reservations, and promises while raising a critical founder warning for replenishment or manual resolution.
- Accidental extra Milieu and Grande units enter a separate Product Ready to Sell ledger; confirmed packing-batch quantities remain exact.
- Product Ready to Sell uses only the Milieu and Grande SKUs and automatically fulfills matching new-order quantities oldest-first before raw materials are reserved.
- Customer expiry is one calendar month from packing date; ready stock allocates oldest unexpired units first.
- Milieu consumes exactly 125 g per sellable jar (pooled-stock yield: 5 supplier packs yield 9 jars).
- Grande transfers 225 g directly with no 5% yield adjustment.
- Supplier replenishment is normally 1–2 business days but may be capacity constrained during peak seasons.
- Insufficient physical stock prompts replenishment planning rather than automatic rejection when the promise can still be met.

---

## 17. Current assumptions summary

- The current COGS estimates are fit for planning but require validation against actual purchase batches and operating data.
- Keep Grande at Rp70,000 for the initial always-on period, then consider Rp75,000 using measured demand and margin.
- Implement the proposed entities and status transitions as the technical baseline.
- Add optional referral capture only if it does not create meaningful checkout friction.
