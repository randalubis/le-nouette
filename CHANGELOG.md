# Changelog

All notable changes to **Le Nouette**. The format loosely follows
[Keep a Changelog](https://keepachangelog.com/); this project has no version
tags, so entries are grouped by the date work landed on `main`.

Each bullet links to the pull request that delivered it
([repo](https://github.com/randalubis/le-nouette/pulls)). As of this writing the
project is **42 merged PRs** deep, with no open PRs. Ticket IDs
like `N-04`, `X-11`, `L-06` refer to the 41-item audit in
[docs/IMPROVEMENT_PLAN.md](docs/IMPROVEMENT_PLAN.md).

---

## 2026-06-24 — Admin login recovery & changelog

### Added
- **"Forgot email or password?" recovery guide** on the admin login page ([#42](https://github.com/randalubis/le-nouette/pull/42)) — admin auth is env-var based with no automated reset, so a toggleable inline panel discloses the real recovery path (update `ADMIN_PASSWORD` / `ADMIN_EMAIL` in Vercel → redeploy; or edit `.env.local` for local dev) and reminds the operator their sign-in email is `ADMIN_EMAIL`. Pure client-side disclosure — no backend, no new attack surface.
- **This CHANGELOG** ([#41](https://github.com/randalubis/le-nouette/pull/41)) — the full project history captured in one document; README links it.

### Fixed
- Reconciled two stale doc lines ([#41](https://github.com/randalubis/le-nouette/pull/41)): README's "scale doesn't warrant a hold/release flow" note (X-04 added exactly a 30-min soft hold + `HOLD_EXPIRED` release) and DEPLOYMENT's env-var count (9 → 10).

---

## 2026-06-15 — Maintenance: docs & lint health

### Fixed
- **Repo integrity sweep** ([#39](https://github.com/randalubis/le-nouette/pull/39)) — reconciled docs with code: corrected fonts (Playfair+Geist → DM Sans/Instrument Serif/JetBrains Mono), image config (`unoptimized:true` → optimizer + `remotePatterns`), Prisma model count (7 → 12), the project-structure tree (old `checkout/`+`order/` routes → `pembayaran/`+`pesanan/`), and order-status flow. Dropped the unused `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `@supabase/ssr` instructions from `SUPABASE_SETUP.md`. Added a status banner to `IMPROVEMENT_PLAN.md`. **Code fix:** the admin Products page now gates its "in the open round" query on `opensAt <= now`, matching every other live-round query.
- **Lint cleanup** ([#40](https://github.com/randalubis/le-nouette/pull/40)) — cleared all 15 pre-existing ESLint problems. Real fixes: removed 4 dead imports/vars, refactored global-search to derive instead of `setState`-in-effect, reused `nowDate` in the dashboard countdowns. Scoped `eslint-disable` + rationale for the React-Compiler rules that over-flag correct patterns (`Date.now()` in Server Components; localStorage hydration on mount). `npm run lint` → 0 problems.

---

## 2026-05-11 — Scheduled rounds & countdown UX

### Added
- **opensAt gating + admin choice** ([#35](https://github.com/randalubis/le-nouette/pull/35)) — a round flipped to `OPEN` with a future open time stays invisible to customers until that time. The admin "Open round" button prompts to keep the schedule or open immediately.
- **Scheduled-round visibility** ([#36](https://github.com/randalubis/le-nouette/pull/36)) — customer-facing upcoming-round countdown; admin dashboard upcoming cue + `SCHEDULED` badge in the rounds list so a second overlapping round isn't created by accident.
- **Prominent `UpcomingCountdownCard`** ([#37](https://github.com/randalubis/le-nouette/pull/37)) — a dedicated, high-visibility countdown card on the closed/scheduled storefront state.

### Changed
- **Consolidated notify-me** ([#38](https://github.com/randalubis/le-nouette/pull/38)) — folded the notify-me form into the countdown card's CTA and dropped the duplicate standalone prompts when a round is scheduled.

---

## 2026-05-10 — Design System v2 & timezone fix

### Added / Changed
- **DS v2 foundation** ([#28](https://github.com/randalubis/le-nouette/pull/28)) — new design tokens, fonts, base shapes, and a rebuilt dark mode.
- **DS v2 motion** ([#29](https://github.com/randalubis/le-nouette/pull/29)) — bottom sheet, cart-icon pop, confirmation confetti.
- **Home redesign** ([#30](https://github.com/randalubis/le-nouette/pull/30)) — full-bleed hero + prominent countdown card.
- **Bottom tab bar** ([#31](https://github.com/randalubis/le-nouette/pull/31)) — Beranda / Menu / Keranjang / Pesanan; dropped the home CheckoutBar.
- **Hero polish** ([#33](https://github.com/randalubis/le-nouette/pull/33), [#34](https://github.com/randalubis/le-nouette/pull/34)) — closed-state countdown + status pill, brand hero photo, warmer copy, and the first cut of `opensAt` gating + scheduled-round visibility.

### Fixed
- **Jakarta timezone skew** ([#32](https://github.com/randalubis/le-nouette/pull/32)) — round open/close times were saved with a 7-hour UTC-vs-Jakarta offset; now persisted and displayed in `Asia/Jakarta` consistently.

---

## 2026-05-07 — UI/UX Improvement Plan (41 tickets)

A structured external audit ([docs/IMPROVEMENT_PLAN.md](docs/IMPROVEMENT_PLAN.md))
translated into 41 tickets across three phases, executed over this day.

### Added — Phase 1 (NOW: `N-01`…`N-13`) — complete
- Warm-ups + the plan doc ([#16](https://github.com/randalubis/le-nouette/pull/16)): `N-04` contrast, `N-09` delivery reminder, `N-12` admin `lang`, `N-13` decorative alt text.
- ([#17](https://github.com/randalubis/le-nouette/pull/17)) `N-05` date-anchored round titles, `N-06` inline bump-stock, `N-07` edit-cart link.
- ([#18](https://github.com/randalubis/le-nouette/pull/18)) `N-02` customer self-cancel, `N-08` checkout progress stepper.
- ([#19](https://github.com/randalubis/le-nouette/pull/19)) `N-03` storefront language/URL slugs, `N-10` what-why-action errors, `N-11` voice guide.
- ([#20](https://github.com/randalubis/le-nouette/pull/20)) `N-01` closed-round teaser + WhatsApp notify-me capture.

### Added — Phase 2 (NEXT: `X-01`…`X-16`) — substantially complete
- ([#21](https://github.com/randalubis/le-nouette/pull/21)) `X-10` inline hex → semantic design tokens (+ `check:hex` guard).
- ([#22](https://github.com/randalubis/le-nouette/pull/22)) `X-01` re-skin admin onto storefront tokens.
- ([#23](https://github.com/randalubis/le-nouette/pull/23)) `X-08` danger-zone separation, `X-15` count-aware bulk confirms.
- ([#24](https://github.com/randalubis/le-nouette/pull/24)) mega: `X-04` soft-hold, `X-05` WhatsApp E.164 normalization, `X-06` COD confirmation gate, `X-07` radio fieldset, `X-11` image optimizer, `X-12` revalidation, `X-13` polled status, `X-14` checkout confirm/undo, `X-16` localStorage consolidation; partial `X-02`/`X-03`.

### Added — Phase 3 (LATER: `L-01`…`L-12`) — partial
- ([#25](https://github.com/randalubis/le-nouette/pull/25)) `L-03` reorder, `L-04` aspect ratio, `L-06` reviews, `L-07` dark mode, `L-09` round-transition messaging, `L-10` owner story, `L-11` FAQ block, `L-12` admin keyboard shortcuts. Deferred (blocked on a WhatsApp Business API provider): `L-01`/`L-02`/`L-05`; deferred as cosmetic: `L-08`.

### Changed
- ([#26](https://github.com/randalubis/le-nouette/pull/26)) Stepper polish + WCAG AA contrast pass.

### Reverted
- ([#27](https://github.com/randalubis/le-nouette/pull/27)) Rolled back the `L-07` dark mode to keep the warm cream brand. *(Dark mode was later reinstated under DS v2 in [#28](https://github.com/randalubis/le-nouette/pull/28).)*

---

## 2026-05-06 — MVP & end-to-end hardening

### Added
- **MVP** ([#1](https://github.com/randalubis/le-nouette/pull/1)) — storefront + admin back office: rounds, products, cart, checkout, QRIS/COD, order lifecycle, CSV export.
- **README** ([#2](https://github.com/randalubis/le-nouette/pull/2)) rewritten to reflect actual state.
- **Bank transfer** ([#4](https://github.com/randalubis/le-nouette/pull/4)) payment method + checkout restructure + payment-page loading state.
- **Customer order history** ([#5](https://github.com/randalubis/le-nouette/pull/5)) in localStorage + order URL in the WhatsApp message.
- **Round cancellation** ([#7](https://github.com/randalubis/le-nouette/pull/7)) with stock restore; hide/delete cancelled orders.
- **Admin productivity** — mobile nav + phone normalization + dashboard revamp ([#8](https://github.com/randalubis/le-nouette/pull/8)); bulk select + status change ([#9](https://github.com/randalubis/le-nouette/pull/9)); settings, quick-archive, sold count, order search, admin notes ([#12](https://github.com/randalubis/le-nouette/pull/12)); history, global orders, customers, backups ([#13](https://github.com/randalubis/le-nouette/pull/13)); mobile-friendly products + rounds ([#14](https://github.com/randalubis/le-nouette/pull/14)).
- **Vercel Analytics** ([#10](https://github.com/randalubis/le-nouette/pull/10)).

### Fixed
- Checkout redirect race + raised Prisma `maxWait` ([#3](https://github.com/randalubis/le-nouette/pull/3)).
- Initial order status for bank transfer ([#6](https://github.com/randalubis/le-nouette/pull/6)).
- WhatsApp match for proof upload + normalized Supabase URL env ([#11](https://github.com/randalubis/le-nouette/pull/11)).
- **Security & integrity hardening** ([#15](https://github.com/randalubis/le-nouette/pull/15)) from an end-to-end audit.

---

## Deferred / not yet started

- **`L-01` outbound WhatsApp notifications** — blocked on choosing a WhatsApp Business API provider. The `NotifySubscriber` table captures opt-ins today; the send path is pending.
- **`L-02` find-my-orders** and **`L-05` favorites** — depend on `L-01`.
- **`L-08` short-code split** — deferred as cosmetic.
- **`L-11` FAQ admin editor** — the customer-facing FAQ + `faqAnswers` override mechanism ship; only the admin editing UI is unbuilt.
- **`L-12` saved filter views** — keyboard shortcuts + global search shipped; saved presets remain.
