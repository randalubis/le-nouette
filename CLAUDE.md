# Le Nouette

Cheese-stick preorder micro-business ordering system. Next.js app in `./app`.

Read `docs/product-spec.md` and `docs/technical-spec.md` before non-trivial work — each is a hub linking to topic spokes in `docs/product/` and `docs/technical/`. Check `docs/implementation-status.md` first to see what's actually built vs backlog before assuming spec behavior exists in code.

Persona/subagent workflow, model/effort rules, and handoff protocol live in **`AGENTS.md`** — read it before acting as (or dispatching) a subagent.

Domain logic lives in `app/src/lib/domain/`.

Run from `./app`: `npm run dev` · `npm test` · `npm run lint` · `npm run build`
