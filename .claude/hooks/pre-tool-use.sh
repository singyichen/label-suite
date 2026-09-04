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

# Shared matchers for the three push checks below.
#
# A git global option (-C, -c, --git-dir, --no-pager, ...) may legally sit
# between `git` and its subcommand, so a check anchored on the literal token
# pair "git push" misses every one of those forms — `git -C <path> push origin
# main` slipped past all three checks. Options are whitelisted rather than
# accepted as "any token": a permissive `git [^ ]* push` would false-positive
# on prose like `git log --grep push`.
#
# AT_CMD anchors a match to command position (start of line, or after a
# shell separator) so quoted prose that merely mentions a push — commit
# messages, PR replies, test fixtures — is not mistaken for one.
GIT_OPT='(-C[[:space:]]+[^[:space:]]+|-c[[:space:]]+[^[:space:]]+|--git-dir[= ][^[:space:]]+|--work-tree[= ][^[:space:]]+|--namespace[= ][^[:space:]]+|--exec-path(=[^[:space:]]+)?|--no-pager|-P|--bare|--literal-pathspecs|--no-replace-objects|--no-optional-locks)'
GIT_PUSH="git([[:space:]]+${GIT_OPT})*[[:space:]]+push"
AT_CMD='(^|[;&|]|\$\()[[:space:]]*'

# Block: any push while the branch it runs on is main/master (AGENTS.md Rule 2).
# Branch detection closes the 'git push origin HEAD' gap a pure regex misses.
if printf '%s\n' "$COMMAND" | grep -qE "${AT_CMD}${GIT_PUSH}([[:space:]]|$)"; then
  # Which branch is "current" depends on which directory the push runs in,
  # and three things can decide that. `git -C <path>` wins, because git
  # honors it over the process cwd. Otherwise a `cd <path>` the command
  # performs before pushing wins, because by then the shell has moved.
  # Only if neither is present does the payload's own "cwd" field decide.
  #
  # "cwd" cannot be trusted on its own: under a subagent it is pinned to the
  # repository root, so a legitimate push from a feature-branch worktree is
  # reported as a push from main and blocked. That false positive is what
  # taught agents to look for the -C bypass in the first place, so both
  # halves are one fix.
  if command -v jq &>/dev/null; then
    CWD=$(printf '%s\n' "$INPUT" | jq -r '.cwd // ""' 2>/dev/null || echo "")
  else
    CWD=$(printf '%s\n' "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('cwd',''))" 2>/dev/null || echo "")
  fi

  # Last occurrence wins for both, matching how git and the shell resolve
  # repeated -C / cd themselves. A path containing whitespace does not
  # survive this extraction; it then resolves to no branch and the next
  # candidate is tried, which is the safe direction.
  C_DIR=$(printf '%s\n' "$COMMAND" | grep -oE '(^|[[:space:]])-C[[:space:]]+[^[:space:]]+' | tail -1 | sed -E 's/.*-C[[:space:]]+//')
  CD_DIR=$(printf '%s\n' "$COMMAND" | grep -oE "${AT_CMD}cd[[:space:]]+[^[:space:]&|;]+" | tail -1 | sed -E 's/.*cd[[:space:]]+//')

  BRANCH=""
  for CAND in "$C_DIR" "$CD_DIR" "$CWD"; do
    [ -z "$CAND" ] && continue
    case "$CAND" in
      /*) ;;
      *) CAND="${CWD:-$PWD}/$CAND" ;;
    esac
    BRANCH=$(git -C "$CAND" branch --show-current 2>/dev/null || echo "")
    [ -n "$BRANCH" ] && break
  done
  # An exhausted chain (no candidate resolves to a branch: missing "cwd",
  # not a repo, detached HEAD) falls back to this process's own cwd — never
  # to allowing the push.
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
if printf '%s\n' "$COMMAND" | grep -qE "${AT_CMD}${GIT_PUSH}[^|&;]*[[:space:]:](main|master)([[:space:]]|$)"; then
  echo "❌ Blocked: direct push to main/master. Create a branch and open a PR instead (AGENTS.md Rule 2)." >&2
  exit 2
fi

# Block: force push (requires explicit user confirmation)
# --force-with-lease is allowed (safer: checks remote hasn't diverged), and is
# excluded by requiring whitespace or end-of-string right after --force.
# The whole match is anchored to one command segment ([^|&;]*) at command
# position, so a file or message that merely contains both words — this
# hook's own test fixtures, for one — is not read as a force push.
if printf '%s\n' "$COMMAND" | grep -qE "${AT_CMD}${GIT_PUSH}[^|&;]*[[:space:]](--force|-f)([[:space:]]|$)"; then
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
