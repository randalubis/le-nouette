# Le Nouette

Cheese-stick preorder micro-business ordering system. Next.js app in `./app`.

Read `docs/product-spec.md` and `docs/technical-spec.md` before non-trivial work — each is a hub linking to topic spokes in `docs/product/` and `docs/technical/`. Check `docs/implementation-status.md` first to see what's actually built vs backlog before assuming spec behavior exists in code.

Persona/subagent workflow, model/effort rules, and handoff protocol live in **`AGENTS.md`** — read it before acting as (or dispatching) a subagent.

Domain logic lives in `app/src/lib/domain/`.

Run from `./app`: `npm run dev` · `npm test` · `npm run lint` · `npm run build`

After a verified working change, commit and push to `main` — no confirmation needed for this repo. Verify first (test/lint/build as relevant); don't push broken or WIP state.

## Expected session setup

This project assumes: **caveman** (full), **ponytail** (full), **superpowers**, **frontend-design** available. These are user-scope plugins/skills activated via `~/.claude` hook config, not by this file — this note is a reminder for humans/other machines, not a functional switch. If a session is missing one, the user-scope plugin install is what's missing, not this doc.
