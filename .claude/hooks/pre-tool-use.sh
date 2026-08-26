#!/usr/bin/env bash
# pre-tool-use.sh — Block dangerous Bash commands before Claude Code executes them.
#
# Trigger:
#   Registered as a PreToolUse hook in .claude/settings.json for the Bash tool.
#
# IMPORTANT — when this hook fires:
#   Automatically invoked by the Claude Code harness before every Bash tool call.
#   Never run manually.
#   Exit 2 = block the command and surface the error to Claude.
#   Exit 0 = allow the command to proceed.
#
# How it works:
#   Reads the JSON tool-call payload from stdin and extracts the command string.
#   Blocks: any push while checked out on main/master (branch-detected),
#   pushes explicitly naming main/master, force push, pip/npm install,
#   destructive rm -rf on root/home paths, and other dangerous patterns
#   (DROP TABLE, terraform destroy, dd, mkfs, fork bombs, chmod 777 /).
set -uo pipefail

INPUT=$(cat)

if command -v jq &>/dev/null; then
  COMMAND=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")
else
  COMMAND=$(printf '%s\n' "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")
fi

[ -z "$COMMAND" ] && exit 0

# Block: any git push while the current branch is main/master (AGENTS.md Rule 2).
# Branch detection closes the 'git push origin HEAD' gap a pure regex misses.
if printf '%s\n' "$COMMAND" | grep -qE '(^|[;&|]|\$\()[[:space:]]*git push([[:space:]]|$)'; then
  # The push actually runs in the payload's top-level "cwd" (e.g. a linked
  # worktree Claude has cd'd into), which can differ from this hook
  # process's own cwd — so branch detection must prefer "cwd" over a bare
  # `git branch --show-current` (issue #471). If "cwd" yields no branch for
  # any reason (missing, not a git repo, detached HEAD), fall back to the
  # process's own cwd — never fall back to allowing the push.
  if command -v jq &>/dev/null; then
    CWD=$(printf '%s\n' "$INPUT" | jq -r '.cwd // ""' 2>/dev/null || echo "")
  else
    CWD=$(printf '%s\n' "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('cwd',''))" 2>/dev/null || echo "")
  fi
  BRANCH=""
  if [ -n "$CWD" ]; then
    BRANCH=$(git -C "$CWD" branch --show-current 2>/dev/null || echo "")
  fi
  if [ -z "$BRANCH" ]; then
    BRANCH=$(git branch --show-current 2>/dev/null || echo "")
  fi
  if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
    echo "❌ Blocked: current branch is '$BRANCH' — pushing from a protected branch is not allowed. Check out a feature branch first (AGENTS.md Rule 2)." >&2
    exit 2
  fi
fi

# Block: push that explicitly names main/master as a refspec, from any branch.
# Anchored to command position so quoted prose that merely mentions
# "git push ... main" (commit messages, PR replies) does not false-positive.
if printf '%s\n' "$COMMAND" | grep -qE '(^|[;&|]|\$\()[[:space:]]*git push[^|&;]*[[:space:]:](main|master)([[:space:]]|$)'; then
  echo "❌ Blocked: direct push to main/master. Create a branch and open a PR instead (AGENTS.md Rule 2)." >&2
  exit 2
fi

# Block: force push (requires explicit user confirmation)
# --force-with-lease is allowed (safer: checks remote hasn't diverged)
if echo "$COMMAND" | grep -qE 'git push' && \
   echo "$COMMAND" | grep -qE '(^|\s)(--force|-f)\b' && \
   ! echo "$COMMAND" | grep -qE '(^|\s)--force-with-lease'; then
  echo "❌ Blocked: force push requires explicit user confirmation." >&2
  exit 2
fi

# Block: pip/npm install — wrong package managers (AGENTS.md Rule 3)
if echo "$COMMAND" | grep -qE '\b(pip|npm)\s+install\b'; then
  echo "❌ Blocked: use 'uv add' (backend) or 'pnpm add' (frontend) — not pip/npm install (AGENTS.md Rule 3)." >&2
  exit 2
fi

# Block: destructive rm on system/home root paths
if echo "$COMMAND" | grep -qE 'rm\s+(-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*|-[a-zA-Z]*f[a-zA-Z]*r[a-zA-Z]*)\s+(\/(\s|$|[*])|~(\/[*]?)?(\s|$)|(\$\{?HOME\}?|/home|/root)(\/[*]?)?(\s|$))'; then
  echo "❌ Blocked: destructive rm -rf on root/home paths." >&2
  exit 2
fi

# Block: additional destructive commands
NORMALIZED=$(echo "$COMMAND" | tr -s ' \t' ' ')
EXTRA_PATTERNS=(
  "DROP (TABLE|DATABASE)"
  "terraform destroy"
  "dd.*of=/dev/"
  "mkfs\."
  ":\(\)\{.*\};"
  "find.*-delete"
  "chmod -R 777 /"
)
for p in "${EXTRA_PATTERNS[@]}"; do
  if echo "$NORMALIZED" | grep -qiE "$p"; then
    echo "❌ Blocked: dangerous command detected — $p" >&2
    exit 2
  fi
done

exit 0
