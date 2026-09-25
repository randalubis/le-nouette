# Le Nouette — agent workflow

Four persona subagents live in `.claude/agents/`. Dispatch by role, not by hand — descriptions are written for the Agent-tool router to auto-match.

**Registered agent names:** `le-nouette-engineer`, `le-nouette-designer`, `le-nouette-reviewer`, `le-nouette-docs`. Use these for Agent-tool calls and pass them as `agentType` in Workflow scripts — never substitute generic/general-purpose agents for a role a persona covers (inline edits are fine for trivial CSS/copy fixes, but non-trivial UI/UX work goes through the loop below).

## Persona table

| Persona | Agent file | Trigger | Model | Effort | Tools | Hands off to |
|---|---|---|---|---|---|---|
| Engineer | `.claude/agents/engineer.md` | Build/scaffold/fix Next.js code, domain logic, session-store, i18n, tests | Sonnet 5 (Opus 5.5 for long multi-file sessions) | scaled to task; low/medium on Opus escalation | Read, Edit, Write, Bash, Grep, Glob | reviewer (after non-trivial build), designer (visual polish) |
| Designer | `.claude/agents/designer.md` | Visual/UX of storefront or Founder OS — layout, styling, "make it feel premium" | Sonnet 5 (escalate per shared table for multi-screen redesign orchestration) | scaled to task | Read, Edit, Write, Grep, Glob | engineer (implementation), reviewer (fresh-eyes pass) |
| Reviewer | `.claude/agents/reviewer.md` | Fresh-eyes, end-user-POV critique, pre-ship gut check | Fable 5.1 | low/medium | Read, Grep, Bash (read-only) | engineer / designer, whoever owns the flagged area |
| Docs | `.claude/agents/docs.md` | Keep docs in sync after code change, backlog grooming, or spec drift — update `docs/implementation-status.md`, cross-link spokes | Haiku 4.5 | low | Read, Edit, Write, Grep, Glob | engineer (if drift needs semantic re-derivation, escalate to Sonnet) |

## Shared model/effort rules (single source — don't restate per agent)

- Heavy multi-agent orchestration → Opus 5.5 or Fable 5.1.
- Long coding session → at least Opus 5.5, low/medium effort.
- General coding task → Sonnet 5, effort scaled to task size.
- Reading/searching docs only → Haiku 4.5 (cheapest).
- In-depth critique/review → Fable 5.1, low/medium.
- Every persona's model/effort choice must be defensible against this table — not decorative. Token efficiency is strict.
- Orchestrator (the main chat session dispatching these personas) has no dedicated agent file — stays on the session's own model. Default **Sonnet 5, low effort**; escalate to Opus 5.5 low only if orchestration itself gets complex (parallel dispatch, cross-flow dependency tracking), per the "heavy multi-agent orchestration" rule above.

## Handoff protocol

1. Engineer builds or fixes a feature.
2. Reviewer does a fresh-eyes pass (end-user POV, read-only). The reviewer must run the Playwright kit in `.claude/playwright/` (mobile + desktop, light + dark, read-only) and base the review on the screenshots and metrics. Output: **(1)** quality score from the end-user's POV (e.g. `7/10` + one-line reason), **(2)** improvement-aspect list for engineer/designer to act on.
3. Engineer/designer iterate on the reviewer's list — engineer for logic/wiring, designer for visual/UX.
4. Repeat step 2 at most **once more** — 2 review iterations max per feature/flow. After the 2nd pass, stop regardless of score: ship, or escalate the open items to the user. No indefinite looping.
5. Skip re-review on trivial fixes — only material changes warrant another pass.
6. **Docs persona is mandatory after EVERY change or feature** (code, UI, config, tooling, agent/workflow rules) — not only behaviour changes. It runs before the commit, updates `docs/implementation-status.md`, the affected `docs/product/` / `docs/technical/` spokes, and the hub docs, and reports files touched. A change is not done until docs are synced; the commit includes the doc edits. If a change needs no doc edit, the docs persona says so explicitly. `.githooks/pre-commit` blocks commits that touch `app/src` or `.claude` without touching `docs/` (override only with `SKIP_DOCS_CHECK=1` and a stated reason).
7. Any persona can be invoked directly by the user for a narrow task; the loop above is the default multi-step pattern, not a mandatory pipeline.

## Playwright review kit

The reviewer's evidence comes from a real browser, not code alone. Kit lives in `.claude/playwright/` (see its README):

- Start `npm run dev` from `app/` with throwaway `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` env vars (founder pages are login-gated; never use real credentials).
- `node .claude/playwright/audit.js <outDir>` — 390 mobile + 1440 desktop, light + dark: load/LCP/CLS, contrast, tap targets, small text, overflow, console errors, screenshots.
- `node .claude/playwright/flow.js <outDir>` — storefront cart to details step.
- Read-only: never submit orders or press mutating founder buttons; the production-connected DB must not be written.
- The Playwright MCP browser can be locked by a stale Chrome; the kit drives Chrome directly and avoids that.

## UI/UX baseline (designer builds to it, reviewer checks it)

- Tap targets >= 44px; text >= 12px; contrast >= 4.5:1 (3:1 large) in light and dark.
- Disabled controls use the solid `.btn:disabled` style in `globals.css`, not opacity.
- Sticky/fixed bars must fit 320px wide and never cover the primary control; hide them when there is nothing to act on.
- Mobile Founder header stays title + avatar; secondary actions (export, logout) live in the avatar menu.

## Design skill delegation

The designer agent invokes the `frontend-design` and `design-taste-frontend` skills for actual design judgment. This doc does not duplicate design rules — see the skills themselves.
