# Deploying to Vercel

Everything you need to take Le Nouette from `localhost:3000` to a public Vercel URL. Allow ~30 minutes for the first deployment. Subsequent deploys are one `git push`.

> Reflects Vercel + Supabase as of **May 2026**. If a UI label has moved, the search box (`Cmd/Ctrl-K`) on each platform usually finds it.

---

## 0. Pre-flight checklist

Run these once before you start:

- [ ] App builds locally without errors:
      ```bash
      npm run build
      ```
- [ ] You are signed in to GitHub.
- [ ] You have a Supabase project set up per [SUPABASE_SETUP.md](SUPABASE_SETUP.md). It works on `localhost`.
- [ ] Your `.env.local` has all 10 vars filled in and is **not** committed (it's gitignored).
- [ ] You have a strong `ADMIN_PASSWORD` set (not the placeholder).

---

## 1. Push the code to GitHub

If you haven't already:

```bash
# From the project root
git init                              # if no .git yet
git add .
git status                            # ✅ verify .env.local is NOT in the list
git commit -m "Initial commit"
```

Create a **new GitHub repo** at https://github.com/new — name it `le-nouette`, **Private** (recommended for a business app), no README/license/gitignore (we already have them).

GitHub shows you the push commands; from your project root:

```bash
git remote add origin git@github.com:<your-username>/le-nouette.git
git branch -M main
git push -u origin main
```

> **One thing to triple-check:** open the GitHub repo in your browser and look through the file tree. Confirm `.env.local` is **not** there. If it is, **rotate every secret immediately** (Supabase service role key, database password, admin password, session secret) and force-push a clean history. Github sees everything.

---

## 2. Generate a fresh production session secret

The `ADMIN_SESSION_SECRET` you have locally should **not** be reused in production — different envs, different secrets. Generate a new one:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the 64-character output. You'll paste it into Vercel in the next step.

> **Why a new one?** If the local secret leaks (a dev's laptop, a test environment's logs), an attacker would have a forged-cookie key for production too. Rotate per env.

---

## 3. Import the project on Vercel

1. Go to **[vercel.com](https://vercel.com/new)** and sign in (GitHub login is fastest — it'll auto-link your repos).
2. **Add New… → Project**.
3. Find your `le-nouette` repo in the list and click **Import**.
4. **Framework Preset**: Vercel auto-detects **Next.js**. ✅
5. **Root directory**: leave as `./` (default).
6. **Build & Output Settings**: leave defaults. Our `package.json` has `postinstall: "prisma generate"`, so Prisma client is regenerated on every build automatically.
7. **Environment Variables**: this is the big step. Add all of these (paste exactly the same names you have in `.env.local`, with the values noted below):

   | Variable | Value | Notes |
   |---|---|---|
   | `DATABASE_URL` | (from Supabase Connect → ORMs → Prisma) | Same string as `.env.local` — pooler `:6543` URL with `pgbouncer=true&connection_limit=1`. |
   | `DIRECT_URL` | (from Supabase Connect → ORMs → Prisma) | Port `:5432`. |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` | Origin only — no path. |
   | `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` (or legacy JWT) | Settings → API Keys. **Server-only.** |
   | `SUPABASE_STORAGE_BUCKET` | `le-nouette` | (or whatever you named it) |
   | `ADMIN_EMAIL` | your email | |
   | `ADMIN_PASSWORD` | your strong password | **Use a different one from local if you can.** |
   | `ADMIN_SESSION_SECRET` | the 64-char hex you just generated | **Production-only.** |
   | `NEXT_PUBLIC_SITE_URL` | leave blank for now, fill in after deploy | |
   | `NEXT_PUBLIC_BUSINESS_WHATSAPP` | `628xxxxxxxxx` | E.164 without `+`. |

   For each one, leave the **Production / Preview / Development** checkboxes all checked (default).

8. Click **Deploy**.

The first build takes 2-3 minutes. Watch the build log; common issues if it fails:
- `Module not found: @prisma/client` → confirm `package.json` has `"postinstall": "prisma generate"` (it does).
- `prepared statement "s0" already exists` at runtime → `DATABASE_URL` is missing the `?pgbouncer=true&connection_limit=1` suffix.

---

## 4. Apply the database migrations to production

Your local `prisma migrate dev` created tables in your **dev** Supabase project. Production points to the same project (we're using one Supabase project for both dev and prod), so the schema is already there. **No migration needed for first deploy.**

> If you ever want a separate prod Supabase project, you'd run `npx prisma migrate deploy` against the prod `DIRECT_URL` once before first deploy. For your scale, one project is fine — just back it up.

---

## 5. First successful deploy — finish the wiring

Once Vercel says **Deployment succeeded**, you'll get a URL like `https://le-nouette-abc123.vercel.app`.

### 5a. Set NEXT_PUBLIC_SITE_URL

1. Vercel project → **Settings → Environment Variables** → find `NEXT_PUBLIC_SITE_URL`.
2. Edit it, set to `https://<your-app>.vercel.app` (your actual URL).
3. Save → click **Redeploy** in the **Deployments** tab on the latest deployment to pick up the new value.

### 5b. (No Supabase auth redirect URLs needed)

Since we replaced Supabase Auth with cookie-based admin login, **you do NOT need to update Supabase's URL Configuration list**. The auth setup steps from `SUPABASE_SETUP.md` step 5 don't apply anymore.

The only Supabase touchpoint at runtime is **Storage** for product images, which doesn't care about your domain.

---

## 6. Smoke test production

Visit your Vercel URL:

1. **`/`** → see your storefront. If a round is open, products show. (If you only have data on local, see step 7.)
2. **`/admin/login`** → sign in with `ADMIN_EMAIL` + `ADMIN_PASSWORD`. You should land on the dashboard.
3. Try creating a product (verifies Storage uploads work in prod).
4. Try placing a test order on the storefront (verifies the order pipeline + DB writes work).
5. Verify the WhatsApp deep link on the order confirmation opens with the correct number prefilled.

If you hit issues, the **Vercel deploy logs** (Deployments → click a deploy → Runtime Logs) show every server log line including Prisma errors.

---

## 7. (Optional) Use a custom domain

When you outgrow `*.vercel.app`:

1. Buy a domain (Namecheap, Cloudflare, etc).
2. Vercel project → **Settings → Domains** → **Add** → enter your domain.
3. Vercel shows you the DNS records to add at your registrar (an `A` record or `CNAME`). Add them.
4. Wait ~10 minutes for propagation. Vercel auto-provisions an SSL cert.
5. Update `NEXT_PUBLIC_SITE_URL` to the new domain. Redeploy.

---

## 8. Going live for real customers

Before sharing the link with friends/colleagues:

- [ ] Change `ADMIN_PASSWORD` to something strong if you haven't.
- [ ] Place a test order yourself end-to-end. Cancel it from admin afterward (it auto-restores stock).
- [ ] Open a fresh round with real products + QRIS image.
- [ ] Set the round status to **Open**.
- [ ] Verify your `NEXT_PUBLIC_BUSINESS_WHATSAPP` is correct — clicking "Kirim ke admin via WhatsApp" should open a chat to *your* number.
- [ ] Save the production URL into a Google/iPhone shortcut so you can share it quickly.

---

## 9. Day-to-day workflow

After the initial deploy, your loop is:

```bash
# Make code changes locally
npm run dev                  # test on localhost:3000

git add .
git commit -m "Add new product field"
git push                     # auto-deploys to Vercel
```

Vercel rebuilds in ~1-2 minutes. Each push to `main` becomes the new production. Pushes to other branches become **preview** deployments at unique URLs (great for testing before merging).

### Schema changes

When you change `prisma/schema.prisma`:

```bash
# Locally
npx prisma migrate dev --name add_some_field   # creates and applies migration

# Commit the new migration files
git add prisma/migrations
git commit -m "Add some field"
git push
```

Vercel's build doesn't run migrations automatically. **You have two options:**

- **Option A — manual**: After pushing, run `npx prisma migrate deploy` from your laptop with `DIRECT_URL` pointing at production. Fine when you have one prod env.
- **Option B — automated**: Change Vercel's Build Command (Settings → Build & Deployment) to `prisma migrate deploy && next build`. Migrations run on every deploy. More automated, but a failing migration breaks deploys.

For your scale, Option A is fine and gives you control. If you forget to migrate, the deploy will succeed but app routes that touch the new column will error — Vercel's runtime logs will tell you.

---

## 10. Backups

Supabase Free tier includes **7 days of point-in-time recovery** automatically (Project Settings → Database → Backups). For extra safety:

```bash
# Snapshot to a local file
npx prisma db pull              # syncs schema (informational)
pg_dump "$DIRECT_URL" > backup-$(date +%Y%m%d).sql
```

If you ever want to upgrade Supabase to a paid plan, daily backups + 30-day retention come standard.

---

## 11. Rotating secrets (when something leaks)

If a secret leaks (committed to GitHub, posted in chat, lost laptop):

| Secret | How to rotate |
|---|---|
| `ADMIN_PASSWORD` | Change the env var in Vercel → redeploy. |
| `ADMIN_SESSION_SECRET` | Change the env var in Vercel → redeploy. **All existing admin sessions are invalidated** (you'll need to re-login). |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Settings → API Keys → **Roll** → update Vercel env var. |
| Database password | Supabase → Settings → Database → **Reset database password** → update both `DATABASE_URL` and `DIRECT_URL` in Vercel. |

After rotating, **redeploy** for the new values to take effect.

---

## Common production gotchas

| Symptom | Likely cause | Fix |
|---|---|---|
| Build fails on first deploy | Missing env var | Vercel build log will name it. |
| 500 errors on storefront | DB connection issue | Check `DATABASE_URL` — should have `?pgbouncer=true&connection_limit=1`. |
| Image upload works locally, fails in prod | Bucket name mismatch | `SUPABASE_STORAGE_BUCKET` must match exactly. Or bucket is not public. |
| `/admin` returns 401 in incognito | Working as intended | Cookie is set after `/admin/login`. |
| Magic link / OTP code error | You're on an outdated branch | The current code uses email + password, not magic links. |
| Order creation hangs / 500 | Prisma transaction timeout | We've already raised it to 20s in [src/app/api/orders/route.ts](../src/app/api/orders/route.ts). If still timing out, your Supabase region is far from Vercel's region. |

---

## What's intentionally not automated

These are deliberate choices for an MVP — revisit if you grow:

- **No CI tests on PRs.** Vercel's build serves as a basic check. Add GitHub Actions when the codebase has tests.
- **No staging environment.** Preview deployments per branch cover the same need. Promote to prod by merging to `main`.
- **No error tracking (Sentry).** Vercel's runtime logs are enough at this scale. Add Sentry once you have customers other than friends.
- **No automated backups beyond Supabase's defaults.** Manual `pg_dump` works for now.

---

## A quick glossary

- **Vercel**: hosts your Next.js app — runs the server, serves static files, handles routing.
- **Supabase**: hosts your Postgres database, image storage, and (we're not using their auth anymore).
- **Production**: what's live at your `*.vercel.app` URL — comes from your `main` branch.
- **Preview**: a temporary deploy of a branch — separate URL, useful for testing.
- **Environment variable**: a secret/config value injected at build/runtime.
- **Migration**: a versioned schema change file — committed alongside code.
