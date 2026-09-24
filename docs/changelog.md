# Change Log

[← Product spec hub](./product-spec.md) · [← Technical spec hub](./technical-spec.md)

Merged, deduplicated history from the former `le-nouette-product-operating-specification.md` (§18) and `le-nouette-v1-technical-specification.md` (§23), which tracked the same dated decisions from two angles. Entries below combine both perspectives into one line per decision where they described the same change.

### 0.3.1 — 24 September 2026

- **Recipe change:** Milieu cheese requirement reversed to **exactly 125 g per jar**, replacing the previous 95%-yield rule (131.58 g). Rationale: raw cheese is one pooled stock; 5 supplier packs (1,125 g) now yield exactly 9 Milieu jars. No remainder is modeled or tracked. All affected doc sections updated (products-and-economics, inventory-model, scope-and-decisions, workflows, architecture, acceptance-tests, data-model); COGS estimates recalculated.
- Removed 'Lihat di Founder OS' link from the buyer success screen; order confirmation remains actionable through Founder OS independently.

### 0.3.0 — 24 September 2026

- Implemented the Product Ready to Sell inventory tier (§10.1–10.2, §6.14): recordExtraPacked consumes recipe components atomically and adds finished units to the ready ledger; new orders allocate the oldest unexpired units first (FIFO) before reserving raw materials; fully covered orders are ready today and can be dispatched same day; cancellation reverses allocations via append-only ledger (§19.8 items 47–48, 48b–48c, 50); one-calendar-month expiry from Jakarta packing date. Founder OS has a new 'Produk Siap Dijual' (Ready to Sell) card showing available and expired unit counts with write-off controls per source.
- Added CSV and XLSX business-data export (§17.1) with authenticated 'Unduh Data Bisnis' (Download Business Data) menu in Founder OS. Supports 9 datasets: Orders, Order Items, Customers, Payments, Inventory Movements, Inventory Balances, Ready Product Movements, Ready Product Balances, Availability Calendar. All-history mode is built; optional date-range filtering is deferred. CSV cells with formula-trigger characters and phone columns are apostrophe-prefixed for Excel safety.
- Added share-invite button ('Ajak teman'/'Invite friends') on the storefront success screen; uses navigator.share with wa.me fallback and plain origin link, no referral parameters (referral capture remains backlog).
- Fixed Supabase project reference in documentation and deployment: DATABASE_URL points to project `xvbloiuwedrpcrjjusky` (ordering-system-sg, ap-southeast-1), not the previously documented `birojajosbxwkrxzepar`. Production database is very likely the same but not directly confirmed.

### 0.2.1 — 24 September 2026

- Deployed real product photography (Milieu and Grande) and real QRIS artwork image to the storefront.
- Improved hero text contrast with a full-height gradient fade scrim.
- Added real spinbutton semantics and keyboard navigation to the quantity stepper on the storefront (aria-valuenow, ArrowUp/ArrowDown handlers).
- Fixed mobile checkout form submission by explicitly associating the checkout button to the details form via the `form` attribute (Safari/Chrome mobile).
- Gated the Reset-data dev tool to a secret-key querystring parameter (`RESET_TOOL_SECRET` env var), allowing deployment without removing the tool from the live site.
- Added sort (by ready date or created date), fulfillment filtering, and multi-order bulk-dispatch actions to the Pesanan (orders) board.
- Consolidated Founder OS card styling into a shared system and improved mobile topbar overflow handling.
- Applied accessibility improvements across the storefront and Founder OS (semantic HTML, ARIA labels/roles/live regions, keyboard support).

### 0.2.0 — 21 September 2026

- Restructured both living specs from two 1,200–1,600 line monolith files into a hub-and-spoke system: two short hubs (`docs/product-spec.md`, `docs/technical-spec.md`) linking to 19 topic spokes under `docs/product/` and `docs/technical/`.
- Added `docs/implementation-status.md` as a new, separate axis tracking what's actually built versus backlog in the app, distinct from the existing LOCKED/ASSUMPTION/OPEN/DEFERRED and REQUIRED/PROPOSED/OPEN/DEFERRED decision-confidence labels.
- Retired `le-nouette-product-operating-specification.md` and `le-nouette-v1-technical-specification.md`; updated `CLAUDE.md`'s reference accordingly.
- No business or technical decisions changed as part of this restructure — content was reorganized and status-annotated, not rewritten.

### 0.1.39 — 17 September 2026

- Deferred supplier-lot-to-finished-product traceability and FIFO lot allocation.
- Retained supplier receipt date, quantity, and cost plus finished-product packing date and expiry for V1, without linking individual products to cheese lots.

### 0.1.38 — 17 September 2026

- Set jar recommendations to exact pieces with a practical minimum purchase of 30.
- Set pouch recommendations to 100-piece bundles and jar-seal recommendations to 50-sheet packages, treating one sheet as one seal.

### 0.1.37 — 17 September 2026

- Locked the physical packing date as the basis for the one-month customer expiry convention.
- Required Product Ready to Sell allocation to use the oldest unexpired matching units and exclude expired stock.

### 0.1.36 — 17 September 2026

- Confirmed that Product Ready to Sell uses only the existing Milieu and Grande SKUs.
- Locked automatic oldest-first use of accidental finished stock for matching upcoming orders, with residual component reservation/packing demand, fully-ready order handling, and cancellation reversal.

### 0.1.35 — 17 September 2026

- Added a minimal, append-only Product Ready to Sell inventory ledger for accidental extra Milieu and Grande units.
- Kept confirmed packing batches exact and required component consumption plus finished-unit creation to be recorded atomically and separately.

### 0.1.34 — 17 September 2026

- Locked stock-opname handling when physical stock falls below active reservations.
- Preserved actual balance, reservations, and promises while requiring a critical shortage warning and founder-led replenishment or resolution.

### 0.1.33 — 17 September 2026

- Locked upward (ceiling-based) rounding of purchase recommendations to each item's configured supplier increment — complete supplier packs, sheets, or bundles.
- Seeded increments for cheese and sticker sheets, with temporary one-piece increments for jars, pouches, and seals until bundle sizes were confirmed.

### 0.1.32 — 17 September 2026

- Set initial low-stock warnings at 10 cheese packs (2,250.00 g), 10 jars, 10 pouches, 20 square stickers, 10 round stickers, and 10 jar seals.
- Kept thresholds founder-editable and non-retroactive.

### 0.1.31 — 17 September 2026

- Locked reorder thresholds and purchase increments as founder-configurable advisory values only.
- Explicitly prohibited automatic supplier-order creation or transmission while retaining shortage-based purchase recommendations.

### 0.1.30 — 17 September 2026

- Locked automatic inference of Milieu quality-selection remainder from the fixed 95% V1 yield.
- Excluded per-batch remainder weighing and entry while preserving effective-dated recipe changes for future measured revisions.

### 0.1.29 — 17 September 2026

- Locked raw-cheese reservations, movements, consumption, and balances to 0.01 g precision using database decimal values.
- Defined single-boundary half-up rounding and kept Founder OS displays human-friendly without letting rounded values affect calculations.

### 0.1.28 — 17 September 2026

- Locked `current_ready_date` as the planned courier-dispatch date for external delivery.
- Required completed packing and verified full payment before dispatch, without promising a specific hour; courier booking and dispatch time remain manual.

### 0.1.27 — 17 September 2026

- Locked one shared operational availability calendar for Mandiri and BI office pickup.
- Preserved the two offices as distinct fulfillment choices while deferring office-specific calendar structures and overrides.

### 0.1.26 — 17 September 2026

- Locked planned holidays and blocked dates to keep future ordering open through the normal forward availability search.
- Reserved Pause Orders for an explicit, authenticated founder decision to stop all new-order acceptance.

### 0.1.25 — 17 September 2026

- Defined no-qualifying-earlier-date handling as a manual customer-resolution workflow rather than an automatic fallback.
- Required a recorded later date or cancellation, plus manual refund recording where applicable, before finalizing the calendar block.

### 0.1.24 — 17 September 2026

- Locked calendar-driven rescheduling for existing orders affected by a newly unavailable date.
- Selected the next operational date when within three calendar days; otherwise selected the nearest earlier available operational date.

### 0.1.23 — 17 September 2026

- Locked forward-only scheduling when a new order's calculated date is unavailable.
- Required the search to skip non-operational dates, including weekends, and never promise an earlier date.

### 0.1.22 — 17 September 2026

- Locked Bahasa Indonesia as the canonical interface copy and repository-managed TypeScript dictionaries as the translation source of truth.
- Excluded translation services, a CMS, database translation editing, and runtime machine translation from V1.

### 0.1.21 — 16 September 2026

- Locked Founder OS as online-only for V1.
- Required visible connection errors, authoritative reload after uncertain results, and idempotent retries, while deferring offline storage and synchronization.

### 0.1.20 — 16 September 2026

- Locked an unchecked, explicit opt-in for remembering repeat-customer details on the current device.
- Limited local storage to name, WhatsApp number, and language, and prohibited saving addresses, notes, order contents, and payment information; opting out clears saved identity data.

### 0.1.19 — 16 September 2026

- Locked the V1 payment-evidence record: mandatory verifier and timestamp, with optional transaction reference and note.
- Excluded receipt-image uploads and storage from V1.

### 0.1.18 — 16 September 2026

- Required full payment before any external-delivery order is dispatched, enforced server-side alongside the dispatch timestamp.
- Preserved pay-on-receipt for Mandiri and BI office pickup.

### 0.1.17 — 16 September 2026

- Locked bank transfer, QRIS, and cash as the complete V1 payment-method enum.
- Kept founder verification manual and removed any catch-all payment method.

### 0.1.16 — 16 September 2026

- Locked founder-initiated, prefilled WhatsApp deep links for order confirmation, payment reminder, readiness, and rescheduling.
- Defined language fallback and failure isolation, and deferred WhatsApp Business API automation, webhooks, chatbot behavior, and delivery tracking.

### 0.1.15 — 16 September 2026

- Locked customer-data retention and anonymization rules.
- Added idempotent 90-day purging of delivery addresses and customer notes, 90 days after order completion, while preserving business ledgers, relationships, and reports.

### 0.1.14 — 16 September 2026

- Selected Vercel Hobby for development and non-commercial testing.
- Required Vercel Pro as a mandatory production gate before the first live commercial customer order.

### 0.1.13 — 15 September 2026

- Selected authenticated on-demand XLSX exports as the free-plan V1 portable backup strategy.
- Defined workbook contents, security constraints, all-history/date-range modes, and mandatory pre-migration export; removed reliance on Supabase paid automatic backups.

### 0.1.12 — 15 September 2026

- Selected repository-managed static assets deployed through Vercel with the Next.js application.
- Deferred Supabase Storage and founder-facing upload management.

### 0.1.11 — 15 September 2026

- Replaced automatic Indonesian holiday imports with founder-managed manual holiday entry, removing the holiday-provider dependency.
- Allowed initial batch entry and later individual maintenance while preserving unavailable-by-default behavior and rescheduling safeguards.

### 0.1.10 — 15 September 2026

- Selected Supabase Auth with email/password for Founder OS.
- Required two manually provisioned founder accounts, disabled public signup, password recovery, and server-side founder-authorization mapping.

### 0.1.9 — 15 September 2026

- Selected Drizzle ORM with a server-side PostgreSQL driver for type-safe database access and transactions.
- Required reviewed, version-controlled SQL migrations and prohibited direct production schema pushes.

### 0.1.8 — 15 September 2026

- Selected Supabase PostgreSQL as the managed V1 relational database.
- Kept Supabase authentication and storage as separate follow-up decisions.

### 0.1.7 — 15 September 2026

- Selected Next.js with TypeScript as the single V1 application framework for the storefront, Founder OS, and server-side domain actions.
- Explicitly avoided a separate backend application for V1; left the exact framework version to be pinned at implementation time.

### 0.1.6 — 15 September 2026

- Selected Vercel as the managed hosting and deployment platform for the V1 web application.
- Kept database, authentication, and file storage as separate technology decisions.

### 0.1.5 — 15 September 2026

- Locked Founder OS access to two pre-approved individual accounts with equal permissions, no public signup, and no shared credentials.
- Deferred the exact authentication mechanism until the technology stack was selected.

### 0.1.4 — 15 September 2026 — Superseded by 0.1.11

- Locked automatic import of Indonesian national holidays, unavailable-by-default behavior, and founder overrides.
- Defined availability precedence and added holiday acceptance tests.

### 0.1.3 — 15 September 2026

- Added an optional customer order note to V1 with a hard limit of 180 Unicode characters.
- Clarified that notes are informational only and do not affect scheduling, reservations, inventory consumption, or packing totals.

### 0.1.2 — 15 September 2026

- Locked whole-batch packing completion for V1.
- Excluded partial batch completion and partial material allocation from V1.

### 0.1.1 — 15 September 2026

- Locked the daily order cutoff at 18:00 WIB.
- Clarified that checkout remains open after the cutoff; only the scheduling date advances to the following calendar day.

### 0.1.0 — 14 September 2026

- Created the first consolidated living specification from the Cheese Stick Micro Business conversation, separating locked decisions, current assumptions, open questions, V1 scope, and deferred features.
- Captured the business context, brand system, products, pricing, COGS baseline, storefront, scheduling and holiday rules, availability calendar, Pause Orders, Founder OS, mobile Kanban, payments, packing, inventory, supplier replenishment, and preliminary technical model.
- Created the companion V1 technical specification defining the minimum architecture, relational domain model, ledgers, reservations, packing transactions, scheduling engine, payment workflow, security baseline, reporting definitions, acceptance tests, and phased build order.
- Clarified that square and round stickers are both tracked in V1 inventory, that Milieu's 5% quality-selection remainder is edible and consumed personally, and that Grande uses direct 225 g transfer without the Milieu yield adjustment.
