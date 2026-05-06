# Le Nouette

Preorder web app for an office snack micro-business. Replaces a WhatsApp + Google Sheets workflow.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind 4 · Prisma · Supabase (Postgres + Auth + Storage) · Vercel.

## What ships in Slice 1 (this scaffold)

- Admin login (Supabase magic link, allowlist via `ADMIN_EMAILS`)
- Admin dashboard, products CRUD with image upload, preorder rounds CRUD, status transitions
- Storefront landing page that lists products in the currently `OPEN` round (read-only)
- IDR currency formatting, Bahasa storefront / English admin

## What ships next

- **Slice 2** — cart + checkout + order creation + WA deep link, payment proof upload
- **Slice 3** — admin order list + payment verification + CSV export + i18n polish

## Getting started

> **Detailed Supabase setup walkthrough:** [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) — recommended for first-time setup. The summary below is a recap.

### 1. Create a Supabase project

1. Sign up at [supabase.com](https://supabase.com) (free tier is fine).
2. Create a project. Wait for provisioning (~2 min).
3. From **Project Settings → Database**, copy the connection string. You need two:
   - **Pooler (port 6543)** for `DATABASE_URL` — used at runtime.
   - **Direct (port 5432)** for `DIRECT_URL` — used by `prisma migrate`.
4. From **Project Settings → API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only — never ship to the client)
5. From **Storage**, create a bucket named `le-nouette` (or change `SUPABASE_STORAGE_BUCKET`). **Mark it public** so storefront images load.
6. From **Authentication → Providers**, leave Email enabled (default). The app uses passwordless magic links.
7. From **Authentication → URL Configuration**, add your site URL (e.g. `http://localhost:3000` and later your Vercel URL) under **Redirect URLs**.

### 2. Configure env vars

```bash
cp .env.example .env.local
# fill in the values from step 1
```

`ADMIN_EMAILS` is a comma-separated allowlist. Anyone outside it gets bounced from `/admin`.

### 3. Install + migrate + run

```bash
npm install
npx prisma migrate dev --name init   # creates the tables
npm run dev
```

- Storefront → http://localhost:3000
- Admin → http://localhost:3000/admin

### 4. First-time setup walkthrough

1. Open `/admin/login`, enter your email (must be in `ADMIN_EMAILS`), click the magic link in your inbox.
2. Go to **Products** → **New product**, upload images, set base prices.
3. Go to **Rounds** → **New round**, give it a title, set open/close/delivery dates, add products with per-round price + stock.
4. From the round edit page, click **Open round**.
5. Visit `/` to see the storefront.

## Project layout

```
src/
  app/
    page.tsx                       # storefront (Bahasa)
    layout.tsx
    admin/
      layout.tsx                   # auth-gated shell
      login/page.tsx               # magic link form
      auth/callback/route.ts       # OAuth/OTP exchange
      page.tsx                     # dashboard
      products/                    # products CRUD
      rounds/                      # rounds CRUD
      settings/page.tsx
  components/ui/                   # shadcn-style primitives
  lib/
    db.ts                          # Prisma client singleton
    auth.ts                        # requireAdmin / getAdminUser
    storage.ts                     # Supabase storage upload helpers
    supabase/                      # browser, server, middleware, admin clients
    validators.ts                  # Zod schemas
    utils.ts                       # cn, formatIDR, parseIDR, etc.
  middleware.ts                    # session refresh + admin route guard
prisma/schema.prisma
```

## Deployment (Vercel)

1. Push to GitHub.
2. Import the repo on Vercel.
3. Set the same env vars from `.env.local` in the Vercel project settings.
4. Add the Vercel URL to Supabase **Authentication → URL Configuration → Redirect URLs**.
5. Update `NEXT_PUBLIC_SITE_URL` to your Vercel URL.

## Useful commands

```bash
npm run dev              # local dev
npm run build            # production build
npm run db:migrate       # create + apply a migration
npm run db:push          # push schema without migrations (prototyping)
npm run db:studio        # open Prisma Studio
```

## Known follow-ups

- Next.js 16 deprecated the `middleware.ts` filename in favor of `proxy.ts`. Functionally equivalent; rename when convenient.
- Order management UI ships in Slice 3.
