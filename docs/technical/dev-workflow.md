# Development Workflow

[← Technical spec hub](../technical-spec.md)

How Le Nouette's dev process works: the persona loop, local setup, code review kit, and commit gate.

## 1. Persona dispatch workflow

See `AGENTS.md` for the complete flow. In brief:

1. **Engineer** (`le-nouette-engineer`, Sonnet 5) builds/fixes code, then hands off to reviewer.
2. **Reviewer** (`le-nouette-reviewer`, Fable 5.1) runs the Playwright audit kit (.claude/playwright), reads screenshots, and reports quality and improvement aspects on an end-user POV basis (no code review).
3. **Designer** and **Engineer** iterate together on reviewer feedback — max 2 review rounds per feature.
4. **Docs** (`le-nouette-docs`, Haiku 4.5) syncs all documentation against the code; runs after EVERY change (code, UI, config, tooling, agent workflow). A commit does not land until docs pass.

Registered agent names (use these with Agent-tool calls, not generic personas):

```
le-nouette-engineer
le-nouette-designer
le-nouette-reviewer
le-nouette-docs
```

---

## 2. Playwright review kit (used by reviewer)

Lives in `.claude/playwright/` and drives Chrome directly, avoiding MCP browser locks.

### 2.1 Setup

From the `app/` directory:

```bash
# Terminal A: start dev server with throwaway founder credentials
ADMIN_EMAIL=audit@test.local ADMIN_PASSWORD=auditpass ADMIN_SESSION_SECRET=auditsecret npm run dev

# Terminal B (or after dev is ready):
node .claude/playwright/audit.js /tmp/audit-out
node .claude/playwright/flow.js /tmp/audit-out
```

### 2.2 What it audits

**audit.js** (390px mobile + 1440px desktop, light + dark modes):
- Load time, Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS).
- Contrast >= 4.5:1 (3:1 for large text); known false positives: hero text over image, disabled buttons.
- Tap targets >= 44px in all clickable areas.
- Text size >= 12px; warns on smaller labels.
- Overflow, scroll-jank, console errors.
- Writes `result.json` (metrics + failures) and `shots/` directory (screenshots).

**Pages audited** (as of 0.20.3): home, orders, stock, availability, finance, invoices, invoices/new, first invoice's edit page (if any), settings, and login. Founder pages need the `ADMIN_*` env vars (see §2.1).

**flow.js** — storefront add-to-cart → details step (never submits, read-only).

### 2.3 Read-only constraint

The kit must never:
- Submit orders.
- Press mutating Founder OS buttons (dispatch, payment, stock, calendar, reschedule).
- Write to the database.

The production-connected Supabase instance is shared by local dev and cloud; stray mutations poison data. Use throwaway ADMIN_* credentials only for audit runs.

### 2.4 Playwright path overrides

If the kit cannot find Chrome or Playwright:

```bash
export PLAYWRIGHT_PATH=/path/to/playwright/module
export CHROME_PATH=/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome
node .claude/playwright/audit.js /tmp/out
```

---

## 3. Startup checklist

Every session checks plugins, MCP servers, git hooks, and local config via `.claude/startup-check.sh`, wired as a SessionStart hook in `.claude/settings.json`.

### 3.1 What it verifies

From `.claude/startup-check.sh`:

| Check | Failure reason | Fix |
|---|---|---|
| Plugins enabled (1) | caveman, ponytail, superpowers, frontend-design, playwright, vercel, supabase not found in user + project settings | `/plugin`, enable each, restart |
| Plugin LOAD check (1b) | Plugin installed but install directory missing, or ships no skills/hooks/commands/.mcp.json | Reinstall via `/plugin install <plugin-name>` |
| Project agents exist and resolve | `.claude/agents/{engineer,designer,reviewer,docs}.md` missing, or frontmatter `name:` is not `le-nouette-<role>` (so `agentType` would not resolve) | Repo should have these; fix the frontmatter name |
| Git hooks active | `core.hooksPath` not set to `.githooks` | `git config core.hooksPath .githooks` |
| Playwright kit present | `.claude/playwright/audit.js`, `/flow.js` missing | Repo should have these; check git status |
| Playwright executable | module or Chrome not found | Set `PLAYWRIGHT_PATH`, `CHROME_PATH` if custom install |
| Next.js bundled docs (1c) | `app/node_modules/next/dist/docs` missing | `cd app && npm install` (app/AGENTS.md requires reading Next docs before writing code) |
| .env.local exists | Missing local database config | Create `app/.env.local` with `DATABASE_URL=...` |
| .env.development.local (0.21.0) | Missing: `[warn]`, because `next dev` would fall back to `.env.local` (production). `[RED]` if its `DATABASE_URL` is missing or not local | Create it per §5.1 and run `npm run dev:db` |
| Dev server info (1d) | Dev server status; does not fail | Run `npm run dev` from `app/` when needed |
| Database reachable (1d) | Cannot connect to DATABASE_URL or store_status query fails | Check DATABASE_URL in `app/.env.local`, network, `node_modules` |
| Store status (1d) | Database reachable; store status unknown, PAUSED, or other | `[warn]` if PAUSED (DB shared with production); check Founder OS > Kalender to reopen |
| MCP servers online | plugin:playwright, plugin:supabase, plugin:vercel report offline | Rare; usually self-heal. Restart Claude. |
| Playwright MCP Chrome stale | PID reported but not used | Kill: `pkill -f ms-playwright-mcp/mcp-chrome` |

The checklist warns (does not block); check [RED] items before starting work. claude.ai Gmail/Calendar/Drive connectors are `[warn]` only (optional).

### 3.1a What it injects into the session

Besides the `[ok]/[RED]/[warn]/[info]` lines, the hook injects the persona workflow (engineer/designer, then reviewer running the Playwright kit, iterate, at most two review passes, docs persona after every change, tsc/tests/lint/build, commit and push), the rule to pass `le-nouette-*` names as `agentType`, and the guardrail to never mutate the shared production database in tests.

New checks added in 0.3.2:
- **1b (Plugin LOAD check):** Verifies each required plugin is installed in `~/.claude/plugins/` with a valid install directory and ships at least one of: `skills/`, `hooks/`, `commands/`, `agents/`, `.mcp.json`, `.claude-plugin`. Prevents "plugin listed but not actually loaded" surprises. Cannot auto-install; run `/plugin install <name>` if missing.
- **1c (Next.js bundled docs):** Checks `app/node_modules/next/dist/docs` exists (reminder to read it per `app/AGENTS.md`). Run `npm install` in `app/` if missing.
- **1d (Dev server + database):** Checks dev server running on :3000 (info only), database connectivity via DATABASE_URL, and live store status from `store_status` table. Store PAUSED triggers `[warn]` (DB is shared with production); unknown status or connection errors trigger `[RED]`.

The first reply of a session reports any `[RED]` item in one line.

### 3.2 Keep plugin/MCP lists in sync

**In `.claude/startup-check.sh`, lines 6–8:** the `PLUGINS`, `MCPS`, `CONNECTORS` lists must match the actual plugins you use and the MCP servers registered in `.claude/settings.json`.

When you add a plugin or MCP:
1. Add it to the relevant line in `.claude/startup-check.sh`.
2. Ensure it's listed in `.claude/settings.json` (auto-merged by Claude's plugin system).
3. Commit both files.

Example: if you add the `foo-plugin`:
- Add `foo-plugin@foo-plugin` to `PLUGINS` line in startup-check.sh.
- Verify `.claude/settings.json` lists it under `enabledPlugins`.

---

## 4. Pre-commit documentation gate

`.githooks/pre-commit` enforces the docs persona rule:

**If `app/src/` or `.claude/` files are staged, `docs/` must also have staged changes.** Otherwise the commit is rejected.

Rationale: every code change touches docs (status flips, cross-links, new implementation notes). Stale docs are worse than no docs.

### 4.1 How it works

```bash
git config core.hooksPath .githooks
# Now, if you stage app/src files without docs/, the hook blocks:
# pre-commit: app/src or .claude changed but no docs/ file staged.
# Run the le-nouette-docs persona (see AGENTS.md), or set SKIP_DOCS_CHECK=1 with a reason.
```

### 4.2 Bypass (rare)

Only if docs truly do not change (e.g., a linter config fix with zero behavioral impact):

```bash
SKIP_DOCS_CHECK=1 git commit -m "..."
```

Always state the reason in the commit message or in a comment. The default is: **run docs persona**.

---

## 5. Local Founder OS login (throwaway credentials)

Founder OS (`/founder/*`) is gated by `app/src/proxy.ts` + `app/src/lib/founder-auth.ts`. For local dev, use environment variables — never commit real credentials.

### 5.1 Dev server startup (local DB, 0.21.0)

Local development uses the local Postgres database `le_nouette_dev`, set in `app/.env.development.local` (gitignored). `next dev` loads that file before `.env.local`, so the production value in `.env.local` is never used by `npm run dev`. The file also holds the throwaway founder login and a random session secret. Template: `app/.env.example`.

```bash
cd app
npm run dev:db      # create le_nouette_dev if missing, pgcrypto, apply drizzle/0*.sql, seed (idempotent)
npm run dev         # http://localhost:3000/founder/
```

Log in at `http://localhost:3000/founder/login` with `dev@lenouette.local` / `dev-password` (values from `.env.development.local`).

### 5.2 Seed data and reset

- `npm run dev:db` is idempotent: it creates and seeds only when the database has no orders.
- `npm run dev:db:reset` truncates the app tables and reseeds (`--reset` requires the database name `le_nouette_dev`).
- Seed contents (0.22.0): 15 fake orders `LN-0001`..`LN-0015` covering every Pesanan card state, 3 invoices (one paid), company settings, low-stock rows (only the pouch is below its threshold), 5 ready-to-sell units and 2 calendar rows. Dispatch and complete timestamps are set, so the seed reset runs cleanly.
- Two unshipped delivery orders (`LN-0015` is the second, added in 0.22.0), so a two-card bulk dispatch can be tested on the Pesanan page.
- **Viewing loading and error states (0.22.0):** the seed has no trigger. `founder/loading.tsx` shows while a `/founder/*` route is slow: throttle the network in Chrome DevTools and navigate inside Founder OS. `error.tsx` needs a thrown error in a page, and `global-error.tsx` needs one in the root layout. To look at either, throw locally, check the screen, and revert before committing; never commit the throw. The steps are a suggestion and have not been recorded as a verified procedure. See [design system §7.17](./founder-os-design-system.md#717-route-states).

### 5.3 Why throwaway?

- Throwaway credentials ensure you never accidentally use a real founder email in dev.
- Session cookies are HMAC-signed but httpOnly and single-device only.
- Use different throwaway values for different runs if you need isolated sessions (for example the Playwright kit, §2.1).

---

## 6. Production database and local guard

`.env.local` points to the production Supabase project `xvbloiuwedrpcrjjusky` (ap-southeast-1). It is shared with the live app. There is no separate production-like replica.

### 6.1 Rules (0.21.0)

- **Never run tooling against `.env.local`.** Local dev, `db:seed`, `test:integration` and the dev seed all use `le_nouette_dev`. `db:seed` and `test:integration` pin `DATABASE_URL` in `package.json` and do not load `.env.local`.
- **Local dev uses `.env.development.local`**, which `next dev` loads ahead of `.env.local`. Without that file, `npm run dev` falls back to production. `startup-check.sh` warns in that case (§3.1).
- **Host guard:** `app/src/lib/db/local-guard.ts` (`isLocalDb` / `assertLocalDb`) accepts only `localhost`, `127.0.0.1` or `::1`. It is used by the dev seed, `db:seed` and the integration test. It never echoes the URL.
- **Reset tool:** `resetSeedAction` on a non-local database requires `RESET_TOOL_SECRET` to be set and to match, regardless of `NODE_ENV`. The reset also deletes invoices and invoice counters. `company_settings` is kept on purpose. See [security §15.6](./security.md#156-reset-data-tool-guard-0210).
- The `startup-check.sh` store-status query reads `.env.local` (production) by design. It is read-only.

### 6.2 Protecting production

Do not run any tooling against `.env.local`. Unit tests (`npm test`) use in-memory mocks and do not hit a database.

### 6.3 If you need persistent test data

- Use `npm run dev:db` or `npm run dev:db:reset` (local only), then the Founder OS UI with the throwaway login.
- Clean up before handing off to reviewer or merging. The integration test leaves one cancelled "Integration Test" order behind; run `npm run dev:db:reset` after it.
- **Do not commit schema changes or DDL statements without understanding their production impact.**

---

## 7. Test commands

From the `app/` directory:

```bash
# Unit tests (in-memory domain + export logic; no database)
npm test

# Integration tests: pinned to le_nouette_dev (local only); refuses a non-local DATABASE_URL.
# Needs `npm run dev:db` first. Two tests. Leaves one cancelled "Integration Test" order (run dev:db:reset after).
npm run test:integration

# Linter and build check
npm run lint
npm run build
```

Integration tests run with Node's `--conditions=react-server` flag so that `server-only` imports resolve. A preload (`scripts/stub-next-cache.cjs`) stubs `next/cache` and `next/navigation` for this test only, which fixes the earlier `React.createContext` failure under `tsx`.

---

## 8. End-to-end tests (Playwright, local DB only)

Safety rule: e2e uses ONLY a local Postgres database named `le_nouette_e2e`. Never point it at `app/.env.local`'s DATABASE_URL (shared production Supabase). `e2e/playwright.config.ts` hard-sets `DATABASE_URL=postgres://localhost:5432/le_nouette_e2e` (process env beats `.env.local` in Next), `global-setup.ts` aborts unless host is localhost/127.0.0.1 and db is `le_nouette_e2e`, and `safety.spec.ts` proves the running app reads that DB (marker calendar row `2099-01-01`). The webServer never reuses an existing server.

Prerequisites: a local Postgres on `localhost:5432` (e.g. Homebrew `postgresql@17`, running as your user), `psql`/`createdb` on PATH, Google Chrome installed.

```bash
cd app
npm run e2e:setup   # create le_nouette_e2e if missing, pgcrypto, apply drizzle/*.sql once, reset + seed baseline
npm run e2e         # mobile 390 + desktop 1440, headless Chrome, 1 worker, next dev on :3100
```

Each spec file resets the DB in `beforeAll` (truncate all app tables, receive baseline stock, store OPEN, marker date). Founder credentials are throwaway (`e2e@test.local` / `e2e-pass`). Scenario-to-acceptance mapping: [acceptance-tests.md](./acceptance-tests.md). Known behaviour: going offline during order submit shows Next's "This page couldn't load" error page rather than an inline message; the test only asserts no success state.

---

## 7. Related docs

- [architecture.md](./architecture.md) — system boundaries, components, domain model.
- [security.md](./security.md) — auth implementation detail (HMAC cookies, env credential).
- [AGENTS.md](../../AGENTS.md) — full persona workflow, model/effort rules, UI baseline.
- `.claude/playwright/README.md` — audit kit reference.
