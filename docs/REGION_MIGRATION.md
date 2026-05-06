# Region migration walkthrough — Sydney → Singapore

This guide moves your Supabase project from `ap-southeast-2` (Sydney) to `ap-southeast-1` (Singapore) to cut Jakarta latency from ~120ms to ~40ms RTT.

**Supabase doesn't support changing a project's region.** The flow is: create a new project in Singapore, dump-and-restore the database, copy Storage objects, update env vars on Vercel, decommission the old project.

> Verified against Supabase docs as of early 2026. Two relevant changes from older guides:
> - New projects (created after 1 Nov 2025) ship **only** with the new key format `sb_publishable_*` and `sb_secret_*`. Legacy `anon` / `service_role` JWTs are no longer issued for new projects. The `@supabase/supabase-js` SDK accepts either format in the same slot, so our code needs no changes — you just paste the new value.
> - The "Change Project Region" troubleshooting page is currently a 404. The current reference is **[Backup and Restore using the CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)**.

**Time budget:** ~60-90 min end-to-end, with **~20 min of customer downtime** while writes are frozen.

**Prerequisites:**
- Supabase CLI ≥ v1.190 (`brew install supabase/tap/supabase` or [other install options](https://supabase.com/docs/guides/cli/getting-started))
- `psql` (`brew install libpq && brew link --force libpq`)
- Node.js 20+ (you already have this)
- Vercel CLI is optional but convenient (`npm i -g vercel`)
- The current Supabase project's database password (set when you created it). If you've forgotten it, **reset it now** in the old project's Settings → Database before you start — the dump uses it.

---

## What changes and what doesn't

**Changes:**
- Project ref (the `<ref>` in `https://<ref>.supabase.co`) — there's no way to keep the old hostname unless you're on a paid plan with custom domains. Plan accordingly.
- Pooler hostname (e.g. `aws-1-ap-southeast-2.pooler.supabase.com` → `aws-?-ap-southeast-1.pooler.supabase.com`). **Copy verbatim from the new dashboard's Connect panel** — Supabase has been shifting between `aws-0-…` and `aws-1-…` per project, so don't construct it.
- API keys — the new project will give you `sb_publishable_…` and `sb_secret_…`.
- All Storage object URLs persisted in the database (we'll rewrite these in step 7).

**Doesn't change:**
- Your code. The env-var **names** stay the same (`DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`); only the values change.
- Prisma schema, migrations, application logic.
- Bucket name (`le-nouette`).
- Customer-facing URLs (your Vercel domain stays the same).

---

## Phase 0 — Pre-flight (do this the day before)

1. **Pick a low-traffic time** — early morning or late evening Jakarta time, when no rounds are open. Easiest: schedule the migration between two rounds.
2. **Note the current values** from Vercel Project Settings → Environment Variables. You'll need these as a fallback if anything goes wrong:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_STORAGE_BUCKET` (should be `le-nouette`)
3. **Verify the local `.env.local`** matches Vercel's values for the variables above. We'll use `.env.local` to talk to the **old** project during the dump.
4. **Test that the Supabase CLI works** against the old project:
   ```bash
   set -a; . ./.env.local; set +a
   supabase --version
   psql "$DIRECT_URL" -c "SELECT count(*) FROM \"Order\";"
   ```
   You should see a row count. If `psql` errors with "no pg_hba.conf entry" or "SSL", the connection string is wrong — re-copy from the dashboard.
5. **Take a sanity snapshot** of the old DB row counts. We'll compare these after restore:
   ```bash
   psql "$DIRECT_URL" <<'SQL'
   SELECT 'Product' AS tbl, count(*) FROM "Product"
   UNION ALL SELECT 'PreorderRound', count(*) FROM "PreorderRound"
   UNION ALL SELECT 'RoundProduct', count(*) FROM "RoundProduct"
   UNION ALL SELECT 'Order', count(*) FROM "Order"
   UNION ALL SELECT 'OrderItem', count(*) FROM "OrderItem"
   UNION ALL SELECT 'Payment', count(*) FROM "Payment"
   UNION ALL SELECT 'OrderStatusEvent', count(*) FROM "OrderStatusEvent"
   UNION ALL SELECT 'BusinessSettings', count(*) FROM "BusinessSettings"
   UNION ALL SELECT 'OrderCounter', count(*) FROM "OrderCounter";
   SQL
   ```
   Save this output to compare later.

---

## Phase 1 — Create the new Supabase project in Singapore

1. **[supabase.com/dashboard](https://supabase.com/dashboard)** → **New project** (top-right inside an organization).
2. Fill in:
   - **Name**: `le-nouette-sg` (any name works — purely a label).
   - **Database password**: generate a fresh strong one. **Save it in your password manager.** You'll need it for the connection strings.
   - **Region**: **Southeast Asia (Singapore)** — `ap-southeast-1`.
   - **Pricing plan**: same as your current one (Free is fine).
3. Click **Create new project** and wait ~2 minutes for provisioning.
4. Once the dashboard loads, go to **Settings → API Keys** and copy:
   - **Project URL** — looks like `https://<new-ref>.supabase.co`. This becomes your new `NEXT_PUBLIC_SUPABASE_URL`.
   - **`sb_secret_…` key** — this becomes your new `SUPABASE_SERVICE_ROLE_KEY` value (the env-var name is misleading after the rename, but the SDK accepts the new format and the code doesn't care).
5. Go to **Connect** (top-right "Connect" button or **Settings → Database**) and copy:
   - **Session pooler** URI on port **5432**. Looks like `postgresql://postgres.<new-ref>:[YOUR-PASSWORD]@aws-?-ap-southeast-1.pooler.supabase.com:5432/postgres`. Replace `[YOUR-PASSWORD]`. This becomes your new `DIRECT_URL`.
   - **Transaction pooler** URI on port **6543** (or in the dialog, "Connection pooling → Transaction"). Append `?pgbouncer=true&connection_limit=1` if not already present. This becomes your new `DATABASE_URL`.

   > The session pooler (5432) is what we use for migrations and the dump/restore — it supports session-level features. The transaction pooler (6543) is for the runtime app; it's lighter on connections but doesn't support `SET session_replication_role`, prepared statements, etc.

Save all of these in a scratchpad — you'll paste them into Vercel in Phase 8.

---

## Phase 2 — Recreate the Storage bucket on the new project

The DB dump doesn't touch Storage. We'll copy the objects in Phase 6, but the **bucket itself** needs to exist first with the right settings.

1. On the **new** project's dashboard → **Storage** → **New bucket**.
2. Name: **`le-nouette`** (must match `SUPABASE_STORAGE_BUCKET`).
3. **Public bucket**: ✅ ON (our app reads via public URLs).
4. **File size limit**: 5 MB (matches `MAX_BYTES` in [src/lib/storage.ts](src/lib/storage.ts)).
5. **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp` (matches `ALLOWED_MIME` in the same file).
6. Click **Save**.

The folder structure (`products/`, `qris/`, `payment-proofs/`) is created implicitly when objects are uploaded — no manual setup.

---

## Phase 3 — Freeze writes (cutover begins)

From this point, **no new orders should be created** until Phase 10. We have ~20 min.

Pick whichever feels easier:

**Option A — quick and visible (recommended):**
1. Sign into the admin at `https://<your-vercel-domain>/admin`.
2. **Rounds** → open the currently OPEN round → **Close** it. The storefront will show "preorder ditutup".
3. Tell customers via WhatsApp: "Sebentar maintenance singkat, ~20 menit."

**Option B — pause Vercel deployments:**
1. Vercel → Project → Settings → **General** → **Pause deployments**. Existing deployment keeps running.
2. This doesn't actually stop writes, just prevents accidental redeploys mid-cutover. Combine with Option A.

> Don't put up a maintenance page — for our scale, just closing the round is sufficient.

---

## Phase 4 — Dump the old database

Working in the repo root with `.env.local` pointing at the **old** Sydney project:

```bash
set -a; . ./.env.local; set +a

# Dump roles, schema, and data into three SQL files.
# These are the exact commands from the Supabase Backup & Restore docs.
supabase db dump --db-url "$DIRECT_URL" -f roles.sql --role-only
supabase db dump --db-url "$DIRECT_URL" -f schema.sql
supabase db dump --db-url "$DIRECT_URL" -f data.sql --use-copy --data-only \
  -x "storage.buckets_vectors" -x "storage.vector_indexes"
```

Sanity-check the dumps:
```bash
ls -lh roles.sql schema.sql data.sql
head -20 schema.sql      # should start with CREATE / SET statements
grep -c "COPY public" data.sql   # should be > 0
```

If any of the three files is empty or under a few KB, stop — the dump didn't run. Re-check `DIRECT_URL` (it must be the **session pooler on port 5432**, not the transaction pooler on 6543).

> **What's in each file:**
> - `roles.sql` — custom Postgres roles (Supabase-managed roles are skipped).
> - `schema.sql` — tables, indexes, constraints, functions, triggers, RLS policies, sequences.
> - `data.sql` — actual rows, exported via `COPY` (fast).
>
> We don't use any non-default Postgres extensions, so there's no extra "enable extensions on the new project" step. Prisma's `cuid()` IDs are app-side; sequences from `@default(autoincrement())` are dumped in `schema.sql`.

---

## Phase 5 — Restore into the new database

Set the new project's session-pooler URL into a shell variable (the one from Phase 1, port 5432):

```bash
NEW_DIRECT_URL='postgresql://postgres.<new-ref>:<password>@aws-?-ap-southeast-1.pooler.supabase.com:5432/postgres'

# Single-transaction restore. session_replication_role=replica disables
# triggers during the data load (avoids double-encryption of vault columns,
# unique-constraint races on bulk inserts, etc.).
psql --single-transaction --variable ON_ERROR_STOP=1 \
  --file roles.sql \
  --file schema.sql \
  --command "SET session_replication_role = replica" \
  --file data.sql \
  --dbname "$NEW_DIRECT_URL"
```

Expected output: a stream of `SET`, `CREATE`, `ALTER`, `COPY` lines, ending with `COMMIT`. If you see `ERROR` followed by a rollback, fix that error and re-run — the `--single-transaction` flag means partial state is rolled back, so you can retry safely.

Compare row counts to your Phase 0 snapshot:
```bash
psql "$NEW_DIRECT_URL" <<'SQL'
SELECT 'Product' AS tbl, count(*) FROM "Product"
UNION ALL SELECT 'PreorderRound', count(*) FROM "PreorderRound"
UNION ALL SELECT 'RoundProduct', count(*) FROM "RoundProduct"
UNION ALL SELECT 'Order', count(*) FROM "Order"
UNION ALL SELECT 'OrderItem', count(*) FROM "OrderItem"
UNION ALL SELECT 'Payment', count(*) FROM "Payment"
UNION ALL SELECT 'OrderStatusEvent', count(*) FROM "OrderStatusEvent"
UNION ALL SELECT 'BusinessSettings', count(*) FROM "BusinessSettings"
UNION ALL SELECT 'OrderCounter', count(*) FROM "OrderCounter";
SQL
```

Numbers must match exactly. If anything is off, **stop and investigate** before continuing.

---

## Phase 6 — Copy Storage objects from old → new

Supabase still has no first-party CLI command for this in 2026. We use a small Node script that reads via the old project's secret key and writes via the new project's. The script lives at [scripts/migrate-storage.mjs](scripts/migrate-storage.mjs) (committed alongside this guide; delete after migration).

Run it with both projects' credentials in env:

```bash
OLD_SUPABASE_URL='https://<old-ref>.supabase.co' \
OLD_SUPABASE_SECRET_KEY='<old-service-role-or-secret-key>' \
NEW_SUPABASE_URL='https://<new-ref>.supabase.co' \
NEW_SUPABASE_SECRET_KEY='<new-sb_secret_...>' \
SUPABASE_STORAGE_BUCKET='le-nouette' \
node scripts/migrate-storage.mjs
```

The script lists every object in the bucket recursively, downloads, and re-uploads with `upsert: true` so reruns are idempotent. Expected output:

```
Found 142 objects in bucket "le-nouette".
  10/142…
  20/142…
  …
Done. Copied 142/142.
```

If a few uploads fail (e.g., transient 5xx), just rerun the same command — `upsert: true` makes it safe.

Verify in the new dashboard's Storage view: you should see `products/`, `qris/`, and `payment-proofs/` folders with the expected counts.

---

## Phase 7 — Rewrite Storage URLs stored in the database

`Product.imageUrl`, `PreorderRound.qrisImageUrl`, and `Payment.proofImageUrl` all contain full URLs that point at the **old** project's host. After the move, those URLs would 404. One-shot SQL fixes them:

```bash
psql "$NEW_DIRECT_URL" <<SQL
\\set old_ref '<old-ref>'
\\set new_ref '<new-ref>'

UPDATE "Product"
   SET "imageUrl" = REPLACE("imageUrl", :'old_ref' || '.supabase.co', :'new_ref' || '.supabase.co')
 WHERE "imageUrl" LIKE '%' || :'old_ref' || '.supabase.co%';

UPDATE "PreorderRound"
   SET "qrisImageUrl" = REPLACE("qrisImageUrl", :'old_ref' || '.supabase.co', :'new_ref' || '.supabase.co')
 WHERE "qrisImageUrl" LIKE '%' || :'old_ref' || '.supabase.co%';

UPDATE "Payment"
   SET "proofImageUrl" = REPLACE("proofImageUrl", :'old_ref' || '.supabase.co', :'new_ref' || '.supabase.co')
 WHERE "proofImageUrl" LIKE '%' || :'old_ref' || '.supabase.co%';
SQL
```

Replace `<old-ref>` and `<new-ref>` with the project refs (just the subdomain bit, no `https://`). Each `UPDATE` returns its row count; sanity-check that the totals match what you'd expect (every product should have an image; rounds/payments may have null values, which is fine).

Verify by spot-checking one:
```bash
psql "$NEW_DIRECT_URL" -c 'SELECT name, "imageUrl" FROM "Product" LIMIT 1;'
```
The hostname should now contain `<new-ref>.supabase.co`.

---

## Phase 8 — Update Vercel env vars

Vercel → Project → Settings → **Environment Variables**. For each of the four variables below:

1. Click the **…** menu on the row → **Edit**.
2. Replace the value with the new one.
3. Make sure **Production**, **Preview**, and **Development** are all checked.
4. **Save**.

| Variable | New value |
|---|---|
| `DATABASE_URL` | New transaction-pooler URL (port `6543`, with `?pgbouncer=true&connection_limit=1`) |
| `DIRECT_URL` | New session-pooler URL (port `5432`) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<new-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | The `sb_secret_…` value from the new project |

Leave `SUPABASE_STORAGE_BUCKET`, `ADMIN_*`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BUSINESS_WHATSAPP` alone.

After saving, **redeploy**: Vercel → Deployments → latest → **…** → **Redeploy**. Don't tick "use existing build cache" — env-var changes only take effect on a fresh build.

> Why redeploy? Vercel injects env vars at build time for `NEXT_PUBLIC_*` and at runtime for the rest. Server runtime variables update on next cold start, but for clarity (and so build-time env validation runs) it's safest to redeploy.

---

## Phase 9 — Update local `.env.local`

So your local dev hits the new project too:

```bash
# Edit .env.local — same four values as Phase 8.
# Then verify the local app sees the new project:
npx prisma migrate status   # should report "Database schema is up to date!"
psql "$DIRECT_URL" -c 'SELECT count(*) FROM "Order";'   # row count from new DB
```

---

## Phase 10 — Verify and unfreeze

1. Hard-refresh `https://<your-vercel-domain>` in an incognito window. The storefront should load (round still closed, that's expected).
2. Sign into `/admin`. **Login should still work** because the `ADMIN_SESSION_SECRET` cookie is unrelated to Supabase.
3. **Products list** — verify a product image renders (this proves Phase 6 + Phase 7 worked end-to-end).
4. **Rounds → reopen the closed round** (set status back to `OPEN`).
5. **Place a test order** as a customer (incognito), with a fake WhatsApp like `628000000001`. Check it appears in `/admin/orders`. Cancel it afterwards (admin can cancel + auto-restore stock).
6. **Look at network tab** in browser dev tools — connections to `<new-ref>.supabase.co`, no references to the old project ref.
7. Tell customers in the WhatsApp group: "Sudah selesai, silakan order lagi."

If anything is broken: change the four Vercel env vars back to the old values, redeploy, and the old Sydney project takes over again. The dump+restore was non-destructive — the old project is untouched until Phase 11.

---

## Phase 11 — Decommission the old project (after 7 days)

Wait at least a week of normal operation before this. If a problem only surfaces under specific conditions (a particular order flow, a CSV export at month-end), you want the old data still there.

After the cooling-off period:

1. Old Supabase dashboard → **Settings → General → Pause project**. Pausing is reversible for ~14 days; full deletion is permanent.
2. Once you're sure (another week), delete the old project: **Settings → General → Delete project**.
3. **Local cleanup** — delete the dump files from your machine:
   ```bash
   rm roles.sql schema.sql data.sql
   git checkout -- scripts/migrate-storage.mjs   # or remove the file & commit
   ```

---

## Rollback playbook

If something breaks during the cutover and you need to go back fast (within minutes):

1. Vercel → Settings → Environment Variables → set the four variables back to the **old** values.
2. Redeploy. The old Sydney project is still live and untouched.
3. Reopen the round on the storefront.
4. Investigate the failure offline.

The dump+restore created a copy; nothing in the original project changed. The only writes that happened in Singapore are whatever test-order traffic you did in Phase 10, which is fine to discard along with the new project.

---

## Reference: variable name → where to find the new value

| Variable | Where in the new Supabase dashboard |
|---|---|
| `DATABASE_URL` | Connect → Transaction pooler → port `6543` (append `?pgbouncer=true&connection_limit=1` if missing) |
| `DIRECT_URL` | Connect → Session pooler → port `5432` |
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API Keys → **Project URL** |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API Keys → **`sb_secret_…`** key (the `sb_publishable_…` is for client use, not this var) |

---

## What this guide doesn't cover

- **Custom domain** preservation across the move. Requires a paid plan and pre-configuration. If you want to consider this in the future, see [Supabase Custom Domains](https://supabase.com/docs/guides/platform/custom-domains).
- **Read replicas.** An alternative to a full migration: keep Sydney as primary and add a Singapore read-replica for storefront reads. Paid plan only (~$10/mo for the smallest replica). For our write-light workload, a full move is cheaper and gives lower write latency too.
- **Auth schema migration.** We don't use Supabase Auth (single-admin via env vars), so no `auth.*` tables to copy.
