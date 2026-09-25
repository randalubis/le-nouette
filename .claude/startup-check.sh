#!/bin/bash
# SessionStart checklist: verifies plugins, MCP servers, skills/agents, git hooks and Playwright kit,
# then injects the result into the session so Claude reports anything red before working.
# Warn-only: never blocks the session. Fast checks first; `claude mcp list` health-checks with a timeout.
cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}" || exit 0
PLUGINS="caveman@caveman ponytail@ponytail superpowers@claude-plugins-official frontend-design@claude-plugins-official playwright@claude-plugins-official vercel@claude-plugins-official"
MCPS="plugin:playwright:playwright plugin:supabase:supabase plugin:vercel:vercel"
CONNECTORS="claude.ai Gmail|claude.ai Google Calendar|claude.ai Google Drive"
AGENTS="engineer designer reviewer docs"
out=""; red=0
add() { out+="$1"$'\n'; }
bad() { out+="[RED] $1"$'\n'; red=$((red+1)); }

# 1. Plugins enabled (user + project + local settings merged, later wins)
enabled=$(python3 - "$HOME/.claude/settings.json" .claude/settings.json .claude/settings.local.json <<'PY'
import json,sys
m={}
for p in sys.argv[1:]:
    try: m.update(json.load(open(p)).get("enabledPlugins",{}))
    except Exception: pass
print(" ".join(k for k,v in m.items() if v))
PY
)
for p in $PLUGINS; do
  case " $enabled " in *" $p "*) add "[ok] plugin $p";; *) bad "plugin $p NOT enabled (run /plugin, enable it, restart)";; esac
done

# 2. Project agents / hooks / kit
for a in $AGENTS; do
  f=".claude/agents/$a.md"
  if [ ! -f "$f" ]; then bad "persona $f missing"
  elif ! grep -q "^name: le-nouette-$a\$" "$f"; then bad "persona $f frontmatter name is not le-nouette-$a (agentType would not resolve)"
  else add "[ok] persona le-nouette-$a"; fi
done
[ "$(git config core.hooksPath)" = ".githooks" ] || bad "git hooks not active: run  git config core.hooksPath .githooks  (docs pre-commit check)"
[ -f .claude/playwright/audit.js ] || bad ".claude/playwright/audit.js missing (reviewer kit)"
pw="${PLAYWRIGHT_PATH:-/Users/randalubis/.npm/_npx/9833c18b2d85bc59/node_modules/playwright}"
[ -d "$pw" ] || bad "Playwright module not found at $pw (set PLAYWRIGHT_PATH; kit needs it)"
[ -x "${CHROME_PATH:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}" ] || bad "Chrome not found for Playwright kit (set CHROME_PATH)"
[ -f app/.env.local ] || bad "app/.env.local missing (DATABASE_URL etc.)"

# 3. MCP health (plugin servers + claude.ai connectors)
if command -v claude >/dev/null 2>&1; then
  mcp=$(python3 -c "import subprocess;
try: print(subprocess.run(['claude','mcp','list'],capture_output=True,text=True,timeout=25).stdout)
except Exception as e: print('mcp list failed:',e)")
  for s in $MCPS; do
    line=$(printf '%s\n' "$mcp" | grep -F "$s:" | head -1)
    case "$line" in *"✔"*|*Connected*) add "[ok] mcp $s";; "") bad "mcp $s not listed";; *) bad "mcp $s: ${line#*: }";; esac
  done
  IFS='|' read -ra cs <<<"$CONNECTORS"
  for c in "${cs[@]}"; do
    line=$(printf '%s\n' "$mcp" | grep -F "$c:" | head -1)
    case "$line" in *"✔"*|*Connected*) add "[ok] connector $c";; "") add "[warn] connector $c not listed";; *) add "[warn] connector $c needs auth (claude.ai connector settings) — optional";; esac
  done
else
  bad "claude CLI not on PATH; MCP health not checked"
fi

# 4. Stale Playwright MCP Chrome (causes 'Browser is already in use')
pids=$(pgrep -f "ms-playwright-mcp/mcp-chrome" 2>/dev/null | head -3 | tr '\n' ' ')
[ -n "$pids" ] && add "[info] Playwright MCP Chrome already running (pid $pids). If MCP browser tools say 'already in use', kill it or use the .claude/playwright kit."

summary="Startup checklist: $red problem(s)."
ctx="STARTUP CHECKLIST (from .claude/startup-check.sh). First reply of the session: state any [RED] items to the user in one line and ask before proceeding if they block the task.
PERSONA WORKFLOW (AGENTS.md is the source of truth; read it before dispatching): non-trivial work runs engineer/designer (le-nouette-engineer / le-nouette-designer) -> reviewer (le-nouette-reviewer, Fable, MUST run the .claude/playwright kit: audit.js + flow.js, mobile 390 + desktop 1440, light+dark, read-only; score /10 + owner-tagged list) -> iterate on the list -> at most ONE more review (2 passes max; then ship or hand open items to the user) -> le-nouette-docs (mandatory after EVERY change/feature; .githooks/pre-commit blocks app/src|.claude commits without docs/) -> verify (tsc, npm test, lint, build) -> commit + push to main. Pass the le-nouette-* names as agentType in Workflow scripts; never use generic agents for a persona's role. Never mutate the shared production DB in tests (no order submits, no pause/stock/payment buttons); founder login for local dev uses throwaway ADMIN_* env vars only.
$out"
python3 - "$summary" "$ctx" <<'PY'
import json,sys
print(json.dumps({"systemMessage":sys.argv[1],"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":sys.argv[2]}}))
PY
exit 0
