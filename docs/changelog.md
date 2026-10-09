# Change Log

[← Product spec hub](./product-spec.md) · [← Technical spec hub](./technical-spec.md)

Merged, deduplicated history from the former `le-nouette-product-operating-specification.md` (§18) and `le-nouette-v1-technical-specification.md` (§23), which tracked the same dated decisions from two angles. Entries below combine both perspectives into one line per decision where they described the same change.

### 0.20.4 — 9 October 2026

- **Full read-only code audit and docs sync (docs only; no code change):** Audit at HEAD 4192f6c. Checks that passed in the audit run: `tsc --noEmit`, lint, 74 unit tests, `npm run build`, and `npm run e2e` (26/26 on local `le_nouette_e2e`). Docs corrected to match: the 0.17.0 phase 1 open items (Tandai Lunas primary fixed in 0.20.1; stacked mobile order buttons partial; attention-list icon chips open; one-row mobile filters superseded by the 0.16.0 grid), stale paths and line references in the status doc, Backlog rows that were built or partial, the founder action count in [security](./technical/security.md) (15 to 22), and the §15.1 target-vs-built wording. Integration test coverage and its shared-database warning are now stated accurately in [dev-workflow](./technical/dev-workflow.md). New prioritized follow-up list in [implementation-status](./implementation-status.md#prioritized-open-follow-ups). Migrations 0005 and 0006 are verified applied to production (Supabase project `xvbloiuwedrpcrjjusky`, read-only `list_migrations` on 9 October 2026, all 7 migrations listed), which closes the former High item. Code findings (0 high, 16 medium, rest low) are tracked there and are not fixed in this entry.

### 0.20.3 — 9 October 2026

- **Founder OS redesign reviewer pass on phases 2 to 4, and fixes:** Reviewer pass 1 scored 7.5/10; pass 2 scored 6/10 and found regressions. The fixes below were made after pass 2 and verified by engineer measurements and screenshots only; no third reviewer pass was run.
  - **F1 Invoice list (mobile and desktop):** on mobile/card layout, "Tandai Lunas" is the single primary action, Unduh and Edit share a compact row and Hapus is quiet at the end (`invoice-row-actions.tsx`, `invoice.module.css`). The card layout now applies up to 900px (was 600px) so the Aksi column is never clipped at 700 to 900px. Desktop table (901px and up) buttons are a compact 36px in one row; 44px applies only in the card layout.
  - **F2 Pengaturan contact fields:** `.contactRow` shows 3 columns on desktop and 1 column at 600px and below.
  - **F3 Checkboxes:** "Hapus logo" (Pengaturan) and the wizard "Perbarui info perusahaan" checkbox use the custom `.check` pattern: the real input is stretched over a row of at least 44px at opacity 0, and an `aria-hidden` `.box` span draws the 22px box. The `.box` span is required next to the input wherever `.check` is used.
  - **F4 Kalender "Tutup tanggal" form:** widths of `.closeField` and `.closeBtn` corrected (`founder.module.css`).
  - **F5 Locked invoice hint:** a lock icon with "Terkunci"; the hint has a `title` and visually hidden text linked to the disabled Edit and Hapus buttons via `aria-describedby`.
  - **F6 Wizard step pills:** on mobile they show "n. Name" with an `aria-label`.
  - **F9 Playwright audit:** `.claude/playwright/audit.js` now also visits invoices, invoices/new, invoice edit and settings; `.claude/playwright/README.md` updated.
  - **Build lesson:** a stray `}` in CSS passed dev and e2e but failed `npm run build`. Always run `npm run build` after CSS edits.
  - **Verified:** `tsc`, lint, `npm test` (74 passing), `npm run build`, `npm run e2e` 26/26 on local `le_nouette_e2e`.
  - **Still open (not fixed):** stock and history timestamps use the raw id-ID format; Keuangan on mobile looks sparse with Rp0 test data (judge with real data); Pengaturan desktop form leaves an empty strip at the right; the "4. Pratinjau" step pill is tight at 390px; dark theme of invoice list, Pengaturan and Kalender, and wizard desktop steps 1, 2 and 4, were not viewed by the reviewer; sidebar hover and active `rgba` values should become tokens; the `--alert-*` and `--danger-*` token families overlap (one canonical family should be chosen); invoice edit page PDF content not rendered or checked.
  - **Design system:** [founder-os-design-system.md](./technical/founder-os-design-system.md) gains the `.check`/`.box` pattern, the 900px invoice card layout and the audit page coverage.

### 0.20.2 — 9 October 2026

- **Founder OS Design System documented:** new `docs/technical/founder-os-design-system.md` captures the Cool Slate tokens (light and dark), typography, shape and spacing, responsive rules, every shared component and pattern, accessibility baseline, per-screen hierarchy and a new-page checklist. `CLAUDE.md`, `AGENTS.md` (new "Design system" section), the engineer, designer and reviewer agent files, `ui-requirements.md` and the technical spec hub now require developers to read it before building any Founder page or feature. Documentation only; no code change.

### 0.20.1 — 9 October 2026

- **Founder OS redesign review pass: Beranda now leads with the packing batch panel (attention list second); on unpaid orders that are ready for handover the primary button is "Tandai Lunas" and dispatch/complete become secondary; tighter mobile order cards; "Ubah stok" is an outlined pill and text links have a 44px minimum width; slimmer desktop header (76px, 22px title); lighter dark-mode muted text and brighter borders; invoice list status chip height on mobile.** Files: `founder.module.css`, `invoice.module.css`, `order-board.tsx`, `packing-panel.tsx`. Verified: `tsc`, lint, Playwright audit at 390/1440 light and dark on all Founder pages (clean). Not changed: Pengaturan stays reachable via the mobile avatar menu; timestamps, native date and file inputs are pre-existing.

### 0.20.0 — 9 October 2026

- **Founder OS "Cool Slate" redesign, phase 4: Pengaturan and Login (complete):** The founder login page carries the same light and dark Cool Slate tokens, scoped to its own `.page` wrapper in `app/src/app/login/login.module.css` (it sits outside the Founder shell): 24px title, 48px slate button, soft error banner. Pengaturan fields gain `[placeholder]` hints, an "LN" initials circle shows when no logo is uploaded, and the file input has a styled button. With this the redesign covers every Founder screen. Presentation only, no data or behavior change, no migration.

### 0.19.0 — 9 October 2026

- **Founder OS "Cool Slate" redesign, phase 3: Kalender and Invoice (partial):** Kalender gains a month calendar (`MonthCalendar` in `founder-boards.tsx`): Monday-first grid with previous/next month, closed dates filled, today ringed, the date picked for closing dashed; tapping a day (today or later) fills the "Tutup tanggal" date. Status toko shows a Buka/Dijeda chip, and the affected-orders notice is a warning box. Invoice list, wizard and settings forms use the Cool Slate tokens: 18px step fieldsets, 12px controls with the `--control` border, pill stepper with `--on-primary` active label, rounded table wrapper, and on mobile each invoice row is its own rounded card. Disabled invoice buttons no longer use opacity (solid sunken style per the UI baseline). Presentation only, no data or behavior change, no migration.

### 0.18.0 — 9 October 2026

- **Founder OS "Cool Slate" redesign, phase 2: Stok and Keuangan (partial):** Stok cards gain a threshold bar (fill = available against twice the threshold, tick at the threshold, dark for low and neutral for safe), 22px radius, soft red border for low items, 32px value; "Catat Produk Ekstra" is now a dark `ActionCard tone="dark"`. Keuangan: the payment-method share moves out of the hero into its own "Porsi metode pembayaran" panel with a stacked bar and legend (colors from `--chart-1..3`, light and dark); hero shows Omzet at 52px with four sub-tiles, and fixes the oversized nested hero tiles that phase 1 introduced (`.financeHero [data-variant="hero"]` resets). Presentation only, no data or behavior change, no migration.

### 0.17.0 — 9 October 2026

- **Founder OS "Cool Slate" redesign, phase 1 (partial):** Founder shell restyled to a calm slate palette (dark slate sidebar with sage active indicator and user card, white topbar, 22px cards, mobile bottom-nav active chip, outlined pill header actions), light and dark. The palette is scoped to the `.app` wrapper in `app/src/components/founder.module.css` by overriding the global tokens (`--canvas`, `--surface`, `--ink`, `--muted`, `--line`, `--wine*`, `--alert-*`, plus new `--on-primary`, `--primary-hover`, `--control`, `--chip`, `--side-*`, `--hero-*`), so the storefront keeps its wine palette and every founder screen (and shared `.btn`/`.status`/ui cards) picks it up. Beranda: "Batch packing berikutnya" is now the first KPI tile as a dark hero (`MetricCard variant="hero"`, full width on mobile, alert tile full width on mobile). Pesanan cards: 18px radius, larger Total. Design source: Design artifact "Founder OS Redesign" (Cool Slate). Stok, Keuangan, Kalender, Invoice, Pengaturan and Login are recolored through the tokens only; their layout redesign is phases 2 to 4. No data or behavior change, no migration.

### 0.16.0 — 8 October 2026

- **Delivery tracking timeline, Keuangan consistency, orders toolbar (partial):** Customer tracking for delivery orders shows a four-step timeline (Pesanan diterima, Dikemas, Sedang diantar, Selesai) with the date and time of each completed step in Asia/Jakarta, and a single "Dibatalkan {date}" line for cancelled orders; `createdAt` is added to the customer-safe view. Ready delivery orders read "Siap dikirim"; unpaid delivery orders show "Bayar saat pesanan diterima" until completion (the earlier pay-before-delivery note was removed). The dark-mode tracking total uses the neutral text colour. WhatsApp gains a `dispatched` message ("sedang kami antar", with remaining-payment line when a balance is due), and delivery "ready" reads "akan segera kami antar". The unpaid delivery confirmation says "tunai saat pesanan diterima". Keuangan splits receivables into Piutang (completed, unpaid) and Menunggu pembayaran (in progress, unpaid); the hero cards and Beranda "Belum dibayar" hint reflect this. Payment method shares are three cards (Transfer, QRIS, Tunai) that show "—" when nothing is received and total 100 under largest-remainder rounding. The "Pesanan & piutang" list is grouped with a badge per group, and its header reads "Pesanan & pembayaran". The orders toolbar is reflowed at small widths, with a 2x2 status grid at ≤560px and search and sort on their own row. Unit tests 74 passing; e2e 26 passing on local `le_nouette_e2e`. No migration. Still open: WhatsApp payment details, payment-policy wording against the LOCKED pay-before-dispatch rule, the Keuangan hero at 1440 and 320, the bottom-nav label at 320, and the bulk-dispatch bar selection state. See [technical/ui-requirements.md](./technical/ui-requirements.md) §12.5 and §13.4, [product/storefront-experience.md](./product/storefront-experience.md) §6.2, [technical/notifications-and-reporting.md](./technical/notifications-and-reporting.md) §16 and §17, [technical/acceptance-tests.md](./technical/acceptance-tests.md) §19.2, §19.5, §19.9, and [technical/decisions-and-deferred.md](./technical/decisions-and-deferred.md) §23.

### 0.15.0 — 8 October 2026

- **Per-order Selesai Packing and unpaid dispatch/complete (Founder OS, partial):** A Perlu Disiapkan order can be marked packed on its own card ("Selesai Packing"). It consumes only that order's reservations and moves to Siap Diserahkan; the date batch button stays and skips already-packed orders. Unpaid external-delivery orders can be dispatched after a confirm that shows the remaining amount; the server rejects an unpaid dispatch unless `allowUnpaid` is set ("Pengiriman perlu lunas terlebih dahulu."). The unpaid remainder becomes a receivable. Completing an unpaid order (pickup or dispatched delivery) is allowed and leaves the remainder in Piutang. Bulk dispatch stays atomic. Audit markers: `ORDER_MARKED_READY`, `ORDER_DISPATCHED:UNPAID`, `ORDERS_DISPATCHED:UNPAID=<ids>`, `ORDER_COMPLETED:UNPAID`. Cancelling a packed order warns that consumed material is not restored. Customer tracking shows "Estimasi siap" only while Perlu Disiapkan, and a payment line for COMPLETED unpaid orders (none for cancelled). WhatsApp gains a payment-reminder message for completed unpaid orders, and the ready message adds the unpaid balance with a how-to-pay line. Mobile bulk-dispatch bar is `position: fixed` above the bottom nav at ≤900px. Keuangan Pesanan & piutang rows show Lunas/Piutang badges on mobile; hero hint "Sisa tagihan semua pesanan aktif". Open follow-ups from review are in [technical/decisions-and-deferred.md](./technical/decisions-and-deferred.md) §23. Founder command server actions now 22 (adds `markOrderReadyAction`). No migration. Pending: Playwright 390/1440 light and dark reviewer pass; build and `npm run e2e` re-run after the last storefront edit. See [product/founder-os.md](./product/founder-os.md) §9.2, [technical/workflows.md](./technical/workflows.md) §9.4, §9.5, §11.4 and [technical/acceptance-tests.md](./technical/acceptance-tests.md) §19.3, §19.5.

### 0.14.0 — 8 October 2026

- **Invoice edit, mark paid, delete (Founder OS, partial):** Unpaid invoices can be edited (number kept, totals recomputed, optional company refresh). Tandai Lunas records the linked order's remaining payment and flags the invoice; Batalkan Lunas reverses only that payment and is blocked once the order is dispatched. Delete is unpaid-only and never touches the order. Invoice numbers now come from `invoice_counters`, so deleted numbers are never reused. Migration `app/drizzle/0006_invoice_payment.sql` (hand-written, journal idx 6, RLS on the new table; seeded from existing invoices). Founder command server actions now 21. Pending: browser check at 390/1440 light and dark, reviewer pass 2, `npm run e2e`. Migration 0006 is applied to production (verified 9 October 2026 via Supabase `list_migrations`). See [technical/notifications-and-reporting.md](./technical/notifications-and-reporting.md) §17.2, [product/payments-and-receivables.md](./product/payments-and-receivables.md) §11.4, [technical/data-model.md](./technical/data-model.md) §6.20–6.21.

### 0.13.1 — 8 October 2026

- **Invoice PDF line-break fix:** Multiline fields (company address, buyer address, Keterangan, invoice notes) printed a stray "Ð" at each line break. Browser textareas submit CRLF, and pdfkit's Helvetica draws a lone `\r` as "Ð". New `normalizeNewlines()` in `app/src/lib/domain/invoice.ts` converts CRLF/CR to LF; applied in `invoice-pdf.ts` text and height helpers (also repairs already-saved settings and existing invoices) and in `invoice-actions.ts` `str()` so new saves store LF only. Unit test added in `invoice.test.ts`.

### 0.13.0 — 8 October 2026

- **Founder OS invoice PDF (partial):** Numbered invoices (`INV/YYYY/NNNN`) created from a Pesanan card ("Buat Invoice") or the Invoice nav item, downloaded as PDF via a founder-gated route. Per-line discount and VAT %, delivery fee and amount paid are entered in a four-step wizard; totals are recomputed on the server; each invoice is a stored snapshot. Company details and logo are set on the new Pengaturan page. Migration `app/drizzle/0005_invoices.sql`. Browser checks are still pending. Migration 0005 is applied to production (verified 9 October 2026 via Supabase `list_migrations`). See [technical/notifications-and-reporting.md](./technical/notifications-and-reporting.md) §17.2 and [technical/data-model.md](./technical/data-model.md) §6.19–6.20.

### 0.12.0 — 1 October 2026

- **Founder OS Keuangan: COMPLETED-order-only revenue model:** Omzet (revenue) is now counted only from COMPLETED orders. Payments are categorized as: Sudah diterima (received, non-reversed payments on COMPLETED orders); Dibayar, belum selesai (held, payments on in-progress orders, not counted as revenue, hidden when zero); Perlu refund (unreversed payments on CANCELLED orders, with link to cancelled-orders tab and payment-reversal UI); Belum dibayar (receivables on non-cancelled orders, unchanged). Payment method share (Transfer, QRIS, Tunai) computed from Sudah diterima only. Dashboard month filters by completedAt in Jakarta timezone. Implementation: `app/src/lib/domain/operations.ts` financeSummary (lines 50–70), `app/src/components/founder-boards.tsx` FinanceBoard (lines 147–186). See [product/payments-and-receivables.md](./product/payments-and-receivables.md), [technical/ui-requirements.md](./technical/ui-requirements.md) §12.5, [technical/notifications-and-reporting.md](./technical/notifications-and-reporting.md) §17.

### 0.11.0 — 1 October 2026

- **Inventory item split:** Square sticker item split into two SKU-specific inventory items: `sticker_square_milieu` ("Stiker kotak Milieu (125 g)") and `sticker_square_grande` ("Stiker kotak Grande (225 g)"), each with threshold 10 pieces. Previously a single "Square sticker" item with threshold 20. Operationally tracked items now total 7 (was 6). Recipes updated: Milieu uses `sticker_square_milieu`, Grande uses `sticker_square_grande`. Data migration `app/drizzle/0004_split_sticker_square.sql` rewrites `order_items.recipe` per product, splits existing per-unit reservations by SKU, and renames any existing inventory movements to the Milieu variant (production had zero sticker movements at time of deploy). Founder counts each sticker variant separately with "Hasil opname"/"Terima stok" after deploy. Implementation: `app/src/lib/domain/catalog.ts` (ItemId type, inventoryItems list, product recipes), drizzle migration applied via `app/src/lib/db/schema.ts`.
- **Movement history title fallback:** Inventory movement history title now falls back to the raw `inventory_item_id` for items not found in the current catalog, preserving readability of historical data when items are deleted or renamed.

### 0.10.0 — 1 October 2026

- **Offline order submit:** a failed network call during "Buat Pesanan" now shows an inline "Koneksi bermasalah" message instead of Next.js's error page, and the order keeps the same idempotency key across retries, so a lost reply can never create a duplicate order (§19.7 items 45–46). Covered by the e2e offline test.
- **Playwright e2e suite:** `app/e2e/` with `customer`, `founder` and `safety` specs on mobile (390) and desktop (1440) projects, system Chrome (`channel: "chrome"`), 1 worker. Runs `next dev -p 3100` against a local Postgres database `le_nouette_e2e` with throwaway `ADMIN_*` env; `global-setup.ts` aborts unless `DATABASE_URL` is localhost + `le_nouette_e2e`, then truncates and reseeds. `npm run e2e:setup` creates the DB, `pgcrypto`, applies `drizzle/*.sql`; `npm run e2e` runs the tests. New devDependency `@playwright/test`. Not part of `npm test`. Prod/Supabase is never touched.

### 0.9.1 — 1 October 2026

- **Auth/permission acceptance tests (§19.6/19.7):** DB-free tests for `checkCredentials`, `proxy()` redirects and matcher, export route gates (401 before any DB call, 400 for an unknown CSV dataset), no secret-like export columns, order price/recipe snapshot after catalog edits, and idempotent order retry. No behaviour change; the export routes' pre-DB checks moved into `app/src/lib/export-guard.ts` and `proxy.ts` imports are relative (`./lib/founder-auth.ts`, `next/server.js`) so they run under `node --test`. Items 43–44 recorded as not implemented.

### 0.9.0 — 1 October 2026

- **Referral capture on order success:** One-time native HTML `<dialog>` on the order success screen (Screen 3), asking "Siapa yang memperkenalkan Le Nouette ke kamu?" with chips for Teman, keluarga, Instagram, WhatsApp, Lainnya, plus optional name/account field (max 60 chars, control chars stripped). Dialog dismissible by selection, Lewati (skip), or Escape; shown once per phone number via localStorage key `le-nouette:referral-asked`. Public server action `saveReferralAction({id, token, source, name})` verifies the order's public_token (same lookup as customer order tracking), validates the source enum, and records the referral as set-once (no overwrite); returns `{error}` on validation failure. New nullable columns: `orders.referral_source` (enum) and `orders.referral_name` (text). Founder order card displays referral when present. CSV/XLSX exports include referral columns. Migration: `app/drizzle/0003_referral.sql`. Implementation: `app/src/lib/referral.ts`, `app/src/components/storefront.tsx` (Screen 3 dialog), `app/src/components/order-board.tsx` (card display), `app/src/lib/db/schema.ts`.
- **Export formula-injection prevention:** User-supplied text cells in CSV and XLSX exports are prefixed with a single-quote apostrophe (`'`) if they start with `=`, `+`, `@`, tab, or CR. Prevents formula injection when the file is opened in Excel or Google Sheets. Applied via `safeText()` utility in `app/src/lib/export.ts`. Phone columns, which were previously apostrophe-prefixed, now use the same utility for consistency.

### 0.8.0 — 1 October 2026

- **Export menu mobile fit:** the export menu is height-capped and scrolls so it never hides behind the fixed mobile nav; the reversed-range alert uses the danger colour.
- **CSV/XLSX export date-range filtering:** Founder export menu now includes compact Dari (from) and Sampai (to) date inputs with a Kosongkan (clear) button and a helper line explaining which date each dataset uses (Orders/Customers by order date, Payments by payment date, Stock by movement date, Calendar by date; Balances unaffected). Query params `from` and `to` (YYYY-MM-DD, WIB, inclusive) on `/founder/export/csv` and `/founder/export/xlsx` filter the exported data: Orders by `createdAt`, payments by `paid_at`, stock/ready movements by `at`, and calendar by date; inventory and ready balances remain unfiltered. Customers dataset shows rows for customers with an order in the range, but stats (order_count, total_ordered, first_order_at) are computed from full history. Invalid params are ignored (all history on that side); a reversed range (from > to) yields an empty result and disables export links (shows "Tanggal akhir sebelum tanggal awal" alert). Filenames: `le-nouette-{key}-{date}.csv` (all-history) or `le-nouette-{key}_{from ?? "awal"}_sd_{to ?? "akhir"}.csv` (range), e.g., `le-nouette-orders_2026-09-01_sd_2026-10-01.csv`, `le-nouette-orders_awal_sd_2026-09-30.csv`, `le-nouette-all-2026-10-01.xlsx`. (`app/src/lib/export.ts` with parseDateParam, filterStateByRange, datasetTable; `app/src/components/export-menu.tsx`).

### 0.7.0 — 1 October 2026

- **Founder-side WhatsApp deep-link generation (4 of 5 kinds):** Founder OS order board now includes a **Kirim WhatsApp** link for each order (unless COMPLETED or customer WhatsApp number is invalid); invalid numbers show muted "Nomor WA tidak valid" instead. Pure functions in `app/src/lib/domain/whatsapp.ts`: `toWaNumber()` normalizes phone numbers (0812…/+62…/62… to 62…), `waKindFor()` selects message kind (null for COMPLETED, "cancelled" for CANCELLED, "ready" for READY_FOR_HANDOVER, "rescheduled" if ready date changed, else "confirmation"), and `waMessage(kind, order)` + `waLink(kind, order)` generate prefilled Bahasa Indonesia messages and wa.me deep links. Message templates include order id, items as "qty × name" format, total, ready date, place (delivery with optional address or pickup location), payment status or methods, receivable (for ready), or refund info (for cancelled); greeting handles blank customer first name. Link rendered as full-width row with WhatsApp icon. No record of sent/delivered kept; opening WhatsApp is a convenience action only. Payment-reminder message and customer-language selection remain backlog. (`app/src/lib/domain/whatsapp.ts`, `app/src/components/order-board.tsx`, `app/src/lib/domain/whatsapp.test.ts`).

### 0.6.0 — 1 October 2026

- **Tracking stale-response guard:** The tracking view ignores a slower, older response (cleanup flag in the `Tracking` effect), so pressing Refresh repeatedly cannot show stale statuses. Production still sends one request per load; the duplicate request only occurs in dev (React StrictMode).
- **Founder action in-process authentication:** All 15 founder-only server actions now call `requireFounder()` (`app/src/lib/founder-session.ts`) as their first line, verifying an HMAC-signed `founder_session` cookie and redirecting unauthenticated requests to `/login`. This centralizes authentication logic in the action entry point rather than relying solely on proxy/login screen gating. Actions affected: cancelOrderAction, rescheduleOrderAction, completeBatchAction, dispatchOrderAction, dispatchOrdersAction, completeOrderAction, recordPaymentAction, reversePaymentAction, receiveStockAction, stockOpnameAction, recordExtraPackedAction, adjustReadyAction, setDateStatusAction, setStoreStatusAction, resetSeedAction. Public actions (createOrderAction, trackOrdersAction) remain unauthenticated.
- **`withDomainTransaction` server-only boundary:** `app/src/lib/db/with-domain-transaction.ts` changed from "use server" directive to `import "server-only"`, clarifying that the file must only run on the server and reducing the surface area of server actions. Caller actions retain their "use server" declarations.
- **Founder session cookie verification tests:** New `app/src/lib/founder-auth.test.ts` tests `verifySessionCookieValue()` function for correct HMAC validation and signature failure detection. Tests included in `npm test`.
- **Integration test server-side condition resolution:** `npm run test:integration` now runs with Node's `--conditions=react-server` flag, ensuring `server-only` imports resolve correctly when domain operations and transaction utilities are called directly in tests.
- **New dependency: `server-only`:** Installed to enforce server-side-only execution boundaries in the codebase. Used in `withDomainTransaction` and `founder-session.ts`.

### 0.5.0 — 1 October 2026

- **Checkout form validation and UX:** Form uses `noValidate` with custom inline field error messages for name (required), WhatsApp format (validated regex), and delivery address (shown only when Delivery selected). Errors appear only after submission attempt and clear as user types; submission focuses and scrolls to first invalid field. Reduces friction and makes error feedback precise.
- **Sticky header fix:** Body `overflow-x: hidden` replaced with `overflow-x: clip`; the former creates a scroll container that breaks `position: sticky`. Header now remains fixed at top of viewport.
- **Scroll-to-top on step change:** Every transition between shop/details/success/tracking steps scrolls viewport to top, ensuring primary content is visible.
- **Order summary with product details:** Checkout and success pages now show order items with product thumbnail (52px), product name, size detail (e.g., "125g · Jar"), and line total; previous text-only summary replaced.
- **Success page tracking hint:** Added inline note on success screen — "Atau kamu bisa cek status pesanan lewat tombol Lacak (ikon paket) di bagian atas layar." (EN: "Or check your order status anytime with the Track (parcel icon) button at the top of your screen.") — to make order tracking discoverability explicit.
- **Catalog heading copy:** "Pilih yang ingin kamu pesan" (EN: "Pick what you want to order") replaces previous generic catalog title.
- **Success notice spacing:** The WhatsApp/tracker notice on the success screen keeps a 20px gap under the QRIS button (the `margin-top: auto` collapsed to 0 on full screens) and its icon is top-aligned.

### 0.4.0 — 1 October 2026

- **Customer order tracking:** **Lacak** button in storefront header opens read-only tracking view. Orders saved locally on customer's phone (`le-nouette:orders` localStorage, max 20 newest first) as `{id, token}` pairs. Status fetched on-demand only (no polling) via read-only server action `trackOrdersAction` when tracking view opens or customer manually refreshes. Lookup requires both order `id` and 128-bit hex `public_token` (migration `drizzle/0002_public_token.sql` applied to production); bad tokens uniformly not-found. Response filtered through `toCustomerView` projection: id, status, fulfillment, promised/current ready dates, item name/qty, total, isPaid, timestamps — never WhatsApp, address, note, or payment details. `createOrderAction` generates `public_token` server-side; no more customer PII in client response. Storefront page.tsx no longer sends full State/orders (PII leak fix). Customer status label "Perlu Disiapkan" displayed as "Sedang disiapkan" in tracking view (Founder OS unchanged). Acceptance test §19.2 item 19a added.
- **WhatsApp contact button:** Inline **Hubungi Kami** button across storefront (shop, success, tracking steps) links to `wa.me/<NEXT_PUBLIC_WHATSAPP_NUMBER>` with prefilled i18n message (`waMessage`; `waMessageOrder` includes order id). Env var required for production deployment (set in Vercel); button hidden if unset. Build-time inlined, no runtime calls.

### 0.3.2 — 25 September 2026

- **UX audit fixes:** Empty-cart storefront state with placeholder messaging instead of forced purchase; sticky checkout CTA (responsive, fits 320px mobile, never covers primary content). Paused store disables increment buttons and hides hero subline, shows amber closed banner. Checkout CTA label 'Buat Pesanan' fits 320px. All disabled controls use solid `.btn:disabled` style; darker --muted color for better contrast. Tap targets >= 44px including ID/EN toggle buttons. Text size >= 12px throughout. Verified via Playwright audit kit.
- **Removed unused placeholder images:** Deleted `ordering-reference.png` and `packaging-concept.png` from `app/public/le-nouette/` (~4.2 MB total, never referenced in production code or CSS). Production storefront now uses `hero.png`, `milieu.png`, and `grande.png` exclusively.
- **Image quality optimization and asset sizing:** Added `next.config.ts` image quality levels [60, 75] for next/image optimization; product photographs (milieu.png, grande.png) and hero.png deployed with explicit `quality={60}` and `sizes` attributes for responsive sizing; QRIS image uses `sizes=280px` (reduced from up to 2048 px). Images already served as WebP; quality 60 setting saves ~15%. Mobile image weight ~142 KB (hero + two product thumbnails, DPR 3) vs ~170 KB unoptimized; remaining ~980 KB dev transfer is mostly JavaScript. Verified via local production build (next build + next start).
- **Founder OS mobile improvements:** Mobile header shows title + avatar; secondary actions (Unduh Data Bisnis, Keluar) moved into avatar dropdown menu, not always-visible top bar. Improves mobile header density and accessibility.
- **Collapsible Stok cards:** Inventory item cards on Stok page support expand/collapse (details element); all collapsed by default on mobile (<= 900px), low-stock items sorted first. Desktop (>= 901px) forces open for scanability.
- **Beranda grouped alerts:** 'Semua beres hari ini' (all clear) success state when no actionable items exist (no orders to prepare, no shortages, no receivables). Low-stock alerts grouped and linked to Pesan ulang action.
- **Order filter wrapping:** Pesanan Kanban filter controls and status tabs wrap gracefully on narrow mobile viewport; no horizontal scroll or overflow.
- **Playwright review kit:** `.claude/playwright/` (audit.js, flow.js, README.md) — mobile 390px + desktop 1440px in light and dark modes; measures load time, LCP, CLS, contrast, tap targets, text size; generates screenshots and metrics JSON. Embedded in reviewer workflow (AGENTS.md).
- **Development workflow:** Added [docs/technical/dev-workflow.md](./technical/dev-workflow.md) covering persona dispatch (engineer → reviewer → docs), Playwright kit setup, startup checklist, pre-commit documentation gate, local Founder OS login, and shared-database safety.
- **Startup checklist (expanded):** `.claude/startup-check.sh` (wired as SessionStart hook in `.claude/settings.json`) verifies 7 plugins enabled and loaded (caveman, ponytail, superpowers, frontend-design, playwright, vercel, supabase; 1b checks install dir + skills/hooks/MCP present), project agents + frontmatter, git hooks active, Playwright kit + Chrome, app/.env.local, Next.js bundled docs (1c), dev server on :3000 (1d info-only), database reachability via DATABASE_URL (1d), live store status from store_status table (1d; warn if PAUSED since DB is shared with production). Warns on missing setup without blocking.
- **Pre-commit documentation gate:** `.githooks/pre-commit` (enforced via `git config core.hooksPath .githooks`) requires `docs/` changes when staging `app/src/` or `.claude/` changes. Ensures every code change ships with doc sync; bypass with `SKIP_DOCS_CHECK=1` only if truly no-doc-impact.
- **Registered agent names:** `le-nouette-engineer`, `le-nouette-designer`, `le-nouette-reviewer`, `le-nouette-docs` in `.claude/agents/`; documented in AGENTS.md and used with Agent-tool dispatches.

### 0.3.1 — 24 September 2026

- **Recipe change:** Milieu cheese requirement reversed to **exactly 125 g per jar**, replacing the previous 95%-yield rule (131.58 g). Rationale: raw cheese is one pooled stock; 5 supplier packs (1,125 g) now yield exactly 9 Milieu jars. No remainder is modeled or tracked. All affected doc sections updated (products-and-economics, inventory-model, scope-and-decisions, workflows, architecture, acceptance-tests, data-model); COGS estimates recalculated.
- Removed 'Lihat di Founder OS' link from the buyer success screen; order confirmation remains actionable through Founder OS independently.
- **Stok raw cheese entered in supplier packs:** Terima stok and Hasil opname on the Stok page take supplier packs (225 g each, decimals allowed for a part-used pack) instead of grams; balances display as packs with the gram equivalent. Storage is unchanged (centigrams).

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
