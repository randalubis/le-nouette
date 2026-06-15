# Le Nouette · UI/UX Improvement Plan

**Phased recommendations for the storefront, back office, and brand system.**
Prepared as a structured handoff for the owner, designer, and developer.
Audit basis: source code review of [github.com/randalubis/le-nouette](https://github.com/randalubis/le-nouette).

---

> ## Implementation status — as of 2026-05-11
>
> This document is the **original audit handoff** and is preserved as written: each ticket body describes the app *at audit time*, before any fix. Progress since then:
>
> - **Phase 1 (N-01 … N-13): shipped.** All thirteen NOW tickets are in the codebase.
> - **Phase 2 (X-01 … X-16): substantially shipped.** Confirmed in schema + code: X-01 (admin re-skin), X-04 (soft hold — `stockHoldExpiresAt`, `HOLD_EXPIRED`), X-05 (`normalizedWhatsApp`), X-06 (`PENDING_CONFIRMATION`), X-10 (`check:hex` token enforcement), X-11 (image optimizer + `remotePatterns`), X-12 (`revalidate` + `revalidatePath`), among others.
> - **Phase 3 (L-01 … L-12): partial.** Shipped include L-03 (reorder), L-04 (`aspectRatio`), L-06 (reviews), L-07 (dark mode + reduced motion), L-09 (round-transition / scheduled-round communication), L-10 (owner story).
>   - **Deferred — blocked on a WhatsApp Business API provider:** L-01 (outbound notifications) and its dependents L-02 (find-my-orders) and L-05 (favorites). The `NotifySubscriber` table captures opt-ins today; the outbound fan-out is pending.
>   - **Deferred — judged cosmetic:** L-08 (short-code split).
>   - **Schema-ready, no admin UI yet:** L-11 (`BusinessSettings.faqAnswers` exists; editing UI not built).
>
> Treat this banner as the source of truth for *what's done*; treat the ticket bodies below as the source of truth for *what each ticket asked for*. Ticket IDs are stable — reference them as-is.

---

## Table of contents

- [How to use this document](#how-to-use-this-document)
- [Executive summary](#executive-summary)
- [Phase 1 — NOW (Weeks 1–2)](#phase-1--now-weeks-12)
- [Phase 2 — NEXT (Weeks 3–6)](#phase-2--next-weeks-36)
- [Phase 3 — LATER (Quarter horizon)](#phase-3--later-quarter-horizon)
- [Out of scope and follow-ups](#out-of-scope-and-follow-ups)
- [How to track this work](#how-to-track-this-work)

---

## How to use this document

This document is a structured handoff. It is the output of a UI and UX audit of the Le Nouette web app, translated into 41 actionable engineering and design tasks. It is organized so that the developer and the designer can pick up tickets and start working immediately, without having to ask follow-up questions.

Every recommended fix is split into the same six fields. Read them in this order to plan the work.

- **Audit Subject.** Which part of the app the finding came from. Use this to scope the change and understand context.
- **Owner.** Who should pick up the ticket. Some items are designer-only, some are developer-only, several need both working in parallel.
- **Estimated Effort.** A working estimate in person-days for an experienced builder familiar with Next.js, Prisma, and Tailwind. Treat it as a sizing hint, not a contract.
- **Severity / Impact.** How much the issue is hurting the customer or the operator, on a Low / Medium / High scale, with a one-word lever attached.
- **Finding.** What is wrong, plainly stated, and where it shows up in the codebase.
- **Recommended Fix.** The specific change to make. File paths and component names are explicit so the developer does not have to hunt.
- **Acceptance Criteria.** Concrete checks that prove the fix is done. Use these as the QA checklist before merging.

### Phasing

Items are split into three phases that should be executed in order. Do not start a Phase 2 item before Phase 1 is complete unless the rationale for the swap is explicit and intentional. The phases compound. Skipping ahead causes rework later.

- **Phase 1 — NOW.** Two-week sprint. Stop the bleeding. Closes the most painful customer and operator gaps with relatively small surface-area changes.
- **Phase 2 — NEXT.** Four to six weeks. Mature the product from a personal tool into a small business platform. Brand unification, payment flow hardening, accessibility, and performance.
- **Phase 3 — LATER.** Quarter-long horizon. Add compounding behaviors so the business grows without manual outreach. Notifications, identity, reorder, and brand storytelling.

### How to read severity

Severity is a blend of three factors: customer-facing harm, operator-facing load, and brand-perception risk. The lever word at the end of the severity tells you which factor dominates.

- **Trust.** Customer hesitates or loses confidence.
- **Conversion.** Customer abandons the funnel.
- **Retention.** Customer does not come back.
- **Operator.** Owner spends manual time on something the app should automate.
- **Accessibility.** Excludes a subset of users.
- **Brand.** Signals "hobby project" rather than "business".
- **Risk.** Data integrity, security, or compliance exposure.
- **Performance.** Perceived speed, especially on Indonesian mobile networks.

---

## Executive summary

Le Nouette is a competent, taste-fully crafted MVP. It successfully replaced the manual WhatsApp plus Google Sheets workflow it was built to replace. Its data model is clean. Its storefront has a real point of view. Its admin dashboard is unusually well-designed for a side project. None of those facts is being changed by this document.

That said, the product currently sits at "personal operator tool" maturity, not "small business platform" maturity. Three things are holding it back. First, the customer side is technically functional but emotionally and informationally thin, which will cap repeat-purchase rate. Second, there is a visible brand schism between the warm storefront and the generic admin panel, which signals "hobby" rather than "business". Third, the product has no growth loop, so the business cannot compound without the owner doing the manual WhatsApp outreach the app was built to escape.

This document proposes 41 specific fixes, sequenced across three phases. The Phase 1 block alone, executed inside a two-week sprint, will measurably improve repeat-purchase rate and noticeably reduce operator support load. The Phase 2 block matures the brand and the architecture together. The Phase 3 block introduces compounding behavior so growth happens without the owner pushing it forward by hand each round.

### The three plays in one paragraph

1. **Close the customer-side trust and self-service gaps.** The closed-round teaser with notify-me capture, the customer-side cancel option, and the rewritten copy across friction points are the highest-leverage fixes in Phase 1.
2. **Unify the brand and design system across storefront and admin.** The admin re-skin and the design-token audit in Phase 2 close the schism that currently makes the product feel like two products.
3. **Add a repeat-purchase loop.** The outbound WhatsApp notification system and the identity-based "Find my orders" flow in Phase 3 are the only meaningful growth lever for a single-operator preorder business.

### Distribution of work across the phases

Of the 41 fixes, 13 belong to Phase 1, 16 belong to Phase 2, and 12 belong to Phase 3. By owner, the work splits roughly 60 percent developer, 25 percent designer, and 15 percent both working in parallel. By severity, 9 are High, 21 are Medium, and 11 are Low. The High-severity items are deliberately concentrated in Phase 1 and the early part of Phase 2. There is no High-severity item that has been deferred to Phase 3.

---

## Phase 1 — NOW (Weeks 1–2)

The goal of Phase 1 is to stop the bleeding. These thirteen fixes close the most painful customer and operator gaps with relatively small surface-area changes. None of them require schema migrations beyond a single new `NotifySubscriber` model and an optional `StockAdjustment` audit log. None of them require a brand redesign. All of them are independently shippable and can be parallelized between developer and designer.

**Recommended sequencing inside the sprint.**

| Days | Tickets |
|---|---|
| 1–3 | `N-04`, `N-12`, `N-13`, `N-09` (warm-up) |
| 4–6 | `N-05`, `N-06`, `N-07` |
| 7–9 | `N-02`, `N-08` |
| 10–14 | `N-01`, `N-03`, `N-10`, `N-11` (with `N-11` absorbing copy work for `N-03` and `N-10`) |

---

### N-01 · Closed-Round Teaser Page with Notify-Me WhatsApp Capture

| | |
|---|---|
| **Audit Subject** | Storefront landing page when no round is OPEN. File: `src/app/(storefront)/page.tsx`, the early-return branch. |
| **Owner** | Designer (lead) + Developer |
| **Estimated Effort** | 2 days |
| **Severity / Impact** | High · Retention and Conversion |

**Finding**

When no round is open the page shows a single croissant icon and the line "Lagi tutup dulu, preorder belum dibuka". This is the brand's worst moment. A first-time visitor who lands at the wrong moment learns nothing about the business, has no way to be notified, sees no past work, and has no reason to come back. The closed state currently throws away every visitor it receives.

Because the customer base discovers the link primarily through WhatsApp shares, traffic during a closed window is real and recurring. The product is currently letting that traffic leave without capturing intent.

**Recommended Fix**

Convert the closed-round branch from an empty state into a marketing landing page that captures intent. The page should still be honest that ordering is not currently open, but it should give the visitor three things in a single screenful: a reason to wait, a way to be reminded, and a feel for what the product looks like when it is open.

1. Add a hero block at the top of the page with a warm photo from the most recent delivered round, an italic Playfair headline like "Cemilan minggu depan lagi disiapin", and a one-line story written by the owner.
2. Add a "Notify me when the next round opens" card with a single WhatsApp number input, the same E.164 normalization that checkout already uses, and a primary "Beritahu saya" button. Save the number to a new Prisma model named `NotifySubscriber` with fields `whatsapp`, `createdAt`, `optedOutAt`, and a unique index on `whatsapp`.
3. After successful submission, replace the form with a "Sip, kami catat ya" confirmation block and a small footer "Kalau berubah pikiran, balas STOP saat kami WhatsApp kamu nanti".
4. Below the capture card, add a horizontal scrollable strip showing two or three product cards from the most recent CLOSED round, marked "Yang lalu" with no buy buttons, just to set expectations of what the next round might contain.
5. Add a third block named "Jadwal kami" that displays the typical opening cadence read from a new `BusinessSettings` field called `typicalCadence` (free text like "Senin pagi, antar Jumat"). This sets cadence expectations without committing to dates.
6. Track submissions through Vercel Analytics with a custom event name `notify_subscribe` so the owner can see whether the page is doing its job.

> **Out of scope for this ticket:** the actual outbound WhatsApp send. That belongs to Phase 3 ticket `L-01`. This ticket only captures the list. The list compounds in value as soon as it exists, so there is no benefit in waiting for the outbound system before starting to capture.

**Acceptance Criteria**

- [ ] When the storefront has no OPEN round, the page renders the hero, notify form, past-round strip, and cadence block, in that order.
- [ ] Submitting a valid Indonesian WhatsApp number creates a `NotifySubscriber` row and shows the confirmation state without a full page reload.
- [ ] Submitting an invalid number shows an inline error matching the format used elsewhere in the app, with a what-why-action structure.
- [ ] Submitting the same number twice does not create a duplicate row and shows a "Kamu sudah terdaftar" message.
- [ ] The `notify_subscribe` event fires once per successful submission in Vercel Analytics.
- [ ] Lighthouse Performance and Accessibility scores on this page are both 95 or higher on a simulated mid-tier mobile device.

---

### N-02 · Customer-Side Cancel for Pending Payment Orders

| | |
|---|---|
| **Audit Subject** | Customer order pages. Files: `src/app/(storefront)/order/[shortCode]/page.tsx` and `src/app/api/orders/[shortCode]/*` (new cancel route). |
| **Owner** | Developer |
| **Estimated Effort** | 1 day |
| **Severity / Impact** | High · Operator Load |

**Finding**

Customers cannot cancel their own order. If they made a typo on quantity, picked the wrong payment method, or simply changed their mind, the only path is to message the admin via WhatsApp. The admin then has to open the back office and execute the cancel, which restores stock. This is a constant trickle of operator load that scales linearly with order volume.

Combined with `X-04` (stock decrements on placement), abandoned orders also phantom-allocate stock until the operator manually cancels them.

**Recommended Fix**

Add a customer-side cancel affordance with tight constraints. The constraints exist because the goal is to remove easy operator load, not to give customers a tool to grief the business.

1. On `/order/[shortCode]`, render a "Batalkan pesanan" button only when the order is in `PENDING_PAYMENT` status, no payment proof has been uploaded, and the order was created less than 15 minutes ago.
2. Tapping the button opens a confirmation step with the message "Pesanan akan dibatalkan dan stok dikembalikan. Yakin?" and two buttons, "Ya, batalkan" (destructive style) and "Batal".
3. On confirm, POST to a new endpoint `/api/orders/[shortCode]/cancel` that runs inside a Prisma transaction. The transaction must verify the order is still in `PENDING_PAYMENT`, has no payment proof, and is within the 15-minute window. If any condition fails, return a 409 with a Bahasa explanation.
4. On success, decrement `RoundProduct.stockSold` by the order item quantities, set `Order.status` to `CANCELLED`, write an `OrderStatusEvent` with actor `customer`, and remove the order from the localStorage history via the existing `removeOrderFromHistory` helper.
5. Show a toast "Pesanan dibatalkan. Sampai ronde berikutnya" and redirect to `/` after one second.

> Do not allow cancellation if a payment proof has been uploaded. Once the customer has uploaded proof, the admin needs to be in the loop. The button must therefore be hidden, not just disabled, in that case.

**Acceptance Criteria**

- [ ] An order in `PENDING_PAYMENT` with no proof and created less than 15 minutes ago shows the cancel button.
- [ ] An order with proof, or an order older than 15 minutes, does not show the button.
- [ ] A cancellation correctly restores stock for every line item and writes a status event.
- [ ] Two simultaneous cancel attempts do not double-restore stock (covered by transaction).
- [ ] The toast and redirect happen exactly once on success.

---

### N-03 · Language and URL Slug Consistency Across Storefront

| | |
|---|---|
| **Audit Subject** | All storefront routes. Files: `src/app/(storefront)/keranjang`, `/checkout`, `/order`, `/pesanan`, plus `src/lib/orders.ts`. |
| **Owner** | Developer + Designer (copy review) |
| **Estimated Effort** | 1.5 days |
| **Severity / Impact** | Medium · Brand |

**Finding**

The storefront mixes Bahasa Indonesia and English in places that should be all-Bahasa. URL slugs are inconsistent. `/keranjang` and `/pesanan` are Bahasa, while `/checkout` and `/order` are English. Inside the checkout page, the heading is "Pembayaran" but the COD label rendered inline is "Cash on Delivery". The `paymentMethodLabel` function in `src/lib/orders.ts` returns "QRIS", "Bank Transfer", and "Cash on Delivery", which are then displayed verbatim on the customer-facing order confirmation. This signals "I copied this from a tutorial" and undermines the brand voice the rest of the storefront earns.

**Recommended Fix**

Adopt a single rule: everything customer-visible is in Bahasa Indonesia. Everything admin-visible stays in English. Apply this rule to slugs, labels, error messages, and toast text.

1. Rename `/checkout` to `/pembayaran` and `/order/[shortCode]` to `/pesanan/[shortCode]`. Update every `Link` and `router.replace` call. Add temporary 308 redirects in `middleware.ts` from the old paths to the new ones for one release cycle.
2. Inside `src/lib/orders.ts`, change `paymentMethodLabel` to return Bahasa labels: `QRIS` stays `QRIS`, `BANK_TRANSFER` becomes "Transfer Bank", `COD` becomes "Bayar di Tempat". Add a separate `paymentMethodLabelEn` function for admin contexts.
3. Update all customer-visible payment option strings in `/pembayaran/page.tsx` to use the Bahasa labels. The English labels remain in admin code paths.
4. Audit all `toast.error` and `toast.success` calls in storefront components and translate any English strings.
5. Update `buildWhatsAppMessage` in `src/lib/orders.ts` so the "Pembayaran:" line uses the Bahasa label.
6. Move the `/pesanan` order history page (currently at `src/app/(storefront)/pesanan`) to `/riwayat` to avoid the new collision with the order detail under `/pesanan/[shortCode]`.

> Document the language rule in a new file at `docs/CONTENT_GUIDE.md` with a one-line policy and a translation table for the most common UI strings, so future contributors do not regress.

**Acceptance Criteria**

- [ ] Every URL the customer sees in the address bar is in Bahasa Indonesia.
- [ ] Every label, toast, and error message visible to the customer is in Bahasa Indonesia.
- [ ] All admin labels remain in English with no regressions.
- [ ] Old URLs continue to work via 308 redirects for one release cycle.
- [ ] `docs/CONTENT_GUIDE.md` exists and is referenced from the README.

---

### N-04 · Muted Text Color Contrast Fix (WCAG AA Compliance)

| | |
|---|---|
| **Audit Subject** | Design tokens. File: `src/app/globals.css`, `--muted` token. |
| **Owner** | Designer (decision) + Developer (apply) |
| **Estimated Effort** | 0.5 day |
| **Severity / Impact** | High · Accessibility |

**Finding**

The current `--muted` color `#8a7b6b` on the cream `--background` `#faf7f2` measures approximately a 4.0 contrast ratio. WCAG 2.1 AA requires 4.5 for normal body text. This fails the standard for every product description, every "tanggal pemesanan" line, every empty-state subtitle, and every "Pesanan disimpan di perangkat kamu" footer. Users with low vision, in bright sunlight, or on glossy phone screens will struggle to read meaningful product information.

**Recommended Fix**

There are two acceptable resolutions. Pick one and document the choice. The first is to darken `--muted` globally. The second is to keep `--muted` for genuinely incidental text (helper microcopy, captions, status timestamps) and switch primary body text to `--foreground`.

1. **Recommended path:** change `--muted` from `#8a7b6b` to `#6b5c4d`. This raises contrast against `--background` to roughly 7.0, which clears AAA for normal text and gives plenty of headroom on darker surface backgrounds. Verify against every other surface color in use, including `--surface` white and the warm gradient cards on the round banner.
2. Audit every component file under `src/app/(storefront)` and identify lines that use `text-[var(--muted)]` for what is in fact body content. Move those to `text-[var(--foreground)]` so `--muted` is reserved for incidental text only.
3. Run a contrast audit using axe DevTools or Lighthouse on `/`, `/keranjang`, `/pembayaran`, and `/pesanan/[shortCode]`. Confirm zero contrast failures.
4. Document the policy in `docs/CONTENT_GUIDE.md` (created in `N-03`) under a "Color and contrast" section. Add a one-line rule: `--muted` is for incidental text only, never for primary body content.

**Acceptance Criteria**

- [ ] axe DevTools reports zero color-contrast violations on storefront pages.
- [ ] Lighthouse Accessibility score on the storefront is 100.
- [ ] Product descriptions, order timestamps, and empty-state subtitles remain visually readable in bright sunlight on a typical Android device.

---

### N-05 · Date-Anchored Round Title Auto-Generator

| | |
|---|---|
| **Audit Subject** | Round creation form. File: `src/app/admin/rounds/_components/round-form.tsx`. |
| **Owner** | Developer + Designer (placeholder copy) |
| **Estimated Effort** | 0.5 day |
| **Severity / Impact** | Medium · Brand |

**Finding**

The placeholder text in the round creation form reads "Round #1 - Friday Snacks". The owner is highly likely to use the placeholder pattern as-is. Customers then see "Round #1" on their order confirmation and on the round banner. The word "round" is a developer abstraction. Customers think in terms of "this Friday's order", "next week's batch", "cemilan minggu ini".

**Recommended Fix**

Replace the freeform placeholder with an auto-generator that pre-fills a Bahasa, date-anchored, customer-friendly title based on the `deliveryDate` field, while still letting the owner override it.

1. When the `deliveryDate` input changes in `round-form.tsx`, derive a default title using `Intl.DateTimeFormat` with locale `id-ID` to produce a string like "Cemilan Jumat 14 November".
2. Apply the derived title only when the title field is empty or still equals a previously auto-generated title. Use a `useRef` to track whether the title has been manually edited.
3. Update the placeholder text to "Cemilan Jumat 14 November (otomatis dari tanggal antar)" so the owner understands the auto-generation.
4. Validate that the generated title is at most 100 characters to satisfy the existing Zod schema.
5. Add a small helper text under the title field: "Judul ini akan dilihat customer di banner dan konfirmasi pesanan".

**Acceptance Criteria**

- [ ] Setting a delivery date with no title yields a Bahasa, date-anchored title.
- [ ] If the owner edits the title manually, subsequent delivery date changes do not overwrite the manual value.
- [ ] If the owner clears the title, future delivery date changes resume auto-generation.
- [ ] Generated titles never exceed the 100-character limit.

---

### N-06 · Inline "Bump Stock" Action in Dashboard Stock Alert

| | |
|---|---|
| **Audit Subject** | Admin dashboard stock alert banner. File: `src/app/admin/page.tsx`. |
| **Owner** | Developer |
| **Estimated Effort** | 0.5 day |
| **Severity / Impact** | Medium · Operator |

**Finding**

The dashboard stock-alert banner shows products with two or fewer items left. The action it implies, "add stock to keep selling", currently requires three clicks: navigate to the round, click Edit, find the product row, change the stock number, hit Save. For an operator on a phone during a busy lunch hour, this is friction.

**Recommended Fix**

Add an inline +5 stepper next to each product in the stock alert that bumps `stockLimit` immediately, with a small toast confirmation.

1. Each entry in the stock alert list gets a small button labeled "+5 stok" to its right.
2. Clicking the button POSTs to a new endpoint `/api/admin/round-products/[id]/bump-stock` with body `{ delta: 5 }`. The endpoint must require admin auth, validate the round is OPEN, and update `RoundProduct.stockLimit` transactionally.
3. On success, refresh the dashboard data and show toast "Stok produk X ditambah 5".
4. Add an `OrderStatusEvent` equivalent log entry, or a simpler `StockAdjustment` table with `productId`, `roundId`, `delta`, `actor`, `createdAt`, so stock changes are auditable.

**Acceptance Criteria**

- [ ] The bump button appears next to each product in the stock alert banner when an OPEN round exists.
- [ ] Clicking the button increments `stockLimit` by 5 in the database.
- [ ] The dashboard re-renders with the updated number without a full reload.
- [ ] An audit log entry exists for every bump action.

---

### N-07 · "Edit Cart" Link on Checkout Page

| | |
|---|---|
| **Audit Subject** | Checkout page. File: `src/app/(storefront)/checkout/page.tsx` (will be `/pembayaran` after `N-03`). |
| **Owner** | Developer |
| **Estimated Effort** | 0.5 day |
| **Severity / Impact** | Medium · Conversion |

**Finding**

There is no "back to cart" button on the checkout page. Editing the cart from checkout requires browser back, which is not a discoverable affordance and can lose form state. If the customer changes their mind on quantity at checkout, they have to leave the checkout context entirely.

**Recommended Fix**

Add an explicit "Edit keranjang" link near the order summary, and ensure form state survives the round trip.

1. Add a small "Edit keranjang" link in the "Ringkasan" card header on the checkout page. The link should use Next.js `Link` to `/keranjang` and not `router.replace`, so the browser back button still works.
2. Persist the in-progress checkout form fields (`name`, `whatsapp`, `notes`, `paymentMethod`) to localStorage on each change, behind a key `le-nouette-checkout-draft-v1`.
3. On checkout page mount, restore the draft if present and unexpired (older than 30 minutes is treated as expired).
4. Clear the draft on successful order creation, alongside the cart clear that already happens.

**Acceptance Criteria**

- [ ] Edit keranjang link exists in the order summary card and is keyboard-reachable.
- [ ] Clicking the link returns the customer to `/keranjang` with cart state intact.
- [ ] Returning to `/pembayaran` restores name, whatsapp, notes, and paymentMethod.
- [ ] Successful order placement clears the draft from localStorage.

---

### N-08 · Three-Step Checkout Progress Indicator

| | |
|---|---|
| **Audit Subject** | Cart, checkout, and payment proof pages. Files: `src/app/(storefront)/keranjang`, `/checkout` (or `/pembayaran`), and `/order/[shortCode]/bayar`. |
| **Owner** | Designer (lead) + Developer |
| **Estimated Effort** | 1 day |
| **Severity / Impact** | Medium · Conversion |

**Finding**

The customer goes through three to four screens with no visual sense of where they are in the funnel. On a small phone screen, this raises perceived effort and contributes to drop-off, especially when the customer is unsure whether the next screen is "almost done" or "still many steps to go".

**Recommended Fix**

Add a slim, three-dot stepper at the top of each storefront page in the checkout funnel. The dots show "Keranjang", "Pembayaran", "Selesai" with the current step active.

1. Create a new component at `src/app/(storefront)/_components/checkout-stepper.tsx` that takes a `current` prop with one of three values and renders three small circles connected by a thin line, with labels under each circle.
2. Use the brand `--primary` token for completed and current dots, and `--border` for upcoming dots. The connector line inherits `--border` with a transition.
3. Render the stepper on `/keranjang` (current=0), `/pembayaran` (current=1), `/pesanan/[shortCode]/bayar` (current=2 for QRIS and bank), and `/pesanan/[shortCode]` (current=2 for COD).
4. On screens narrower than 360 pixels, hide the labels under the dots and rely on the active state alone.
5. Skip the stepper entirely on the closed-round teaser and the menu landing page.

**Acceptance Criteria**

- [ ] The stepper renders correctly on all four checkout-funnel pages with the correct active step.
- [ ] On a 320-pixel-wide viewport, the stepper still fits without horizontal scroll.
- [ ] Color contrast on the stepper components meets WCAG AA.

---

### N-09 · Delivery Date Reminder on Checkout

| | |
|---|---|
| **Audit Subject** | Checkout page. File: `src/app/(storefront)/checkout/page.tsx` (or `/pembayaran`). |
| **Owner** | Developer |
| **Estimated Effort** | 0.25 day |
| **Severity / Impact** | Low · Trust |

**Finding**

On the checkout page the customer cannot see what they are committing to in terms of delivery. The round title and delivery date are on the previous screen. This violates the recognition over recall heuristic. The customer has to remember a piece of context from the prior screen at the most committal moment of the funnel.

**Recommended Fix**

Add a single-line reminder at the top of the checkout form that names the delivery date in friendly Bahasa.

1. Pass the round's `deliveryDate` and `title` from the cart context to the checkout page, or re-fetch them based on `cart.roundId`.
2. Render a small banner above the "Data pemesanan" card: "Pesanan ini akan diantar Jumat 14 November" with a Truck icon.
3. Style the banner with `--surface` background, `--border`, and `rounded-xl` to match the existing design language.

**Acceptance Criteria**

- [ ] The checkout page displays the correct delivery date for the active round.
- [ ] The banner is visible above the fold on a 360-pixel-wide viewport.

---

### N-10 · Error Message Rewrites Following What-Why-Action Structure

| | |
|---|---|
| **Audit Subject** | All storefront API routes and `toast.error` calls. Files: `src/app/api/orders/route.ts`, `/api/orders/[shortCode]/payment/route.ts`, plus all client-side error toasts. |
| **Owner** | Developer + Designer (copy) |
| **Estimated Effort** | 1 day |
| **Severity / Impact** | Medium · Conversion |

**Finding**

Microcopy at friction points is generic. Errors like "Gagal membuat pesanan" tell the customer something failed, but not why and not what to do. Stock errors mention the product name, which is good, but stop short of suggesting the next action. Generic errors at conversion-critical moments are a known driver of abandonment.

**Recommended Fix**

Adopt a structured error template across the app. Every customer-visible error message must answer three questions in order: what happened, why, and what the customer should do. Where the cause is unknowable, only the what and the suggested action are required.

1. Define a new helper in `src/lib/errors.ts` that produces error messages from a small enum of error types. Example: `errorMessage('STOCK_INSUFFICIENT', { productName, left })` returns "Cookie X kehabisan stok. Sisa hanya {left}. Hapus dari keranjang atau kurangi jumlahnya untuk lanjut."
2. Replace every hard-coded Bahasa error string in `src/app/api/orders/route.ts` with calls to this helper.
3. Replace every storefront `toast.error` call with a structured message. The fallback for unknown server errors is "Maaf, ada error saat memproses pesanan. Coba lagi sebentar atau hubungi admin via WhatsApp."
4. Audit the `proof-uploader.tsx` component for the same treatment.
5. Document the error template policy in `docs/CONTENT_GUIDE.md` (created in `N-03`).

**Acceptance Criteria**

- [ ] Every customer-visible error message follows the what-why-action template, except where the cause is genuinely unknown.
- [ ] The fallback unknown-error message is consistent across the storefront.
- [ ] Stock errors name the product, the remaining quantity, and a concrete next action.

---

### N-11 · Voice and Tone Microcopy Guide

| | |
|---|---|
| **Audit Subject** | All storefront copy. New file: `docs/VOICE_GUIDE.md`. |
| **Owner** | Designer |
| **Estimated Effort** | 0.5 day (writing) + 0.5 day (sweep) |
| **Severity / Impact** | Low · Brand |

**Finding**

The Bahasa copy is warm in some places ("Pesananmu sudah masuk ke dapur", "Yuk pilih cemilan dulu") and more neutral in others ("Pesananmu akan otomatis muncul di sini setelah kamu checkout"). The voice drifts. There is no documented standard, so future contributors will keep drifting.

**Recommended Fix**

Write a one-page voice guide and apply it as a sweep across every customer-visible string. Short, opinionated, and enforceable.

1. Create `docs/VOICE_GUIDE.md` with five rules. Recommended draft:
   1. Informal but not sloppy.
   2. Second-person "kamu", never "Anda".
   3. Sentences short. Aim for under 12 words.
   4. No exclamation marks except in the post-checkout success block.
   5. Describe food physically, not emotionally. "Cookie cokelat dengan garam laut", not "Cookie favorit semua orang".
2. Add a translation table in the same file for the most common UI strings, so future contributors copy from the table rather than improvise.
3. Sweep every storefront page and component once with the guide in hand. Note that this sweep should follow `N-03` and `N-10` so they do not conflict.

**Acceptance Criteria**

- [ ] `docs/VOICE_GUIDE.md` exists and is referenced from the README and from `docs/CONTENT_GUIDE.md`.
- [ ] Every customer-visible string in the storefront passes a manual check against the five rules.
- [ ] The sweep introduces no functional changes, only copy changes.

---

### N-12 · HTML lang Attribute Fix for Admin Section

| | |
|---|---|
| **Audit Subject** | Root layout. File: `src/app/layout.tsx`. |
| **Owner** | Developer |
| **Estimated Effort** | 0.25 day |
| **Severity / Impact** | Low · Accessibility |

**Finding**

The root layout sets `lang="id"` on the html element. The admin section is entirely in English. A screen reader configured for Bahasa Indonesia will pronounce English admin labels with Bahasa phonetics, which is unintelligible.

**Recommended Fix**

Set the lang attribute conditionally based on whether the route is in the admin area.

1. Move the html and body tags out of the root layout into separate layouts for the storefront route group and the admin route group.
2. The storefront layout sets `lang="id"`. The admin layout sets `lang="en"`. The login layout, reached when not authenticated, can also set `lang="en"` since the login form is in English.
3. Verify with a screen reader on each route that pronunciation matches the language of the visible text.

**Acceptance Criteria**

- [ ] Storefront pages render with `html lang="id"`.
- [ ] Admin pages render with `html lang="en"`.
- [ ] Screen reader voice switches accordingly when navigating between the two areas.

---

### N-13 · Decorative Alt Text for Adjacent Product Images

| | |
|---|---|
| **Audit Subject** | Product image rendering. Files: `src/app/(storefront)/_components/product-card.tsx`, `/keranjang/page.tsx`, `/checkout/page.tsx`, `/order/[shortCode]/page.tsx`. |
| **Owner** | Developer |
| **Estimated Effort** | 0.25 day |
| **Severity / Impact** | Low · Accessibility |

**Finding**

Product images use the product name as alt text. When the product name is also rendered as visible text immediately next to the image, screen readers announce the same name twice. This is mild noise but a known a11y annoyance.

**Recommended Fix**

Mark images as decorative when their adjacent text already conveys the product identity.

1. In `product-card.tsx`, the image is the primary anchor for the card and the name is below it. Keep `alt={product.name}`.
2. In `keranjang/page.tsx`, the image and the name are side by side as siblings inside the cart row. Change alt to `alt=""` on the Image component, since the name is already announced.
3. Apply the same change in `checkout/page.tsx` (order summary thumbnails) and `order/[shortCode]/page.tsx` (confirmation summary thumbnails).
4. On admin pages where the same pattern exists (orders detail, products list mobile view), apply the same rule.

**Acceptance Criteria**

- [ ] VoiceOver or TalkBack announces the product name once per cart row, not twice.
- [ ] No regressions on the product card itself, where image-alt-as-name is still valuable.

---

## Phase 2 — NEXT (Weeks 3–6)

Phase 2 matures the product from a personal tool into a small business platform. The work is grouped around three themes: brand unification (`X-01`, `X-10`), payment flow hardening and risk reduction (`X-04`, `X-06`), and operator productivity (`X-02`, `X-03`, `X-09`, `X-15`). Two performance and accessibility items (`X-07`, `X-11`, `X-12`, `X-16`) sit alongside as no-regret upgrades.

**Recommended sequencing across four to six weeks.**

| Week | Tickets |
|---|---|
| 1 | `X-10`, start `X-01` (token consolidation enables clean re-skin) |
| 2 | finish `X-01`, ship `X-08`, `X-15` |
| 3 | `X-02`, `X-03` (orders consolidation plus search) |
| 4 | `X-04` (the largest single ticket) |
| 5 | `X-05`, `X-06`, `X-13` in parallel |
| 6 | `X-07`, `X-09`, `X-11`, `X-12`, `X-14`, `X-16` cleanup |

---

### X-01 · Re-skin Admin Back Office onto Storefront Design Tokens

| | |
|---|---|
| **Audit Subject** | All admin routes and components. Files: `src/app/admin/**`, `src/components/ui/**`. |
| **Owner** | Designer (lead) + Developer |
| **Estimated Effort** | 5 days |
| **Severity / Impact** | High · Brand |

**Finding**

The storefront uses a warm cream and coffee palette, italic Playfair headings, and rounded-2xl cards with soft shadows. The back office uses zinc-50 backgrounds, sharp border-radii, and the standard shadcn-style Card and Table primitives. The two route groups feel like different products. This is the brand schism flagged in the executive summary. It signals "hobby project" to anyone who sees both halves of the product, and it lowers the operator's daily pride in the work.

**Recommended Fix**

Re-skin the admin onto the same design tokens as the storefront, but in a denser, more utilitarian variant. Operators read more text per minute than customers, so density matters. This is not about copying the storefront aesthetic verbatim. It is about establishing a single design system with two density modes.

1. Create a second token layer in `src/app/globals.css` for admin density. Recommended additions: `--admin-bg #f6f1e8` (slightly cooler cream than storefront `--background`), `--admin-surface #ffffff`, `--admin-border` same as `--border`, `--admin-foreground` same as `--foreground`, `--admin-muted` darkened version per `N-04`.
2. Update `src/components/ui/card.tsx`, `table.tsx`, and `input.tsx` to read from the admin tokens when rendered inside the admin layout. The cleanest approach is to add a `density` prop on the layout that toggles a CSS class on the admin shell, and the UI primitives respond to that class.
3. Restyle the admin sidebar and top bar in `src/app/admin/_components/admin-shell.tsx` to use `--admin-surface`, `--admin-border`, and Geist for body, with Playfair only on the page-level headings. Keep the icon set unchanged.
4. Round corners to `rounded-lg` (not `rounded-2xl`) for the admin to maintain density.
5. Replace `bg-zinc-50` main area with `bg-[var(--admin-bg)]`. Replace `bg-white` card surfaces with `bg-[var(--admin-surface)]`.
6. Update status badge colors to use the brand tokens for warning, success, info, destructive, instead of Tailwind defaults.
7. Audit each admin page and replace any remaining hard-coded zinc, gray, amber, green, red references with token-based equivalents.

> Do this work behind a feature flag for one release. The owner should be able to toggle between the old and new admin theme until they are sure the density tradeoffs work for them.

**Acceptance Criteria**

- [ ] All admin pages render with the new tokens and no remaining `zinc-N` or `gray-N` classes outside of explicitly intentional uses.
- [ ] Switching from `/admin` to `/` and back feels like the same product family.
- [ ] All admin functionality remains intact, including filter pills, bulk actions, and modals.
- [ ] The owner approves the density tradeoff before the feature flag is removed.

---

### X-02 · Consolidate Order Management into Single Canonical Interface

| | |
|---|---|
| **Audit Subject** | Order management routes. Files: `src/app/admin/orders/page.tsx`, `/admin/rounds/[id]/orders/page.tsx`, plus the `OrdersTable` and `GlobalOrdersTable` components. |
| **Owner** | Developer + Designer |
| **Estimated Effort** | 5 days |
| **Severity / Impact** | High · Operator |

**Finding**

Orders can be accessed via `/admin/orders` (cross-round, time-windowed) or `/admin/rounds/[id]/orders` (per-round). The two interfaces are not visually distinguished, and the round-level page holds the more powerful features (bulk actions, filter pills, search, cancellation flow with stock restore confirmation), while the cross-round page is feature-poor. The operator gravitates to one and finds features missing in the other. The redundant hierarchy also adds cognitive load.

**Recommended Fix**

Promote `/admin/orders` to be the single canonical orders interface. Replace the per-round duplicate with a deep-link pattern that filters the canonical interface by round.

1. Rebuild `/admin/orders` to host the full feature set currently on the round page: filter pills (all, needs-verify, awaiting-payment, ready-to-deliver), search input, bulk select with mark-confirmed and cancel actions, and the time window pills.
2. Add a new filter dimension: "Round" as a select that lists all rounds with the open round at top and most recent first. The dropdown defaults to "Open round" when one exists, otherwise "All rounds".
3. Replace `/admin/rounds/[id]/orders` with a redirect to `/admin/orders?round=[id]`. The round details page (with title, deliveryDate, totals, CSV export, BulkDelivered button) moves into a header card on the consolidated `/admin/orders` when a specific round is selected.
4. Move the per-round CSV export endpoint reference so that on `/admin/orders?round=[id]` the Export CSV button points to `/api/admin/rounds/[id]/orders.csv`.
5. Move the `BulkDelivered` button into the round-context header, visible only when a specific round is selected.
6. Update navigation links from the dashboard's three work-queue cards to use `/admin/orders?round=[openRoundId]&filter=needs-verify` (and similar) so the existing flow still works.

> Add a "Saved views" affordance for free as part of this consolidation. The owner can bookmark `/admin/orders?round=open&filter=needs-verify` and that becomes their daily start page. Document this pattern in the README.

**Acceptance Criteria**

- [ ] There is a single page that shows orders, regardless of whether the user is filtering by round or by time.
- [ ] All Phase 1 admin functionality continues to work, including search, bulk actions, and CSV export.
- [ ] The dashboard cards still navigate the operator into the right pre-filtered view.
- [ ] The old `/admin/rounds/[id]/orders` URL still resolves via redirect for at least one release.

---

### X-03 · Global Admin Search by Code, Name, or WhatsApp

| | |
|---|---|
| **Audit Subject** | Admin shell. Files: `src/app/admin/_components/admin-shell.tsx` and a new `/api/admin/search` endpoint. |
| **Owner** | Developer |
| **Estimated Effort** | 2 days |
| **Severity / Impact** | Medium · Operator |

**Finding**

There is no global search across orders. The cross-round page shows the latest 200, the round page shows that round, and there is no way to find an order by short code, customer name, or WhatsApp number from anywhere except those tables. When the operator gets a WhatsApp from a customer, the natural action is "find that order". The app currently makes that hard.

**Recommended Fix**

Add a header-level search input in the admin shell with a CMD-K keyboard shortcut, server-side fuzzy search over short code, customer name, and customer WhatsApp.

1. Add a search input in the admin shell sidebar (top of the nav, above the menu items). The input is keyboard-focusable via Cmd-K on macOS and Ctrl-K on Windows / Linux.
2. Build `/api/admin/search?q=...&limit=8` that returns a small array of `OrderHit`, `CustomerHit`, and `RoundHit` objects. The endpoint requires admin auth.
3. **OrderHit.** Match on `Order.shortCode` containing the query (case-insensitive), or on `Order.customerName ILIKE %q%`, or on normalized `customerWhatsApp` containing the digits-only version of the query. Return `shortCode`, `customerName`, `status`, `totalAmount`, `createdAt`.
4. **CustomerHit.** Group orders by `customerWhatsApp` and return the most recent order's customer name with the WhatsApp number.
5. **RoundHit.** Match on `PreorderRound.title ILIKE %q%`. Return `id`, `title`, `status`.
6. Render results in a popover under the search input as a stacked list with simple icons. Tapping a result navigates to `/admin/orders/[shortCode]`, `/admin/customers/[whatsapp]`, or `/admin/orders?round=[id]`.
7. Throttle requests to one every 200 ms while typing.

**Acceptance Criteria**

- [ ] Cmd-K or Ctrl-K focuses the search input from any admin page.
- [ ] Typing "LN-" returns matching orders. Typing a partial name returns matching customers. Typing digits returns matching WhatsApp numbers. Typing a partial round title returns matching rounds.
- [ ] Results appear within 300 ms on a typical broadband connection.
- [ ] Tapping a result navigates to the correct destination.

---

### X-04 · Move Payment Proof Upload onto Checkout Screen with Soft Hold

| | |
|---|---|
| **Audit Subject** | Checkout and payment proof flows. Files: `src/app/(storefront)/checkout/page.tsx`, `/order/[shortCode]/bayar/page.tsx`, `/api/orders/route.ts`, plus `prisma/schema.prisma`. |
| **Owner** | Developer + Designer |
| **Estimated Effort** | 5 days |
| **Severity / Impact** | High · Risk |

**Finding**

Stock currently decrements at order placement, before payment. A customer who abandons mid-checkout (closes the tab, fails to pay, simply forgets) phantom-allocates stock until the operator manually cancels the order. Combined with no rate limit on the order creation endpoint, this also creates a low-cost attack vector.

Additionally, the payment proof upload is on a separate page reached only after order creation. This forces a context switch at the most committal moment of the funnel.

**Recommended Fix**

Introduce a soft-hold pattern. When the customer creates a QRIS or bank transfer order, the order is created with status `PENDING_PAYMENT` but stock is held with an expiry timestamp. If proof is not uploaded within 30 minutes, a background job releases the hold and cancels the order. Move the proof upload into the same screen as the rest of checkout for QRIS and bank transfer.

1. **Schema change.** Add `stockHoldExpiresAt: DateTime?` to `Order`, and add a status value `HOLD_EXPIRED` to `OrderStatus`. Migrate.
2. On order creation in `/api/orders/route.ts`, set `stockHoldExpiresAt` to `now + 30 minutes` for QRIS and bank transfer payment methods. COD orders do not need a hold.
3. Add a background reconciler. Either a Vercel cron route at `/api/admin/cron/release-holds` (recommended for low ops overhead) that runs every 5 minutes, or a check inside `/api/orders/route.ts` that runs lazily on each new order creation. The reconciler finds all orders where `status='PENDING_PAYMENT' AND stockHoldExpiresAt < now` AND no payment proof is uploaded, sets `status='HOLD_EXPIRED'`, restores stock, and writes a status event with `actor='system'`.
4. When the customer uploads payment proof, clear `stockHoldExpiresAt` so the hold is no longer subject to expiry.
5. Move the proof upload UI from `/order/[shortCode]/bayar` onto a "Payment" card on `/pembayaran` for QRIS and bank transfer methods. The card appears below the existing "Metode pembayaran" card after the customer fills in their name and WhatsApp.
6. Show a live countdown on the checkout payment card: "Selesaikan pembayaran dalam 29:45" so the customer is aware of the hold window.
7. On submission, the order is created and the proof is uploaded in a single multi-part request. If proof upload fails after order creation, the order is created with no proof and the customer is redirected to the existing `/order/[shortCode]/bayar` page as a fallback.
8. Add a per-IP rate limit on `/api/orders`. Recommend 5 requests per minute per IP using Vercel Edge config or a small Redis instance, since the order creation transaction is the most expensive endpoint in the app.

> Communicate this change to the operator. The dashboard's "Awaiting payment" and "Need to verify" counts behave the same. A new status `HOLD_EXPIRED` appears occasionally and should be invisible to the operator's day-to-day work.

**Acceptance Criteria**

- [ ] QRIS and bank transfer orders created without uploaded proof are auto-cancelled 30 minutes later, with stock restored.
- [ ] QRIS and bank transfer customers complete the proof upload on the same screen where they entered their details.
- [ ] COD orders skip the hold and behave as before.
- [ ] The `/api/orders` rate limit blocks abusive bursts but does not affect normal checkout traffic.
- [ ] All status transitions are logged in `OrderStatusEvent` with the correct actor.

---

### X-05 · WhatsApp Number Normalization to E.164 with Customer Deduplication

| | |
|---|---|
| **Audit Subject** | Customer identity. Files: `src/lib/utils.ts` (`normalizeWhatsApp`), `src/lib/validators.ts`, `prisma/schema.prisma`, `src/app/admin/customers/[whatsapp]/page.tsx`. |
| **Owner** | Developer |
| **Estimated Effort** | 2 days |
| **Severity / Impact** | Medium · Operator |

**Finding**

The same person typing `0812...`, `62812...`, or `+62812...` in different rounds may appear as separate customers in the customers drilldown, depending on how normalization is applied at write time. The current `normalizeWhatsApp` helper exists but is not consistently the source of truth on storage.

**Recommended Fix**

Always store WhatsApp numbers as E.164 (no plus sign, leading 62 for Indonesia). Migrate existing data. Make the customers index dedupe by normalized number.

1. Audit `src/lib/utils.ts` `normalizeWhatsApp` to confirm it produces a canonical form. Recommend stripping all non-digit characters, then if it starts with 0 replace with 62, then assert it starts with 62 followed by 9 to 13 digits.
2. In the `Order` model, add a `normalizedWhatsApp` column that mirrors `customerWhatsApp` but is always written through the normalizer. Index it. Backfill existing rows by running a one-off migration script that reads each Order and rewrites the column.
3. Update `validators.ts` `checkoutSchema` to write the normalized form into both `customerWhatsApp` and `normalizedWhatsApp`.
4. In the customers drilldown route `/admin/customers/[whatsapp]`, use the normalized column for the lookup. Decode the URL param and re-normalize before querying so an admin pasting a raw `0812...` URL still works.
5. When admin search (`X-03`) queries by WhatsApp, search against the normalized column.
6. Add a small Customer object in the admin orders table that links to `/admin/customers/[normalizedWhatsApp]` from each row.

**Acceptance Criteria**

- [ ] Every Order row has a `normalizedWhatsApp` value in canonical `62NNNNNNNNN` format.
- [ ] An order placed by `0812...` and a later order by `+62812...` show under the same customer page.
- [ ] All customers-drilldown pages continue to work.

---

### X-06 · COD Order Admin Confirmation Gate and Rate Limiting

| | |
|---|---|
| **Audit Subject** | Order creation. Files: `src/app/api/orders/route.ts` and admin order detail page. |
| **Owner** | Developer |
| **Estimated Effort** | 1.5 days |
| **Severity / Impact** | Medium · Risk |

**Finding**

COD orders go straight to `CONFIRMED` status without admin gating. Stock decrements on placement. Anyone who guesses the form structure could place fake COD orders that consume stock until the admin notices. At small scale this is theoretical, but the cost of fixing it is small and the cost of getting griefed by an unhappy ex-colleague is real.

**Recommended Fix**

Introduce a new status for COD orders that requires admin confirmation before stock is fully committed. Combined with `X-04`'s rate limit, this neutralizes the spam-COD attack vector.

1. **Schema change.** Add status value `PENDING_CONFIRMATION` to `OrderStatus` enum (between `PENDING_PAYMENT` and `CONFIRMED` in the lifecycle).
2. On order creation in `/api/orders/route.ts`, set initial status to `PENDING_CONFIRMATION` when `paymentMethod` is COD, instead of `CONFIRMED`.
3. Treat `PENDING_CONFIRMATION` as a soft hold: stock is decremented but the order is flagged in the admin work queue.
4. Add a fourth dashboard card "Need confirmation" that counts COD orders in `PENDING_CONFIRMATION`. Tapping it filters the orders page accordingly.
5. Add an admin action "Confirm order" that transitions `PENDING_CONFIRMATION` to `CONFIRMED`.
6. Update customer-facing copy on the order confirmation page to reflect the new state for COD: "Pesanan kamu lagi dicek admin. Kamu akan dapat konfirmasi via WhatsApp dalam beberapa jam."

**Acceptance Criteria**

- [ ] New COD orders land in `PENDING_CONFIRMATION` until the admin confirms.
- [ ] The dashboard surfaces a fourth work queue with an accurate count.
- [ ] Customer order confirmation copy reflects the pending state correctly.

---

### X-07 · Native Radio Fieldset for Payment Method Selection

| | |
|---|---|
| **Audit Subject** | Checkout payment method selector. File: `src/app/(storefront)/checkout/page.tsx` (or `/pembayaran`). |
| **Owner** | Developer + Designer |
| **Estimated Effort** | 1 day |
| **Severity / Impact** | Medium · Accessibility |

**Finding**

The payment method selector is built with custom button elements styled to look like radios. There is no `role="radiogroup"`, no `role="radio"`, and keyboard arrow-key navigation between options does not work as it would with native radios. Screen readers do not announce the group correctly.

**Recommended Fix**

Refactor to native `fieldset` and `radio` inputs, visually styled to match the current design.

1. Wrap the payment method group in a `fieldset` with a visually-hidden `legend` reading "Metode pembayaran".
2. Replace each option with a `label` wrapping a hidden `input type="radio"` with `name="paymentMethod"` and the option value. Use `aria-describedby` on each label that points to the description text inside the same option block.
3. Style the labels using the existing visual treatment with `peer-checked` variants. Use the radio's `:checked` CSS state to drive the visual selected state, replacing the current state-managed style toggling.
4. Replicate the same pattern for the QRIS / Bank Transfer sub-method group when the parent "Bayar sekarang" is selected.
5. Verify keyboard navigation: arrow keys move between options and Space selects.
6. Verify screen reader output: "Metode pembayaran, group, 3 items, Bayar sekarang, radio button, 1 of 3, selected".

**Acceptance Criteria**

- [ ] Tab navigation enters the radio group and arrow keys move between options.
- [ ] VoiceOver and TalkBack announce the group, the current option, and the position correctly.
- [ ] Visual design is preserved across desktop and mobile.

---

### X-08 · Visual Separation of Destructive Admin Actions

| | |
|---|---|
| **Audit Subject** | Order status actions. File: `src/app/admin/orders/[shortCode]/status-actions.tsx`. |
| **Owner** | Designer + Developer |
| **Estimated Effort** | 0.5 day |
| **Severity / Impact** | Medium · Risk |

**Finding**

Status transitions are rendered as buttons in a flat row. There is no visual distinction between the happy path (Verify payment → Mark confirmed → Mark delivered) and the destructive path (Cancel order). On a long-running screen with caffeine, this is a low-grade safety risk. The pattern already used for permanent delete (a "Danger zone" separator) should be extended to the cancel action.

**Recommended Fix**

Move "Cancel order" into a clearly-labeled Danger zone block separate from the happy-path actions, and require a confirmation step.

1. Split the `OrderStatusActions` component into two card sections. The top section is "Actions" with the happy-path transitions only. The bottom section is "Danger zone" with a divider, the Cancel order button styled destructive, and a one-line warning.
2. Tapping Cancel order opens a confirmation sub-state inside the same card with the message "Cancel this order? Stock will be restored and the customer will be notified via WhatsApp link." and two buttons, "Yes, cancel" and "Back". Mirror the existing "Delete order permanently" pattern.
3. Apply the same separation in the bulk cancel action of the orders table (already partially in place via `confirmingCancel`).

**Acceptance Criteria**

- [ ] On the order detail page, the Cancel order button is no longer adjacent to the Mark delivered button.
- [ ] Cancel requires a confirmation tap.
- [ ] Bulk cancel still uses its existing confirmation flow with no regressions.

---

### X-09 · Duplicate Last Round Action on Rounds List

| | |
|---|---|
| **Audit Subject** | Rounds management. File: `src/app/admin/rounds/page.tsx` and a new server action. |
| **Owner** | Developer |
| **Estimated Effort** | 0.5 day |
| **Severity / Impact** | Low · Operator |

**Finding**

Most rounds reuse most products from the previous round at similar prices and similar stock levels. The owner currently builds each round from scratch by re-adding products and re-typing prices. The existing Duplicate action on products already shows the team understands this pattern. It is missing for rounds, which is where the operator burden is highest.

**Recommended Fix**

Add a "Duplicate last round" button on the rounds page that opens the new-round form pre-filled from the most recent round.

1. Add a Duplicate button on each row of the rounds table, mirroring the products table's Duplicate button.
2. Add a "Duplicate last" button next to the "New round" button at the top of the page that targets whichever round was created most recently.
3. Both buttons navigate to `/admin/rounds/new?from=[id]`. The new-round page reads the `from` query param, fetches the source round, and pre-fills `title` (with a date adjustment per `N-05`), `opensAt`, `closesAt` (offset by 7 days from the source), `deliveryDate` (offset by 7 days), bank details, items list (`productId`, `price`, `stockLimit`), and `qrisImageUrl`.
4. Do not copy `stockSold`. The new round starts at zero.
5. Allow the owner to edit any pre-filled value before saving.

**Acceptance Criteria**

- [ ] Tapping Duplicate creates a new draft round pre-filled with the source round's product list and prices.
- [ ] Dates are offset by 7 days by default, editable.
- [ ] The bank and QRIS settings are copied.
- [ ] Saving creates a brand new `PreorderRound` row, not a modification of the source.

---

### X-10 · Promote Inline Hex Colors to Semantic Design Tokens

| | |
|---|---|
| **Audit Subject** | Storefront component styling. Files: `src/app/(storefront)/_components/*`, `src/app/globals.css`. |
| **Owner** | Designer (system) + Developer (sweep) |
| **Estimated Effort** | 1.5 days |
| **Severity / Impact** | Low · Brand |

**Finding**

Despite a token system in `globals.css`, components contain at least seven inline hex values (`#f3ede1`, `#fff8eb`, `#fef1de`, `#ebe3d4`, `#1f1610`, `#fdf9f1`, `#f0fae0`, `#25d366`) that bypass the system. Changing the brand later requires search-and-replace, not a token edit. This signals an aspirational design system rather than an enforced one.

**Recommended Fix**

Audit every inline hex value, group them into semantic categories, promote each to a token, and refactor the components.

1. Run a regex sweep of `src/app/(storefront)` and `src/components` for the patterns `bg-\[#...` and `text-\[#...` and similar. List every match.
2. Categorize the matches into semantic roles. Recommended categorization:
   - Surface variants: `--surface-warm-1` (`#f3ede1`), `--surface-warm-2` (`#fff8eb`), `--surface-warm-3` (`#fef1de`), `--surface-cool-1` (`#fdf9f1`), `--surface-success-light` (`#f0fae0`).
   - Border variant: `--border-subtle` (`#ebe3d4`).
   - Hover-darker primary: `--primary-hover` (`#1f1610`).
   - Communication green: `--whatsapp-green` (`#25d366`).
3. Add the new tokens to `globals.css` under the existing brand block.
4. Refactor each component to reference the new tokens.
5. Add an ESLint rule or a pre-commit grep that fails the build if a new inline hex appears outside `globals.css`.

**Acceptance Criteria**

- [ ] Every storefront and admin component reads its colors from named tokens in `globals.css`.
- [ ] `globals.css` contains no more than the documented set of brand tokens, with comments explaining each.
- [ ] An attempt to commit a new inline hex outside `globals.css` fails CI.

---

### X-11 · Image Optimization Restoration with Supabase Remote Patterns

| | |
|---|---|
| **Audit Subject** | Image rendering pipeline. Files: `next.config.ts`, all components using `next/image`. |
| **Owner** | Developer |
| **Estimated Effort** | 1 day |
| **Severity / Impact** | Medium · Performance |

**Finding**

`next.config.ts` sets `images.unoptimized: true`. The README explains this is a workaround for a Next 16 quirk with `remotePatterns` and Supabase URLs. The cost is real. Customers in Indonesia on 4G load full-resolution Supabase images on a product grid with potentially ten or more items. This is the single largest perceived-performance liability in the app.

**Recommended Fix**

Resolve the `remotePatterns` issue and re-enable image optimization. Use AVIF and WebP. The work is small but high-leverage.

1. Investigate the original Next 16 quirk. Common cause is that the Supabase storage URL contains a port or a non-standard hostname. Inspect the actual public URL pattern from a real Supabase bucket and configure `remotePatterns` accordingly.
2. Update `next.config.ts` to remove `unoptimized` and add a `remotePatterns` entry like `{ protocol: 'https', hostname: '[your-project-ref].supabase.co', pathname: '/storage/v1/object/public/le-nouette/**' }`.
3. Verify that all `next/image` instances pass appropriate `sizes` attributes. The product card uses `sizes="(min-width: 640px) 50vw, 100vw"` which is correct. Cart thumbnails should pass `sizes="80px"`.
4. Test on a throttled "Slow 3G" Chrome DevTools profile. Verify that AVIF or WebP variants are served and that LCP is under 2.5 seconds on the storefront landing.
5. Add `formats: ['image/avif', 'image/webp']` to `next.config.ts` images config.

**Acceptance Criteria**

- [ ] `images.unoptimized` is removed from `next.config.ts`.
- [ ] Storefront images load as AVIF or WebP variants with appropriate `srcset`.
- [ ] Lighthouse Performance score on storefront is at least 90 on a simulated mid-tier mobile.
- [ ] LCP on the storefront landing is under 2.5 seconds on Slow 3G.

---

### X-12 · Static Generation with On-Demand Revalidation for Storefront

| | |
|---|---|
| **Audit Subject** | Storefront landing page rendering strategy. File: `src/app/(storefront)/page.tsx`. |
| **Owner** | Developer |
| **Estimated Effort** | 1 day |
| **Severity / Impact** | Medium · Performance |

**Finding**

Every storefront route is currently marked `dynamic = 'force-dynamic'`. Vercel server-renders every visit. For an audience that arrives in bursts via a single shared WhatsApp link, this means a TTFB penalty on every visit even though the underlying data changes only when the round status flips or the operator edits products. Static generation with on-demand revalidation is a much better fit.

**Recommended Fix**

Switch the storefront landing to revalidation-based rendering. Trigger revalidation on round status transitions and product edits.

1. Replace `export const dynamic = 'force-dynamic'` with `export const revalidate = 60` on the storefront landing page.
2. Identify all writes that affect what the storefront renders: round status changes (open/close/deliver/cancel), round product additions or stock edits, and product image edits. For each, after the database write, call `revalidatePath('/')` from a server action or a Route Handler.
3. Apply the same pattern to the order confirmation page, but keep that one dynamic since it is private and short-lived.
4. Verify on Vercel that the storefront is now served from the edge cache between revalidations.
5. Stress-test with a synthetic burst of 100 visits to the landing page. Confirm TTFB drops by at least 50 percent versus the baseline.

**Acceptance Criteria**

- [ ] Storefront landing serves from cache between round-status changes.
- [ ] Round transitions trigger an immediate revalidation, so customers see the new state within seconds.
- [ ] TTFB on the landing page is under 200 ms on a warm cache.

---

### X-13 · Polled Order Status Indicator After Proof Upload

| | |
|---|---|
| **Audit Subject** | Order confirmation page. File: `src/app/(storefront)/order/[shortCode]/page.tsx`. |
| **Owner** | Developer |
| **Estimated Effort** | 1 day |
| **Severity / Impact** | Medium · Trust |

**Finding**

After uploading payment proof, the customer lands on the order confirmation page with a "Menunggu pembayaran" badge. The page does not auto-update when the admin verifies the payment. The customer either refreshes the page hoping to see the change or messages the admin via WhatsApp asking "Sudah dicek?". Both outcomes are bad: refresh fatigue or extra operator load.

**Recommended Fix**

Add a lightweight client-side poll that re-fetches order status every 30 seconds while the order is in `PENDING_PAYMENT`, with a graceful indicator of the live update.

1. Add a small client component on the order confirmation page named `OrderStatusPoller` that takes the initial status as a prop and polls `/api/orders/[shortCode]/status` every 30 seconds when status is `PENDING_PAYMENT` or `PENDING_CONFIRMATION`.
2. On status change, refetch the page data. The badge updates and a soft toast announces "Pembayaran diterima" or "Pesanan dikonfirmasi".
3. Stop polling once the status reaches `CONFIRMED`, `DELIVERED`, or `CANCELLED`.
4. Build `/api/orders/[shortCode]/status` as a tiny endpoint that returns just `status` and `updatedAt`. No auth needed since the order short code itself is the access token (with the access-token split planned in `L-08`, this becomes more secure).
5. Show a quiet "Diperiksa setiap 30 detik" helper text under the status badge, so the customer understands the page is live.

**Acceptance Criteria**

- [ ] After admin marks an order PAID, the customer's order page updates the badge within 30 seconds without refresh.
- [ ] Polling stops once the order reaches a terminal status.
- [ ] The polling indicator is visible but not visually noisy.

---

### X-14 · Confirmation Step on Checkout Submit and Undo on Cart Removal

| | |
|---|---|
| **Audit Subject** | Cart and checkout pages. Files: `src/app/(storefront)/keranjang/page.tsx`, `/checkout/page.tsx`. |
| **Owner** | Developer |
| **Estimated Effort** | 1 day |
| **Severity / Impact** | Low · Conversion |

**Finding**

Two error-prevention gaps. The checkout submit places the order with no confirmation step, even though the action is committal (stock decrements, an order short code is generated). The cart "Hapus" button removes immediately with no undo, even though removal is destructive in a small way: the customer has to find and re-add the product.

**Recommended Fix**

Apply the standard mobile-app pattern. Confirm the committal action with a single extra tap. Soft-delete cart items with a 5-second undo toast.

1. On checkout submit, replace the immediate POST with a small modal that shows the total, the delivery date, and the chosen payment method, with two buttons "Kembali" and "Konfirmasi pesanan". Only the second button triggers the actual POST.
2. On cart item removal, immediately remove the item from the cart state but show a Sonner toast with action: "Cookie X dihapus" and a "Batalkan" button. Tapping Batalkan within 5 seconds restores the item with the same quantity.
3. If the customer leaves the page within the 5 seconds, the removal sticks.

**Acceptance Criteria**

- [ ] Submitting the checkout form opens a confirmation modal, not an immediate API call.
- [ ] Removing a cart item shows an undo toast that successfully restores the item if tapped in time.
- [ ] The undo path is keyboard accessible.

---

### X-15 · Bulk Action Count-Aware Preview and Confirmation

| | |
|---|---|
| **Audit Subject** | Admin bulk actions. Files: `src/app/admin/rounds/[id]/orders/orders-table.tsx` and `bulk-delivered-button.tsx`. |
| **Owner** | Developer + Designer (microcopy) |
| **Estimated Effort** | 0.5 day |
| **Severity / Impact** | Low · Risk |

**Finding**

The bulk "Mark delivered" button currently shows no count-aware confirmation. The bulk cancel does, but the mark-confirmed and mark-delivered actions do not. For an action that touches potentially every order in a round, a quick "Mark 14 orders as delivered?" check is cheap insurance.

**Recommended Fix**

Add a count-aware preview to every bulk action, mirroring the existing pattern used for bulk cancel.

1. Wrap the `BulkDeliveredButton` click in a confirm sub-state. Show "Mark N orders delivered?" with two buttons.
2. Apply the same pattern to the bulk Mark confirmed action in `OrdersTable.tsx`.
3. Keep the existing pattern for bulk cancel as-is.

**Acceptance Criteria**

- [ ] All bulk actions confirm with a count before executing.
- [ ] The confirmation can be dismissed without firing.

---

### X-16 · Performance: Consolidate Storefront localStorage Reads

| | |
|---|---|
| **Audit Subject** | Storefront client-side hydration. Files: `src/components/cart-provider.tsx`, `src/app/(storefront)/_components/storefront-header.tsx`. |
| **Owner** | Developer |
| **Estimated Effort** | 0.5 day |
| **Severity / Impact** | Low · Performance |

**Finding**

On storefront mount, three separate localStorage reads happen: cart, customer, and order history. Each has its own try-catch and JSON.parse, and each triggers a separate re-render via `setState`. On slow Android devices the cumulative cost is visible as a brief flash of the empty header followed by the populated header.

**Recommended Fix**

Consolidate the three reads into a single context hydration on mount, exposing all three slices through one provider.

1. Extend `CartProvider` to also load and expose `customer` and `orderHistory` on the same mount effect. The new context shape is `{ cart, customer, orderHistory, hydrated, ...mutators }`.
2. Update `StorefrontHeader` to read order history from the context instead of reading localStorage directly. Remove the separate `hasOrders` `useState` and `useEffect`.
3. Update `CheckoutPage`'s `readCustomer` call to read from the context.
4. Update `MyOrdersPage` at `/pesanan` to read order history from the context, but keep the local mutators for delete.
5. Ensure the hydration flag flips exactly once.

**Acceptance Criteria**

- [ ] Only one localStorage read happens on storefront mount.
- [ ] The header populates with cart count and orders icon in a single render after hydration.
- [ ] No regressions in cart, customer, or order history behavior.

---

## Phase 3 — LATER (Quarter horizon)

Phase 3 introduces compounding behavior. The Phase 1 and Phase 2 work was about closing gaps. Phase 3 is about creating loops. The single most important item in this phase is `L-01`, the outbound notification system, because it activates the dormant value of the notify-me list created in Phase 1 and turns the business into something that grows when the owner is asleep.

The phase is lower-pressure than the first two. Items can be parallelized or delivered out of order based on what the owner most wants. A reasonable sequencing:

1. Ship `L-01` first to activate retention.
2. Ship `L-02` and `L-03` next to support repeat purchase end-to-end.
3. Ship `L-08` next to clean up the order code identity model.
4. Ship the remaining items in any order based on owner appetite.

---

### L-01 · Outbound WhatsApp Notification System for New Rounds

| | |
|---|---|
| **Audit Subject** | Notification infrastructure. New service. Touches: `NotifySubscriber` model from `N-01`, round status transition handlers in `/admin/rounds/actions.ts`. |
| **Owner** | Developer + Operator (account setup) |
| **Estimated Effort** | 5 days |
| **Severity / Impact** | High · Retention |

**Finding**

The single most important growth lever for a preorder business is repeat purchase. The current product has no automated way to bring past customers back. The owner sends WhatsApp messages manually each round, which is exactly the workflow the app was built to replace. The notify-me list captured in `N-01` is dormant until this ticket activates it.

**Recommended Fix**

Pick a WhatsApp Business API provider, build a small outbound service that sends a templated message to all `NotifySubscribers` when a round transitions to OPEN, and add an opt-out path.

1. **Pick a provider.** For Indonesia, recommended options are Wati, Twilio (with Indonesia local routing), or a direct WhatsApp Business API account if the volume justifies it. Cost considerations: most providers charge per message, and a 200-subscriber list at one round per week is roughly 800 messages a month, which is well within the cheapest tier of any provider.
2. Add provider credentials to env vars. Add a small client wrapper at `src/lib/notifications.ts` that exposes `sendNewRoundNotification(subscriber, round)`.
3. When a round transitions to OPEN status (in `/admin/rounds/actions.ts`), enqueue notifications for all `NotifySubscribers` where `optedOutAt is null`. Use Vercel cron or a queue if the provider has a rate limit. For 200 subscribers, sequential sends with 100 ms delay is acceptable.
4. **Template message in Bahasa:** "Hai! Le Nouette buka lagi minggu ini. Cemilan Jumat 14 November - 8 produk, harga mulai 15rb, antar Jumat. Pesan di sini: [link]. Balas STOP kalau gak mau diingetin lagi."
5. Build a lightweight unsubscribe endpoint at `/api/unsubscribe?token=...` that flips `optedOutAt`. Generate one-time tokens per send so links cannot be guessed.
6. Build a small admin view at `/admin/notifications` that shows the subscriber list, the most recent send, and a "Resend last" button for cases where the operator wants to re-fire after a fix.
7. Add per-subscriber send history so the operator can debug deliverability.

> Be deliberate about message frequency. Once per round opening only. Do not send promotional messages between rounds. The opt-out rate is the canary.

**Acceptance Criteria**

- [ ] Transitioning a round to OPEN triggers an outbound message to every active `NotifySubscriber` within 5 minutes.
- [ ] Unsubscribe link works in one tap and flips the `optedOutAt` column.
- [ ] Send history is visible in the admin.
- [ ] An accidental re-trigger of OPEN does not re-send to subscribers (idempotency on `roundId + subscriberId`).

---

### L-02 · Identity-Based "Find My Orders" via WhatsApp Number

| | |
|---|---|
| **Audit Subject** | Customer identity. New route `/riwayat/cari`, plus a verification flow. |
| **Owner** | Developer + Designer |
| **Estimated Effort** | 3 days |
| **Severity / Impact** | Medium · Retention |

**Finding**

Order history at `/pesanan` (or `/riwayat` after `N-03`) is browser-bound, persisted in localStorage. If the customer clears their browser, switches devices, or uses incognito, all orders disappear. This limits the operator's ability to direct repeat customers to "your previous orders" in WhatsApp.

**Recommended Fix**

Add an identity-based lookup. The customer enters a WhatsApp number, receives a one-time code via WhatsApp deep link confirmation, and sees their server-side order history.

1. Add `/riwayat/cari` with a single WhatsApp number input.
2. On submit, generate a 6-digit code, store it in a new `VerificationCode` model with `whatsapp`, `code`, `expiresAt` (10 minutes), and `verifiedAt` fields.
3. Open WhatsApp deep link to the business with prefilled message "Saya minta kode verifikasi pesanan saya, [code]". The owner does not need to do anything; the customer sends the message and pastes the code back.
4. **Alternative path if `L-01` is built:** send the code automatically via the same WhatsApp Business API, no manual step.
5. On code submit, set a session cookie scoped to the verified WhatsApp number for 30 days.
6. Render server-side order history filtered by `normalizedWhatsApp` (`X-05`).
7. Redirect `/riwayat` to `/riwayat/cari` when no session exists, otherwise show the verified history.
8. Add a "Sign out of orders" link at the bottom that clears the cookie.

**Acceptance Criteria**

- [ ] Customer can find their orders from any device by verifying their WhatsApp number.
- [ ] Verification expires after 10 minutes of code generation.
- [ ] Verified session persists for 30 days.
- [ ] All orders associated with that normalized WhatsApp number are visible.

---

### L-03 · Reorder Button on Past Orders

| | |
|---|---|
| **Audit Subject** | Order history. Files: `/riwayat` (after `N-03` and `L-02`) and order detail page. |
| **Owner** | Developer |
| **Estimated Effort** | 1.5 days |
| **Severity / Impact** | Medium · Retention |

**Finding**

A customer who liked their previous order has no fast way to reorder. They have to manually re-find each product in the current round, re-add to cart, and re-check out. For a frequent buyer this is friction.

**Recommended Fix**

Add a "Pesan lagi" button on past orders. Clicking it pre-fills the cart with whichever items from that order are still available in the current open round, with a clear notice about anything that is missing.

1. On the past order detail page, add a "Pesan lagi" button visible only when an OPEN round exists.
2. Clicking the button checks each historical `OrderItem` against the current OPEN round's `RoundProduct` list, matched by `Product.id` (not `RoundProduct.id`, since those are round-scoped).
3. Items that are available in the current round and have stock are added to the cart at the current round's price.
4. Items that are not in the current round or are sold out trigger an inline message: "2 produk dari pesanan lalu tidak tersedia ronde ini, [list]".
5. Redirect to `/keranjang` after applying.

**Acceptance Criteria**

- [ ] Past order can be "reordered" in one tap when an OPEN round exists.
- [ ] Customer is told which items did not transfer over.
- [ ] Pricing reflects the current round, not the historical price.

---

### L-04 · Per-Product Photography Variants with Aspect Ratio Support

| | |
|---|---|
| **Audit Subject** | Product images. Files: `prisma/schema.prisma` (Product, RoundProduct), `product-card.tsx`. |
| **Owner** | Developer + Designer |
| **Estimated Effort** | 2 days |
| **Severity / Impact** | Low · Brand |

**Finding**

Product images are locked to a square aspect ratio with `object-cover`. For food, square crops are flattering for round dishes (cookies, croissants seen from above) and unflattering for tall layered items (cakes, brownies in foil), where critical visual information lives outside the square.

**Recommended Fix**

Allow images to use 1:1 or 4:5 aspect ratios. Store the choice on the product. Render the card with a CSS `aspect-ratio` variable.

1. Add `aspectRatio: String?` on `Product` with allowed values `'square'` and `'portrait'`. Default `'square'`.
2. Update the product creation and edit forms to expose the choice with a visual preview.
3. In `product-card.tsx`, replace `aspect-square` with `style={{ aspectRatio: product.aspectRatio === 'portrait' ? '4 / 5' : '1 / 1' }}`.
4. On the storefront grid, mixing aspect ratios in a CSS grid is fine since each card sets its own ratio. Confirm visually that mixed grids do not look chaotic. If they do, fall back to a per-round constraint instead of a per-product one.

**Acceptance Criteria**

- [ ] Owner can pick aspect ratio when creating or editing a product.
- [ ] Storefront cards render the chosen ratio.
- [ ] Existing products default to square.

---

### L-05 · Favorites Mechanism with Focused Notifications

| | |
|---|---|
| **Audit Subject** | Customer engagement. New `Favorite` model, new UI on product cards, integration with `L-01`. |
| **Owner** | Developer + Designer |
| **Estimated Effort** | 3 days |
| **Severity / Impact** | Low · Retention |

**Finding**

Customers may have a favorite item that does not appear in every round. Currently they have no way to express preference and no way to be notified specifically when their favorite is back. This is a missed opportunity for high-intent retention.

**Recommended Fix**

Add a heart icon to product cards. Tapping it adds the product to a localStorage-or-server-backed favorites list (the choice depends on whether `L-02` is shipped). When a round opens that contains a favorited product, the `L-01` message is augmented with "Btw, [Cookie X] yang kamu favoritin lagi ada minggu ini".

1. If `L-02` has shipped, store favorites server-side keyed by `normalizedWhatsApp`. If not, store in localStorage and sync to server on first verified login later.
2. Add a heart icon on the top-left of every product card. Tapping it toggles favorite state with a small toast.
3. Build a `/pilihanku` page that lists favorited products with their last-seen round date.
4. Augment the `L-01` outbound message template to include a personalized line when applicable.

**Acceptance Criteria**

- [ ] Customer can favorite and unfavorite any product.
- [ ] Favorites persist across sessions if `L-02` is shipped, otherwise per-browser.
- [ ] `L-01` message includes a personalized line when a favorited product is in the new round.

---

### L-06 · Post-Delivery WhatsApp Review Request Loop

| | |
|---|---|
| **Audit Subject** | Customer feedback. Touches: Order detail, new `Review` model. |
| **Owner** | Developer + Operator (template approval) |
| **Estimated Effort** | 2 days |
| **Severity / Impact** | Low · Retention |

**Finding**

When the operator marks an order DELIVERED, the customer disappears from the system until they happen to come back next round. There is no closing-the-loop interaction, no review request, no signal of satisfaction or dissatisfaction. The product collects zero social proof from happy customers.

**Recommended Fix**

After an order is marked DELIVERED, surface a one-tap WhatsApp review request the operator can send. The request links to a tiny one-emoji rating page. Reviews accumulate as social proof on the storefront.

1. Add a `Review` model with `orderId` (unique), `rating` (1 to 5 or just 1 to 3 emoji-style), `comment`, `createdAt`.
2. On the admin order detail page for DELIVERED orders, add a "Send review request" button that opens a WhatsApp deep link with prefilled message "Hai [name], makasih sudah pesan! Boleh kasih rating singkat? [link to /pesanan/[shortCode]/ulasan]".
3. Build `/pesanan/[shortCode]/ulasan` as a tiny page with three emoji buttons (excellent, ok, bad) and an optional one-line comment field.
4. Submission posts to `/api/orders/[shortCode]/review` and creates the `Review` row.
5. On the storefront, surface the most recent positive reviews on the closed-round teaser page (`N-01`) as a "Cerita pelanggan" block.

**Acceptance Criteria**

- [ ] Operator can send a review request in one tap after delivery.
- [ ] Customer can submit a review in one tap.
- [ ] Recent positive reviews appear on the closed-round teaser as social proof.

---

### L-07 · Dark Mode and Reduced-Motion Support

| | |
|---|---|
| **Audit Subject** | Accessibility and personalization. Files: `src/app/globals.css` and component-level transition handling. |
| **Owner** | Designer (lead) + Developer |
| **Estimated Effort** | 2 days |
| **Severity / Impact** | Low · Accessibility |

**Finding**

Customers open the app at 9 PM in bed deciding what to order tomorrow. Bright cream backgrounds at that hour are unfriendly. Additionally, the countdown banner polls every 30 seconds and the product card uses `transform` on hover, both of which should respect `prefers-reduced-motion`.

**Recommended Fix**

Add a dark mode token override and a `prefers-reduced-motion` guard.

1. Add a `@media (prefers-color-scheme: dark)` block in `globals.css` that re-defines the brand tokens for dark mode. Recommended starting palette: `--background #1f1610`, `--surface #2a1f15`, `--foreground #faf7f2`, `--muted #b3a895`, `--border #3d2e1f`, with `--primary`, `--accent`, `--warning`, `--success` unchanged or slightly desaturated.
2. Test every storefront and admin surface in dark mode. Adjust any inline-tinted gradients (the round banner) to read well on dark.
3. Add a `@media (prefers-reduced-motion: reduce)` block that disables card hover transforms, the round banner countdown updates to once per minute instead of 30 seconds, and any other CSS transitions or transforms.
4. Add a manual theme override toggle in the admin settings, separate from the storefront, since some operators prefer to keep the back office in light mode regardless of OS preference.

**Acceptance Criteria**

- [ ] Setting OS to dark mode renders the storefront and admin in a coherent dark variant.
- [ ] `prefers-reduced-motion` is honored on all CSS transitions.
- [ ] Color contrast in dark mode meets WCAG AA on all primary text.

---

### L-08 · Order Short Code Split (Public Reference plus Access Token)

| | |
|---|---|
| **Audit Subject** | Order identity. Schema change. Files: `prisma/schema.prisma`, `src/app/api/orders/route.ts`, all places that reference `order.shortCode`. |
| **Owner** | Developer |
| **Estimated Effort** | 2 days |
| **Severity / Impact** | Low · Risk |

**Finding**

The current short code is `LN-NNNN-XXXXX`, where `NNNN` is sequential and `XXXXX` is random. It is used both as the public order reference and as the URL-based access token. The two roles conflict. As a public reference it should be short and verbally readable ("My order is LN-0042"). As an access token it should be unguessable, which the random suffix provides but at the cost of readability.

**Recommended Fix**

Split the two roles. Keep a sequential public-facing reference like `LN-0042` for verbal use and admin-search. Add a separate URL access token for order URLs.

1. Add `accessToken: String @unique` on `Order`, generated as a 16-character random string at creation.
2. Change `shortCode` generation back to `LN-NNNN` (sequential only).
3. Update all order URLs to `/pesanan/[accessToken]` instead of `/pesanan/[shortCode]`. The token is what gates access.
4. On the order detail page, display the `shortCode` prominently as the human-readable reference, while the URL stays opaque.
5. Update the WhatsApp deep link message in `src/lib/orders.ts` to include the `shortCode` in the body and the access-token URL.
6. In the admin, search by `shortCode` (which is now short and clean again).
7. Migrate existing orders by generating an `accessToken` for each.

**Acceptance Criteria**

- [ ] Public order references are `LN-NNNN`, four digits, sequential.
- [ ] URLs use a 16-character access token that is hard to guess.
- [ ] Admin search by short code still works.
- [ ] WhatsApp messages contain both the short code and the URL.

---

### L-09 · Round Transition State Communication for In-Flight Customers

| | |
|---|---|
| **Audit Subject** | Round status edge cases. Files: order confirmation page, payment proof page. |
| **Owner** | Developer + Designer |
| **Estimated Effort** | 1 day |
| **Severity / Impact** | Low · Trust |

**Finding**

If the operator marks a round CLOSED while customers have orders in `PENDING_PAYMENT`, those customers can still upload payment proof, but the round being closed means no new orders can be placed. The product does not communicate this transition state to in-flight customers. They may upload proof and then wonder if the round closure means their order is voided.

**Recommended Fix**

Show a round-state-aware notice on the order confirmation and payment proof pages so in-flight customers know exactly what is happening.

1. On the order confirmation page, if `order.round.status` is `CLOSED` but the order is still in flight (`PENDING_PAYMENT` or `PAID`), show an info banner: "Ronde ini sudah ditutup untuk pesanan baru, tapi pesananmu masih diproses normal".
2. On the payment proof page, the same logic applies if the customer is uploading proof after the round closes.
3. On the admin order detail, show an analogous indicator when the round is `CLOSED` but the order is still active, so the operator does not get confused.

**Acceptance Criteria**

- [ ] In-flight customers see the round-state notice when applicable.
- [ ] Notice does not appear for orders whose rounds are still OPEN.
- [ ] Admin sees the analogous indicator on the order detail page.

---

### L-10 · Owner Story Block Above the Product Grid

| | |
|---|---|
| **Audit Subject** | Storefront landing page. File: `src/app/(storefront)/page.tsx`. |
| **Owner** | Designer + Operator (writing) |
| **Estimated Effort** | 1 day |
| **Severity / Impact** | Low · Brand |

**Finding**

When a round is open, the storefront jumps straight from the round banner to the product grid. There is no human voice. For a brand built on warmth and familiarity, this is a missed beat. The owner has a story to tell each round (what was hard, what was new, what to look forward to). The product currently gives them no place to tell it.

**Recommended Fix**

Add an optional "Cerita ronde ini" field to the round model that, if filled, renders as a small italic block between the round banner and the product grid.

1. Add a `story` field on `PreorderRound`, type `Text`, optional, max 280 characters.
2. Expose it on the round form between the dates and the product picker, with a placeholder example: "Minggu ini cookie cokelat baru pakai cocoa Belanda. Kalau habis pertama, sorry duluan ya."
3. On the storefront, render the story between `RoundBanner` and the product grid in italic Playfair, prefixed with a small "— dari dapur kami" attribution.
4. Skip rendering when the story is empty.

**Acceptance Criteria**

- [ ] Operator can add or edit a per-round story.
- [ ] Story renders on the storefront between banner and grid when present.
- [ ] Empty story is invisible, not an empty space.

---

### L-11 · FAQ Collapsible Block on Order Confirmation Tailored to Payment Method

| | |
|---|---|
| **Audit Subject** | Order confirmation page. File: `src/app/(storefront)/order/[shortCode]/page.tsx`. |
| **Owner** | Designer + Developer |
| **Estimated Effort** | 1 day |
| **Severity / Impact** | Low · Trust |

**Finding**

After checkout, the customer is left with a thank-you message and a status badge but no anticipation-setting. They do not know how long QRIS verification typically takes, what to do if their proof is rejected, or when the operator typically packs orders. This is the highest-value moment to set expectations, and the product currently uses it for a thank-you and nothing else.

**Recommended Fix**

Add an inline collapsible "Pertanyaan umum" block on the order confirmation page with three to five tailored questions per payment method.

1. Build a small `Disclosure` component using the native HTML `details` and `summary` elements, styled to match the brand.
2. Render the block below the WhatsApp link on the confirmation page.
3. **Question set for QRIS or Bank Transfer:** "Berapa lama bukti dicek?", "Bukti saya ditolak, harus apa?", "Saya transfer salah jumlah, bisa diperbaiki?", "Kapan biasanya admin online?".
4. **Question set for COD:** "Saya bisa bayar pakai apa?", "Apa pengantaran ada biaya?", "Saya tidak ada di tempat saat antar, bagaimana?".
5. Make the answers editable by the operator from the settings page so they can refine over time without redeploying.

**Acceptance Criteria**

- [ ] Confirmation page shows a collapsible FAQ tailored to the order's payment method.
- [ ] The operator can edit FAQ answers from settings.
- [ ] FAQ does not appear for cancelled or delivered orders, only in-flight ones.

---

### L-12 · Admin Keyboard Shortcuts and Saved Filter Views

| | |
|---|---|
| **Audit Subject** | Operator productivity. Files: admin shell, orders page. |
| **Owner** | Developer |
| **Estimated Effort** | 1.5 days |
| **Severity / Impact** | Low · Operator |

**Finding**

Beyond Cmd-K from `X-03`, there are no keyboard shortcuts. Beyond URL bookmarking, there are no saved views. For an operator who runs the same daily routine ("check needs-verify, then ready-to-deliver, then export CSV"), the lack of keyboard affordances and saved-view affordances adds friction at the margin.

**Recommended Fix**

Add a small set of keyboard shortcuts and a "pin this view" button on the orders page.

1. Add keyboard shortcuts via a small `useKeyboardShortcuts` hook. Recommended bindings: G then D (go to dashboard), G then O (go to orders), G then P (go to products), G then R (go to rounds), Slash (focus search), Escape (close any open menu or confirm).
2. Show the shortcuts in a Cmd-? popover.
3. On the orders page, add a "Pin this view" button that saves the current filter and round selection to localStorage. Up to three pinned views appear in the sidebar.

**Acceptance Criteria**

- [ ] Keyboard shortcuts work consistently across admin pages.
- [ ] Pinned views appear in the sidebar and re-apply the saved filter when clicked.
- [ ] Shortcut popover lists every binding.

---

## Out of scope and follow-ups

This document is grounded in the source code at [github.com/randalubis/le-nouette](https://github.com/randalubis/le-nouette) as of the audit date. It does not cover three areas that would benefit from follow-up audits.

- **Real production performance numbers.** The recommendations on performance (`X-11`, `X-12`, `X-16`) are derived from code reading. A follow-up Lighthouse and Vercel Analytics review on the deployed app would let several effort estimates be tightened or de-prioritized.
- **Security review beyond UX.** The HMAC session is the right shape for a single-operator app, but a security audit covering CSRF posture on admin actions, Supabase storage bucket policies, and rate limiting beyond `/api/orders` would be valuable before scaling. Recommend treating this as a separate engagement.
- **Conversion funnel data.** Several Phase 1 and Phase 2 items name "conversion" as their lever. With actual analytics data on cart-to-checkout, checkout-to-payment, and payment-to-confirmed funnel rates, the recommendations could be re-ranked by measured impact rather than expert judgment.

### Questions to expect from the team

Three questions are likely to come up during execution. Brief answers below.

**Why is `X-04` (soft hold) in Phase 2 and not Phase 1?**

The soft hold requires a schema migration, a background reconciler, and changes to the checkout UI on the same screen. It is a single ticket but it touches every layer of the stack. Putting it in Phase 1 would crowd out the eight other Phase 1 fixes that are higher-impact-per-day. The current state, where stock decrements on placement, is bad but is not on fire. The `N-02` customer-side cancel partially mitigates the worst case (an honest customer who abandons can self-cancel). The full fix lives in Phase 2.

**Why are dark mode and aspect-ratio variants in Phase 3 and not Phase 2?**

They are quality-of-life improvements that do not move retention or conversion meaningfully. A customer who lands on the bright storefront at 9 PM at night will still order. A square photo of a brownie is suboptimal but the customer will still order. These items raise the polish ceiling without changing the floor. They belong in Phase 3.

**Why is `L-01` (outbound WhatsApp) the most important Phase 3 item?**

Because every other retention or growth mechanism in this product depends on the operator manually messaging WhatsApp groups each round. The notify-me capture in `N-01` generates a list. The list has zero value until something can send to it automatically. `L-01` is the smallest possible thing that converts the list from a database table into a growth loop.

---

## How to track this work

Recommend creating a single GitHub Project board with three columns matching the three phases. Each item in this document becomes one issue.

- The ID (`N-01`, `X-04`, `L-09`) goes in the issue title.
- The Audit Subject and Recommended Fix sections become the issue body.
- The Acceptance Criteria become the issue's checklist.
- The Owner field becomes the issue assignee.
- The Severity becomes a label.

The whole plan is 41 issues. At a sustainable pace of two issues per developer-week and one per designer-week, the full plan is roughly 12 to 14 weeks of focused work with one developer and one designer. With two developers in parallel during Phase 2, the timeline compresses to 9 to 10 weeks.

### Final note

Le Nouette is the work of someone who built exactly the right MVP for the problem in front of them, and who is now standing at the line where MVP discipline begins to actively block the next phase of growth. None of the work in this document is a rebuild. It is an additive set of changes that keep the things the product already does well, and close the things it currently does not. Executed in order, the product will move from "good for now" to "ready to support five-times-current order volume without melting the operator", within a single quarter.

---

*End of plan. 41 tickets across 3 phases.*
