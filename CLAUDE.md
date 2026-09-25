# Le Nouette

Cheese-stick preorder micro-business ordering system. Next.js app in `./app`.

Read `docs/product-spec.md` and `docs/technical-spec.md` before non-trivial work — each is a hub linking to topic spokes in `docs/product/` and `docs/technical/`. Check `docs/implementation-status.md` first to see what's actually built vs backlog before assuming spec behavior exists in code.

Persona/subagent workflow, model/effort rules, and handoff protocol live in **`AGENTS.md`** — read it before acting as (or dispatching) a subagent. Use the registered `le-nouette-*` personas (as `agentType` in Workflow scripts too); non-trivial UI/UX changes follow engineer/designer -> reviewer (with Playwright, `.claude/playwright/`) -> docs.

Domain logic lives in `app/src/lib/domain/`.

Run from `./app`: `npm run dev` · `npm test` · `npm run lint` · `npm run build`

UI/UX changes must be checked in a browser at 390px mobile and 1440px desktop, light and dark, using the Playwright kit in `.claude/playwright/` (baseline in `AGENTS.md`). Founder pages need throwaway `ADMIN_*` env vars for local dev — never commit or use real credentials. After EVERY change or feature, run the docs persona (`le-nouette-docs`) before committing — see `AGENTS.md`; `.githooks/pre-commit` enforces it (`git config core.hooksPath .githooks` on a fresh clone).

After a verified working change, commit and push to `main` — no confirmation needed for this repo. Verify first (test/lint/build as relevant); don't push broken or WIP state.

## Session startup checklist (automatic)

`.claude/settings.json` (checked in) enables the required plugins and runs `.claude/startup-check.sh` at every SessionStart. It verifies: the 7 required plugins are enabled (caveman, ponytail, superpowers, frontend-design, playwright, vercel, supabase) **and load** (installed, install dir present, ships skills/hooks/MCP — a file-level check, not proof the session injected them); MCP health (playwright, supabase, vercel + claude.ai Gmail/Calendar/Drive as optional `[warn]`); the `le-nouette-*` personas (files + frontmatter names); `core.hooksPath=.githooks`; the Playwright kit and Chrome; `app/.env.local`; Next.js bundled docs at `app/node_modules/next/dist/docs` (read them before writing Next code, per `app/AGENTS.md`); dev server on :3000 (info); database reachability and the live store status via a read-only query (`[warn]` if PAUSED — the DB is shared with production). The result is injected into context. **First reply of a session: report any `[RED]` item to the user in one line before starting work** (claude.ai connectors needing auth are only `[warn]`). The script cannot install or authorize anything — fix via `/plugin`, claude.ai connector settings, or the command it prints. Keep the script's `PLUGINS`/`MCPS` lists (and `.claude/settings.json` `enabledPlugins`) in sync when the toolset changes (docs persona rule applies).

## Expected session setup

This project assumes: **caveman** (full), **ponytail** (full), **superpowers**, **frontend-design** available. These are user-scope plugins/skills activated via `~/.claude` hook config, not by this file — this note is a reminder for humans/other machines, not a functional switch. If a session is missing one, the user-scope plugin install is what's missing, not this doc.
