# Le Nouette

A preorder ordering app for a small office snack business. Friends in the same office browse a weekly catalog, place orders, pay via QRIS or cash on delivery, and the owner manages everything from a single back office.

Built to replace a manual workflow of taking orders over WhatsApp and tracking them in Google Sheets.

## How it works

The business runs in **rounds**. Each round has:

- An **open time** (when ordering starts) and a **close time** (cutoff)
- A **delivery date** (typically Friday or Monday)
- A list of **products** with per-round pricing and stock

Customers visit the storefront, see the open round and its menu, fill their cart, check out, and (for QRIS) upload payment proof. The admin reviews orders, marks them paid + delivered, and exports the round to CSV when it's done.

Only one round can be `OPEN` at a time. When no round is open, the storefront shows a "preorder ditutup" message.

## Features

### Storefront (Bahasa Indonesia, customer-facing)

- Product grid with the current round's countdown banner
- Cart persisted to `localStorage` (survives page reloads, no account required)
- Checkout flow capturing name + WhatsApp number, choice of QRIS or COD
- For QRIS: payment proof upload screen
- Order confirmation with a one-tap **WhatsApp deep link** that opens a chat to the owner with a prefilled order summary
- Mobile-first design with a Playfair + Geist type pairing on a cream/coffee palette

### Back office (English, admin-facing)

- **Products** — CRUD with image upload to Supabase Storage
- **Preorder rounds** — create, edit, set open/close/delivery dates, attach products with per-round price + stock, upload a QRIS image
- **Round lifecycle** — Draft → Open → Closed → Delivered, with a guard that only one round can be open at a time
- **Orders per round** — table with status filters, per-row WhatsApp link to message the customer
- **Order detail** — view payment proof, verify payment, transition through statuses (`PENDING_PAYMENT` → `PAID` → `CONFIRMED` → `DELIVERED`), or cancel and auto-restore stock
- **Bulk action** — mark all paid/confirmed orders as delivered at once
- **CSV export** per round (the spreadsheet replacement)
- **Order short codes** like `LN-0042` for human-readable references in WhatsApp follow-ups

### Auth

A single-admin model. Credentials live in `.env.local` and the session is held in an HMAC-signed `httpOnly` cookie (Web Crypto, 30-day expiry). No email magic links, no third-party auth provider — kept simple because there's exactly one operator. Customers don't need accounts.

## Tech stack

- **Framework**: Next.js 16 (App Router) · TypeScript · React 19
- **Styling**: Tailwind CSS v4 · custom token system · Playfair Display + Geist
- **Database**: Postgres on Supabase, accessed via Prisma 6
- **Image storage**: Supabase Storage (single public bucket)
- **Hosting**: Vercel (free tier)
- **Validation**: Zod
- **Currency**: IDR with `id-ID` locale formatting (no decimals, dot separators)

## Quick start

> Full first-time walkthrough lives in **[docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)** — recommended for the initial setup. This is the recap.

1. Create a Supabase project and copy connection strings + the publishable/secret API keys.
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
    globals.css                      # design tokens
    (storefront)/                    # customer pages (Bahasa)
      layout.tsx                     # storefront chrome (header)
      page.tsx                       # landing — current round + product grid
      keranjang/page.tsx             # cart
      checkout/page.tsx              # checkout form
      order/[shortCode]/             # order confirmation + payment proof upload
      _components/                   # storefront-specific components
    admin/                           # back office (English, auth-gated)
      layout.tsx                     # admin shell (sidebar)
      login/page.tsx                 # email + password form
      page.tsx                       # dashboard
      products/                      # product CRUD
      rounds/                        # round CRUD + status transitions
      orders/[shortCode]/            # order detail + status actions
      settings/page.tsx
      _components/                   # admin-specific components
    api/
      admin/login | logout/          # cookie-based session endpoints
      admin/rounds/[id]/orders.csv   # CSV export
      orders/                        # order creation
      orders/[shortCode]/payment/    # payment proof upload
  components/
    cart-provider.tsx                # cart context + localStorage sync
    providers.tsx                    # client-side provider wrapper
    ui/                              # shadcn-style primitives
  lib/
    auth.ts                          # HMAC cookie session helpers
    cart.ts                          # cart types + localStorage helpers
    db.ts                            # Prisma client singleton
    env.ts                           # required-env-var accessors
    orders.ts                        # short-code generation, WA message builder
    storage.ts                       # Supabase Storage upload/delete
    supabase/admin.ts                # service-role Supabase client (uploads only)
    utils.ts                         # cn, formatIDR, parseIDR, formatWhatsAppLink
    validators.ts                    # Zod schemas
  middleware.ts                      # admin route guard
prisma/
  schema.prisma                      # 7 models: Product, PreorderRound, RoundProduct,
                                     # Order, OrderItem, Payment, OrderCounter
  migrations/                        # versioned schema changes
docs/
  SUPABASE_SETUP.md                  # detailed first-time setup
  DEPLOYMENT.md                      # Vercel deployment walkthrough
```

## Data model

Seven Prisma models. Read [`prisma/schema.prisma`](prisma/schema.prisma) for the full source of truth:

- **Product** — the catalog. Reused across rounds.
- **PreorderRound** — a single round with `opensAt`, `closesAt`, `deliveryDate`, `status`, optional QRIS image.
- **RoundProduct** — join between a product and a round, snapshotting price + stock per round so prices can change between rounds without breaking history.
- **Order** + **OrderItem** + **Payment** — a customer's order, its line items (with snapshotted unit prices), and the payment record (with proof URL for QRIS).
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
npm run db:generate      # regenerate Prisma client
npm run db:migrate       # create + apply a migration (dev)
npm run db:studio        # open Prisma Studio (DB browser)
```

## Design decisions worth knowing

- **Stock decrements at order placement**, not at payment. Simpler reasoning, and the small scale doesn't warrant a hold/release flow. Cancelled orders auto-restore stock.
- **One Supabase project, two Vercel envs.** Saves cost and complexity at this scale. Production data and dev data share a database — handle with care.
- **`images.unoptimized: true`** in `next.config.ts`. The Supabase URLs are served directly. Avoids a Next 16 quirk with `remotePatterns` and isn't a meaningful cost at <30 product images.
- **Prisma transaction timeout = 20s** on order creation, to absorb pooler latency from Indonesia to the Supabase region. Default of 5s wasn't enough.

## License

[MIT](LICENSE).
