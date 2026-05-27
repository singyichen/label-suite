#!/usr/bin/env bash
# Blocks dangerous Bash commands before execution.
# Exit 2 = block and return error to Claude; exit 0 = allow.
set -uo pipefail

INPUT=$(cat)

if command -v jq &>/dev/null; then
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")
else
  COMMAND=$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")
fi

[ -z "$COMMAND" ] && exit 0

# Block: direct push to main/master (AGENTS.md Rule 2)
if echo "$COMMAND" | grep -qE 'git push[^|&]*(origin\s+)?(main|master)\b'; then
  echo "❌ Blocked: direct push to main/master. Create a branch and open a PR instead (AGENTS.md Rule 2)." >&2
  exit 2
fi

# Block: force push (requires explicit user confirmation)
if echo "$COMMAND" | grep -qE 'git push.*(--force|-f)\b'; then
  echo "❌ Blocked: force push requires explicit user confirmation." >&2
  exit 2
fi

# Block: pip/npm install — wrong package managers (AGENTS.md Rule 3)
if echo "$COMMAND" | grep -qE '(^|&&|\|\|)\s*pip install|(\s|^)npm install\b'; then
  echo "❌ Blocked: use 'uv add' (backend) or 'pnpm add' (frontend) — not pip/npm install (AGENTS.md Rule 3)." >&2
  exit 2
fi

# Block: destructive rm on system/home root paths
if echo "$COMMAND" | grep -qE 'rm -rf\s+(\/\s*$|\/\*|\~\s*$|\~\/\*|\$HOME\/?\*?)'; then
  echo "❌ Blocked: destructive rm -rf on root/home paths." >&2
  exit 2
fi

exit 0
