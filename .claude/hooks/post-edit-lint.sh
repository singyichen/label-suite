#!/usr/bin/env bash
# post-edit-lint.sh — Lint Python / TypeScript files immediately after Claude edits them.
#
# Trigger:
#   Registered as a PostToolUse hook in .claude/settings.json with matcher
#   "Edit|Write|NotebookEdit". Fires after every successful edit.
#
# IMPORTANT — when this hook fires:
#   - Reads the edited file path from the tool event JSON on stdin.
#   - Runs the matching linter only if the file falls under backend/ or frontend/.
#   - Skips silently when the target stack isn't initialized yet (backend/frontend
#     are still empty at the time of writing this hook).
#
# Exit codes (Claude Code PostToolUse contract):
#   0  → silent pass
#   2  → lint failed; stderr is fed back to Claude so it can self-correct on the
#        next turn. The edit itself is not undone (PostToolUse fires AFTER the
#        tool runs); the feedback loop is what gives us self-healing behavior.
#   any other non-zero → shown to the user but not to Claude (avoid).
set -uo pipefail

INPUT=$(cat)

# 1. Decode tool_name + file_path from the event JSON.
if ! command -v jq &>/dev/null; then
  exit 0  # no jq → cannot parse; fail open
fi

TOOL_NAME=$(printf '%s' "$INPUT" | jq -r '.tool_name // ""')
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""')

case "$TOOL_NAME" in
  Edit|Write|NotebookEdit) ;;
  *) exit 0 ;;
esac
[ -n "$FILE_PATH" ] || exit 0
[ -f "$FILE_PATH" ] || exit 0

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)
# Resolve FILE_PATH to its physical absolute path so symlinks (e.g. macOS
# /var → /private/var) do not break the REPO_ROOT prefix match.
ABS_FILE_PATH=$(cd "$(dirname "$FILE_PATH")" 2>/dev/null && pwd -P)/$(basename "$FILE_PATH") || exit 0
REL_PATH="${ABS_FILE_PATH#"$REPO_ROOT"/}"
# If prefix stripping failed, FILE_PATH is outside the repo — nothing to lint.
case "$REL_PATH" in /*) exit 0 ;; esac

# 2. Route by directory + extension. Run with a hard timeout so a hung linter
#    never blocks the Claude session.
LINT_TIMEOUT=15
TMP_ERR=$(mktemp) || exit 0
trap 'rm -f "$TMP_ERR"' EXIT

run_lint() {
  local label="$1"; shift
  local cwd="$1"; shift
  local status
  # `timeout` is GNU-only; macOS ships without it. Fall back to direct
  # invocation when it is not on PATH so the hook stays portable.
  if command -v timeout >/dev/null 2>&1; then
    ( cd "$cwd" && timeout "$LINT_TIMEOUT" "$@" ) >"$TMP_ERR" 2>&1
    status=$?
  else
    ( cd "$cwd" && "$@" ) >"$TMP_ERR" 2>&1
    status=$?
  fi
  if [ "$status" -ne 0 ]; then
    {
      echo "✘ ${label} failed on ${REL_PATH}:"
      cat "$TMP_ERR"
      echo ""
      echo "→ Fix the issues above before continuing. (CLAUDE.md: Definition of Done = lint exits 0)"
    } >&2
    exit 2
  fi
}

# In bash `case`, `*` matches any character including `/`, so `backend/*.py`
# already covers nested files like `backend/app/main.py`.
case "$REL_PATH" in
  backend/*.py)
    # Skip silently if backend isn't bootstrapped yet.
    [ -f "$REPO_ROOT/backend/pyproject.toml" ] || exit 0
    command -v uv >/dev/null || exit 0
    PY_REL="${REL_PATH#backend/}"
    run_lint "ruff check" "$REPO_ROOT/backend" uv run ruff check "$PY_REL"
    run_lint "ruff format" "$REPO_ROOT/backend" uv run ruff format --check "$PY_REL"
    ;;

  frontend/*.ts | frontend/*.tsx | frontend/*.js | frontend/*.jsx)
    [ -f "$REPO_ROOT/frontend/package.json" ] || exit 0
    command -v pnpm >/dev/null || exit 0
    FE_REL="${REL_PATH#frontend/}"
    run_lint "eslint" "$REPO_ROOT/frontend" pnpm exec eslint "$FE_REL"
    ;;

  *)
    exit 0
    ;;
esac

exit 0
