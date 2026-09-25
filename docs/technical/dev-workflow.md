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

### 5.1 Dev server startup

```bash
cd app
ADMIN_EMAIL=dev@test.local \
ADMIN_PASSWORD=devpass \
ADMIN_SESSION_SECRET=devsecret \
npm run dev
```

Then browse `http://localhost:3000/founder/` and log in with `dev@test.local` / `devpass`.

### 5.2 Why throwaway?

- **Local dev shares production Supabase** (see §6 below).
- Throwaway credentials ensure you never accidentally use a real founder email in dev.
- Session cookies are HMAC-signed but httpOnly and single-device only.

### 5.3 Change credentials between sessions

Use different throwaway values (e.g., `audit@test.local` for reviewer runs, `dev@test.local` for engineer runs) to keep sessions isolated and avoid confusion.

---

## 6. Shared-database warning

**CRITICAL:** Local dev writes to the same Supabase project as production. There is no separate local database replica.

### 6.1 What this means

When you run `npm run dev` from `app/`:
- `DATABASE_URL` in `.env.local` points to Supabase project `xvbloiuwedrpcrjjusky` (ap-southeast-1).
- **Any mutation** (order creation, payment record, stock receipt, reschedule, etc.) goes straight to the live database.
- Tests that call domain actions (e.g., `createOrder`) must **never run against this dev DB**.

### 6.2 Protecting production

**Never run the test suite against the dev database:**

```bash
# ✗ WRONG: writes test data to production
cd app && npm test

# If tests need a DB, use a local Supabase instance (not yet configured in this repo).
```

The current test setup (`app/src/lib/domain/domain.test.ts`) uses in-memory mocks; it does not hit the database. Respect this boundary.

### 6.3 If you need persistent test data

- Create it manually via the Founder OS UI (use throwaway credentials).
- Inspect via `npm run dev` and manually verify logic.
- Clean up before handing off to reviewer or merging.
- **Do not commit schema changes or DDL statements without understanding their production impact.**

---

## 7. Related docs

- [architecture.md](./architecture.md) — system boundaries, components, domain model.
- [security.md](./security.md) — auth implementation detail (HMAC cookies, env credential).
- [AGENTS.md](../../AGENTS.md) — full persona workflow, model/effort rules, UI baseline.
- `.claude/playwright/README.md` — audit kit reference.
