# Le Nouette

A preorder ordering app for a small office snack business. Friends in the same office browse a weekly catalog, place orders, pay via QRIS or cash on delivery, and the owner manages everything from a single back office.

Built to replace a manual workflow of taking orders over WhatsApp and tracking them in Google Sheets.

## How it works

The business runs in **rounds**. Each round has:

- An **open time** (when ordering starts) and a **close time** (cutoff)
- A **delivery date** (typically Friday or Monday)
- A list of **products** with per-round pricing and stock

Customers visit the storefront, see the open round and its menu, fill their cart, check out, and (for QRIS) upload payment proof. The admin reviews orders, marks them paid + delivered, and exports the round to CSV when it's done.

Only one round can be `OPEN` at a time. A round can also be **scheduled** — flipped to `OPEN` while its open time is still in the future — in which case the storefront shows an upcoming-round teaser with a countdown until it goes live. When nothing is open or scheduled, the storefront shows a "belum buka pre-order" message with a notify-me sign-up.

## Features

### Storefront (Bahasa Indonesia, customer-facing)

- Full-bleed hero + the current round's countdown card, then the product grid
- **Upcoming-round teaser** with a live countdown + inline notify-me form when a round is scheduled but not yet open
- **Notify-me** WhatsApp opt-in capture, so customers can be pinged when the next round opens
- Cart persisted to `localStorage` (survives page reloads, no account required)
- Bottom tab bar for Beranda / Menu / Keranjang / Pesanan navigation
- Checkout flow capturing name + WhatsApp number, choice of QRIS, bank transfer, or COD
- For QRIS / bank transfer: payment proof upload screen, with a 30-minute soft stock hold
- Order confirmation with a one-tap **WhatsApp deep link** that opens a chat to the owner with a prefilled order summary
- Order history (`riwayat`) and one-tap reorder into the current round
- **Post-delivery reviews** (1-tap emoji rating + optional comment) that surface as social proof on the closed-round page
- Mobile-first design with a DM Sans / Instrument Serif / JetBrains Mono type system on a cream/coffee palette (light + dark)

### Back office (English, admin-facing)

- **Products** — CRUD with image upload to Supabase Storage, plus duplicate + active toggle
- **Preorder rounds** — create, edit, set open/close/delivery dates, attach products with per-round price + stock, upload a QRIS image
- **Round lifecycle** — Draft → Open → Closed → Delivered, with a guard that only one round can be open at a time. Opening a round with a future open time prompts to keep the schedule or open immediately
- **Scheduled-round visibility** — the dashboard surfaces an upcoming round with a countdown, and the rounds list flags it `SCHEDULED`, so a second overlapping round isn't created by accident
- **Orders per round** — table with status filters, per-row WhatsApp link to message the customer
- **Order detail** — view payment proof, verify payment, transition through statuses (`PENDING_PAYMENT`/`PENDING_CONFIRMATION` → `PAID`/`CONFIRMED` → `DELIVERED`; COD lands in `PENDING_CONFIRMATION`, expired soft-holds become `HOLD_EXPIRED`), or cancel and auto-restore stock
- **Status audit log** — every order transition is recorded with actor + note
- **Bulk action** — mark all paid/confirmed orders as delivered at once
- **CSV export** per round + full-table backups (the spreadsheet replacement)
- **Order short codes** like `LN-0042` for human-readable references in WhatsApp follow-ups

### Auth

A single-admin model. Credentials live in `.env.local` and the session is held in an HMAC-signed `httpOnly` cookie (Web Crypto, 30-day expiry). No email magic links, no third-party auth provider — kept simple because there's exactly one operator. Customers don't need accounts.

## Tech stack

- **Framework**: Next.js 16 (App Router) · TypeScript · React 19
- **Styling**: Tailwind CSS v4 · custom token system · DM Sans + Instrument Serif + JetBrains Mono
- **Database**: Postgres on Supabase, accessed via Prisma 6
- **Image storage**: Supabase Storage (single public bucket)
- **Hosting**: Vercel (free tier)
- **Validation**: Zod
- **Currency**: IDR with `id-ID` locale formatting (no decimals, dot separators)

## Quick start

> Full first-time walkthrough lives in **[docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)** — recommended for the initial setup. This is the recap.

1. Create a Supabase project and copy the connection strings + the Project URL + the service-role (secret) API key.
2. Create a public Storage bucket named `le-nouette`.
3. Configure env vars:
   ```bash
   cp .env.example .env.local
   # fill in DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL,
   # SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD,
   # ADMIN_SESSION_SECRET, NEXT_PUBLIC_BUSINESS_WHATSAPP
   ```
   Generate the session secret with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
4. Install, migrate, run:
   ```bash
   npm install
   npx prisma migrate dev --name init
   npm run dev
   ```
5. Open the admin at http://localhost:3000/admin and add some products + a round.

## Project structure

```
src/
  app/
    layout.tsx                       # root layout, fonts, providers
    globals.css                      # design tokens (light + dark)
    (storefront)/                    # customer pages (Bahasa)
      layout.tsx                     # storefront chrome (header + bottom tab bar)
      page.tsx                       # landing — live round, scheduled teaser, or closed
      keranjang/page.tsx             # cart
      pembayaran/page.tsx            # checkout form
      pesanan/[shortCode]/           # order confirmation (+ bayar, ulasan sub-routes)
      riwayat/page.tsx               # order history + reorder
      _components/                   # storefront-specific components
    admin/                           # back office (English, auth-gated)
      layout.tsx                     # admin shell (sidebar)
      login/page.tsx                 # email + password form
      page.tsx                       # dashboard (live + scheduled round)
      products/                      # product CRUD
      rounds/                        # round CRUD + status transitions ([id]/edit, [id]/orders)
      orders/[shortCode]/            # order detail + status actions
      settings/page.tsx
      _components/                   # admin-specific components
    api/
      admin/login | logout/          # cookie-based session endpoints
      admin/backup/*.csv             # full-table CSV backups
      admin/rounds/[id]/orders.csv   # per-round CSV export
      notify/subscribe/              # notify-me opt-in capture
      orders/                        # order creation
      orders/[shortCode]/            # payment, cancel, review, status, reorder
      rounds/open | rounds/[id]/summary
  components/
    cart-provider.tsx                # cart context + localStorage sync
    providers.tsx                    # client-side provider wrapper
    ui/                              # shadcn-style primitives
  lib/
    auth.ts                          # HMAC cookie session helpers
    cart.ts                          # cart types + localStorage helpers
    db.ts                            # Prisma client singleton
    env.ts                           # required-env-var accessors
    errors.ts                        # structured what/why/action error messages
    orders.ts                        # short-code generation, WA message builder
    settings.ts                      # business-settings accessor
    storage.ts                       # Supabase Storage upload/delete
    supabase/admin.ts                # service-role Supabase client (uploads only)
    utils.ts                         # cn, formatIDR, parseIDR, formatWhatsAppLink
    validators.ts                    # Zod schemas
  middleware.ts                      # admin route guard
prisma/
  schema.prisma                      # 12 models — see "Data model" below
  migrations/                        # versioned schema changes
docs/
  SUPABASE_SETUP.md                  # detailed first-time setup
  DEPLOYMENT.md                      # Vercel deployment walkthrough
  REGION_MIGRATION.md                # Sydney → Singapore Supabase migration
  IMPROVEMENT_PLAN.md                # 41-ticket UI/UX audit plan
  CONTENT_GUIDE.md                   # language, error format, contrast rules
  VOICE_GUIDE.md                     # storefront copy voice and tone
```

## Data model

Twelve Prisma models. Read [`prisma/schema.prisma`](prisma/schema.prisma) for the full source of truth:

- **Product** — the catalog. Reused across rounds.
- **PreorderRound** — a single round with `opensAt`, `closesAt`, `deliveryDate`, `status`, optional QRIS image + per-round bank details + an optional "from the kitchen" story.
- **RoundProduct** — join between a product and a round, snapshotting price + stock per round so prices can change between rounds without breaking history.
- **Order** + **OrderItem** + **Payment** — a customer's order, its line items (with snapshotted unit prices), and the payment record (with proof URL for QRIS).
- **OrderStatusEvent** — append-only audit log of every order status transition (actor + note).
- **Review** — post-delivery rating + optional comment, one per order.
- **StockAdjustment** — audit log of manual stock bumps.
- **BusinessSettings** — single-row config (business name, WhatsApp, blurb, cadence, FAQ answers).
- **NotifySubscriber** — notify-me opt-ins (WhatsApp number + opt-out timestamp).
- **OrderCounter** — a single-row table that hands out sequential `LN-0001`, `LN-0002`, … codes inside the order-creation transaction.

## Deployment

Walkthrough: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** (Vercel + Supabase, ~30 min for the first deploy).

The short version:

1. Push to GitHub
2. Import the repo on Vercel — it auto-detects Next.js
3. Paste env vars (use a fresh `ADMIN_SESSION_SECRET` for production)
4. Vercel builds; the same Supabase project serves both dev and prod
5. After the first deploy, set `NEXT_PUBLIC_SITE_URL` to your Vercel URL and redeploy

Schema changes flow as: edit `prisma/schema.prisma` → `npx prisma migrate dev --name <change>` → commit migration files → push.

## Useful commands

```bash
npm run dev              # local dev server (Next.js + Turbopack)
npm run build            # production build
npm run lint             # ESLint
npm run check:hex        # fail on inline hex colors outside globals.css
npm run db:generate      # regenerate Prisma client
npm run db:migrate       # create + apply a migration (dev)
npm run db:push          # push schema without a migration (prototyping)
npm run db:studio        # open Prisma Studio (DB browser)
```

## Design decisions worth knowing

- **Stock decrements at order placement**, not at payment. Cancelled orders auto-restore stock. Pay-later orders (QRIS / bank transfer) carry a 30-minute **soft hold** (X-04): if no payment proof is uploaded in time, a lazy reconciler releases the stock and marks the order `HOLD_EXPIRED`.
- **One Supabase project, two Vercel envs.** Saves cost and complexity at this scale. Production data and dev data share a database — handle with care.
- **Next image optimizer is on** (`next.config.ts`). Supabase Storage hosts are whitelisted via `remotePatterns` and the optimizer serves AVIF/WebP variants — meaningful byte savings on the storefront grid for Indonesian 4G. (Earlier the app rode `unoptimized: true`; that workaround is gone.)
- **Prisma transaction timeout = 20s** on order creation, to absorb pooler latency from Indonesia to the Supabase region. Default of 5s wasn't enough.

## Changelog

Release-by-release history of what shipped lives in [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE).
