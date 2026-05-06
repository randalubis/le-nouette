# Supabase setup — step-by-step

Complete one-time setup to wire Le Nouette to a fresh Supabase project. ~15 minutes, no prior Supabase experience needed.

> Reflects the Supabase dashboard as of **May 2026**. Supabase changes the UI fairly often — if a label or location doesn't match what you see, the **search box at the top of the dashboard** (`Cmd/Ctrl-K`) will jump you straight to most things by name (e.g. "API Keys", "URL Configuration", "Connect").

---

## 0. What we're connecting

The app uses three Supabase services:

| Service | Purpose |
|---|---|
| **Postgres** | Stores products, rounds, orders. Accessed via Prisma. |
| **Auth** | Admin sign-in via passwordless magic links. |
| **Storage** | Holds product images (and later QRIS image + payment proofs). |

By the end of this guide you'll have eight env vars in `.env.local` and a working `npm run dev`.

---

## 1. Create a Supabase project

1. Go to **[supabase.com/dashboard](https://supabase.com/dashboard)** and sign up (GitHub login is fastest) or sign in.
2. Click **New project** (top right of the Organization page).
3. Fill in:
   - **Project name**: `le-nouette` (or anything)
   - **Database password**: click the **Generate** button. **Save it in your password manager immediately** — you cannot retrieve it later, only reset it. You'll paste it into `.env.local` shortly.
   - **Region**: pick the closest. For Indonesia, **Southeast Asia (Singapore) — `ap-southeast-1`** is the right choice.
   - **Plan**: Free is fine for MVP.
4. Click **Create new project**. Provisioning takes ~2 minutes.

---

## 2. Grab the database connection strings

Prisma needs **two** connection strings. They look almost identical but differ in port and pooling mode — this difference matters.

1. From your project page, click the **Connect** button at the top of the screen (next to your project name). A dialog opens with several tabs (App Frameworks, ORMs, Type Generators, etc.).
2. Click the **ORMs** tab.
3. From the **Tool** dropdown, select **Prisma**.

   The dialog now shows two ready-to-paste strings labeled **`DATABASE_URL`** and **`DIRECT_URL`**, with the password field shown as `[YOUR-PASSWORD]`.

4. Copy both strings into `.env.local`. Replace `[YOUR-PASSWORD]` with the password you saved in step 1.

   They should look roughly like:

   ```bash
   DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
   DIRECT_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
   ```

   > **Why two URLs?** `DATABASE_URL` (port 6543, transaction-mode pooler) is used at runtime — fast, cheap, multiplexes connections, perfect for serverless. `DIRECT_URL` (port 5432) bypasses transaction-mode pooling so `prisma migrate` can hold schema locks. The `pgbouncer=true&connection_limit=1` flags on `DATABASE_URL` tell Prisma to disable prepared statements and use one connection per function instance.

   > **If your password contains special chars** (`@`, `:`, `/`, `?`, `#`, `%`, `&`), URL-encode them. Easiest fix: reset to a generated password (Settings → Database → **Reset database password**).

**Sanity check:** the only difference between `DATABASE_URL` and `DIRECT_URL` is the port (`:6543` vs `:5432`) and the trailing query string.

---

## 3. Grab the API keys and Project URL

These live in two places now (Supabase split them across the dashboard).

### 3a. The Project URL

1. Sidebar → **Project Settings** (gear icon).
2. Click **Data API** (under the API section).
3. Copy the **Project URL** at the top of the page (e.g. `https://abcdxyz.supabase.co`).

   ➡️ Goes into **`NEXT_PUBLIC_SUPABASE_URL`**.

### 3b. The API keys

1. Sidebar → **Project Settings** → **API Keys**.

   You'll see two tabs: **API Keys** (the new format) and **Legacy API Keys** (the old JWT-based `anon` / `service_role` keys).
2. On the **API Keys** tab, copy:
   - The **Publishable key** (starts with `sb_publishable_`) → goes into **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**.
   - The **Secret key** (starts with `sb_secret_`) → goes into **`SUPABASE_SERVICE_ROLE_KEY`**.

   > 💡 The variable names in our `.env` are kept as `ANON_KEY` / `SERVICE_ROLE_KEY` because the `@supabase/ssr` SDK accepts both new and legacy formats interchangeably. The new `sb_publishable_*` and `sb_secret_*` keys are preferred.

   > ⚠️ The **Secret key** bypasses Row-Level Security and represents full backend access. **Never** expose it to the browser. The app only uses it server-side (in [`src/lib/supabase/admin.ts`](../src/lib/supabase/admin.ts)) for image uploads. Don't paste it anywhere with `NEXT_PUBLIC_` in the name.

   > If your dashboard only shows legacy keys: the **Legacy API Keys** tab has the JWT-format `anon` and `service_role` keys — those work too. Use the new ones if available.

---

## 4. Create the storage bucket

1. Sidebar → **Storage**.
2. Click **New bucket** (top of the page).
3. **Name**: `le-nouette` (must match `SUPABASE_STORAGE_BUCKET` in `.env`).
4. Toggle **Public bucket**: **ON**. (Storefront `<Image>` tags need public URLs to render product photos.)

   You may also see options for **Restrict file size**, **Allowed MIME types**, etc. — leave them at defaults; our upload helper enforces 5MB / `image/jpeg|png|webp` server-side.
5. Click **Save** / **Create bucket**.

That's it — no policies to write. Public buckets get a default read-allowed-for-everyone policy. Writes still require the **Secret key**, which is what our upload helper uses server-side.

---

## 5. Configure Auth redirect URLs

Magic links email a one-time URL that Supabase rewrites to your site. You must whitelist your site's URLs or the redirect fails with a generic error after the user clicks the email.

1. Sidebar → **Authentication** → **URL Configuration**.
2. **Site URL**: set to `http://localhost:3000` for now. You'll update this to your Vercel URL when you deploy.
3. **Redirect URLs**: add **both** of these (click **Add URL** for each):
   ```
   http://localhost:3000/admin/auth/callback
   http://localhost:3000/**
   ```
   The first is the exact callback path; the second is a globstar wildcard that lets Supabase redirect to any path on your dev server (useful for the `?next=` param after login). Wildcards: `*` matches any non-`./`, `**` matches anything.
4. Click **Save changes**.

> **For production:** come back here after deploying and add `https://<your-app>.vercel.app/admin/auth/callback` and `https://<your-app>.vercel.app/**` as additional redirect URLs. Keep the localhost ones too.

### 5b. (Optional) Magic-link email template

1. **Authentication** → **Emails** → **Magic Link**.
2. The default template works. Edit if you want Bahasa wording or custom branding.
3. **Free-tier note:** Supabase's built-in email is rate-limited to ~30 sends/hour. For one admin this is fine. If you ever onboard customer logins (we won't, by design), set up custom SMTP under **Authentication → Emails → SMTP Settings** (Resend / AWS SES / etc.).

---

## 6. Wire up `.env.local`

In the project root:

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in every value:

```bash
# Step 2 (from the Connect dialog → ORMs → Prisma)
DATABASE_URL="postgresql://postgres.abcdxyz:my-secret-pw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.abcdxyz:my-secret-pw@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# Step 3a (Settings → Data API)
NEXT_PUBLIC_SUPABASE_URL="https://abcdxyz.supabase.co"

# Step 3b (Settings → API Keys → API Keys tab)
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_..."
SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."

# Step 4 (default works)
SUPABASE_STORAGE_BUCKET="le-nouette"

# App config
ADMIN_EMAILS="you@example.com"             # comma-separated allowlist
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_BUSINESS_WHATSAPP="628123456789"  # E.164, no leading + or spaces
```

> `.env.local` is gitignored — it never ships to GitHub. ✅

---

## 7. Apply the database schema

Now we tell Prisma to create the tables in Supabase Postgres.

```bash
npm install
npx prisma migrate dev --name init
```

Expected output:

```
Datasource "db": PostgreSQL database "postgres", schema "public" at "..."
✔ Generated Prisma Client (...)
✔ Applied migration `..._init`
```

**If it errors out**, common causes:

| Error | Fix |
|---|---|
| `P1001: Can't reach database server` | Wrong hostname / region in `DIRECT_URL`. Re-copy from the Connect dialog. |
| `Authentication failed for user "postgres..."` | Wrong password. URL-encode special chars or reset the database password (Settings → Database). |
| `prepared statement "s0" already exists` | You used the pooler URL (`:6543`) for `DIRECT_URL`. It must be `:5432`. |
| `relation "..." already exists` | Old migration state. Run `npx prisma migrate reset` (deletes data). |

Verify in the dashboard: sidebar → **Table Editor** (or **Database → Tables**). You should see `Product`, `PreorderRound`, `RoundProduct`, `Order`, `OrderItem`, `Payment`, `OrderCounter`, plus Prisma's `_prisma_migrations`.

---

## 8. Run it

```bash
npm run dev
```

- Storefront → http://localhost:3000 → "Preorder sedang ditutup" (correct — no `OPEN` round yet).
- Admin → http://localhost:3000/admin → redirects to `/admin/login`.

### Sign in for the first time

1. Enter the email you put in `ADMIN_EMAILS`.
2. Click **Send magic link**.
3. Check your inbox. Subject: usually "Magic Link". Open it on the same machine.
4. The link redirects to `/admin/auth/callback?code=...&next=/admin`, exchanges the code for a session, and lands you on the dashboard.

If the email never arrives:
- Check spam.
- Sidebar → **Authentication** → **Logs** in Supabase shows every auth attempt and email delivery status.

If you click the link and get bounced back to login with `?error=not_authorized`:
- The email isn't in `ADMIN_EMAILS`. Add it to `.env.local` (case-insensitive) and restart `npm run dev`.

If you click the link and get bounced with `?error=exchange_failed` or a Supabase-hosted error page:
- Your **Redirect URLs** list (step 5) doesn't include the callback URL. Re-check.

### Test image upload

1. Admin → **Products** → **New product** → fill in name + price, upload a JPG/PNG/WebP under 5MB.
2. Save. The product appears in the list with its image rendered from `https://<project-ref>.supabase.co/storage/v1/object/public/le-nouette/products/<uuid>.<ext>`.
3. Verify in dashboard: sidebar → **Storage** → `le-nouette` bucket → `products/` folder.

If the image is broken:
- Bucket isn't public. Storage → bucket → **⋯** menu → **Make public**. (Or delete the bucket and recreate with the toggle on.)
- `next.config.ts` doesn't whitelist the host. Check `images.remotePatterns` — should match `*.supabase.co`.

### Test the round flow

1. Admin → **Rounds** → **New round** → title, opens-at (now), closes-at (a few hours), delivery date (a few days out), add 1–2 products with stock + price.
2. Save. From the round edit page → **Status** card → click **Open round**.
3. Visit `/` — products show up under the round info banner.

You're done. 🎉

---

## How the code wires to Supabase (for context)

| File | What it does |
|---|---|
| [`src/lib/supabase/server.ts`](../src/lib/supabase/server.ts) | Server Components / Server Actions — uses publishable key, reads session from cookies. |
| [`src/lib/supabase/client.ts`](../src/lib/supabase/client.ts) | Browser-side (login form) — uses publishable key, manages session in cookies. |
| [`src/lib/supabase/middleware.ts`](../src/lib/supabase/middleware.ts) | Refreshes the session on every request, redirects unauthorized admins to login. |
| [`src/lib/supabase/admin.ts`](../src/lib/supabase/admin.ts) | Secret-key client — only for server-side image uploads via [`src/lib/storage.ts`](../src/lib/storage.ts). |
| [`src/lib/db.ts`](../src/lib/db.ts) | Prisma client singleton — talks to Postgres via `DATABASE_URL`. |
| [`prisma/schema.prisma`](../prisma/schema.prisma) | Source of truth for the database schema. |

The Auth flow:

```
Browser                  Next.js                Supabase
   │                        │                       │
   │── enter email ────────▶│                       │
   │                        │── signInWithOtp ─────▶│
   │                        │                       │  emails magic link
   │── click link ─────────────────────────────────▶│
   │◀── 302 to /admin/auth/callback?code=… ────────│
   │── GET callback ───────▶│                       │
   │                        │── exchangeCodeForSession ▶
   │                        │◀── session JWT ───────│
   │◀── 302 + cookies ──────│                       │
   │── GET /admin ─────────▶│ middleware reads cookie, allows
```

---

## Deploying to Vercel later

1. **Vercel project settings → Environment Variables**: paste every var from `.env.local` (set them for Production, Preview, and Development).
2. **Update `NEXT_PUBLIC_SITE_URL`** to your Vercel URL (`https://<project>.vercel.app`).
3. **Back in Supabase → Authentication → URL Configuration**: add `https://<project>.vercel.app/admin/auth/callback` and `https://<project>.vercel.app/**` to the redirect allowlist. Optionally update the Site URL too.
4. Future schema changes: run `npx prisma migrate deploy` in Vercel's build command, or run migrations locally before deploying. (Already in `postinstall`: `prisma generate` only, not `migrate`.)

---

## Resetting / starting over

```bash
npx prisma migrate reset    # drops + recreates all tables (DELETES DATA)
```

Storage objects survive — wipe them via Storage → bucket → select all → delete.
Auth users survive — wipe via Authentication → Users → delete.

---

## Troubleshooting cheat sheet

| Symptom | Likely cause |
|---|---|
| `Missing required environment variable: ...` at boot | `.env.local` not loaded — restart `npm run dev`. |
| Login email never arrives | Free-tier rate limit hit, or wrong Site URL. Check Authentication → Logs. |
| `?error=not_authorized` after clicking magic link | Email isn't in `ADMIN_EMAILS`. |
| `?error=exchange_failed` or Supabase error page | Callback URL not in **Redirect URLs** list. |
| Images don't render on storefront | Bucket isn't public, or `next.config.ts` `remotePatterns` doesn't match the host. |
| `Can't reach database server` | Wrong hostname/region, or password contains unencoded special chars. |
| Build fails on Vercel: `Module not found: @prisma/client` | Ensure `postinstall: prisma generate` is in `package.json` (it is). |

---

## When the dashboard moves things again

Supabase reorganizes the dashboard every few months. If a step in this guide doesn't match what you see:

1. Use the dashboard search (`Cmd/Ctrl-K`) — most things are findable by name.
2. Connection strings: always behind the **Connect** button at the top of any project page.
3. API keys: always under **Settings** somewhere — search "API Keys".
4. Auth redirect URLs: always under **Authentication** → search "URL Configuration".
5. Storage: always a top-level sidebar item.

The env vars and what they do don't change — only where you click to copy them.
