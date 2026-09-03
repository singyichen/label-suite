#!/usr/bin/env bash
# prototype-diagram-diff-reminder.sh — Remind Claude to produce a before/after
# diff Artifact after editing prototype or diagram HTML files.
#
# Trigger:
#   Registered as a PostToolUse hook in .claude/settings.json with matcher
#   "Edit|Write|NotebookEdit". Fires after every successful edit.
#
# IMPORTANT — when this hook fires:
#   - Reads the edited file path from the tool event JSON on stdin.
#   - Only reacts to *.html anywhere under design/prototype/ or specs/ (any
#     depth — a `case` glob's `*` matches `/` too, so nested pages/modules,
#     and diagram HTML under any specs/[module]/NNN-feature/, are covered).
#   - Injects additionalContext telling Claude to invoke the
#     prototype-diagram-diff skill; never blocks the edit itself.
#
# Exit codes: always 0 (reminder-only, never blocks).
set -uo pipefail

INPUT=$(cat)

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
ABS_FILE_PATH=$(cd "$(dirname "$FILE_PATH")" 2>/dev/null && pwd -P)/$(basename "$FILE_PATH") || exit 0
REL_PATH="${ABS_FILE_PATH#"$REPO_ROOT"/}"
case "$REL_PATH" in /*) exit 0 ;; esac

case "$REL_PATH" in
  design/prototype/*.html | specs/*.html)
    ;;
  *)
    exit 0
    ;;
esac

jq -n --arg f "$REL_PATH" '{
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: ("你剛編輯了 " + $f + "。依專案規則，請呼叫 prototype-diagram-diff skill，用 Artifact 產出這次調整前後的程式碼／結構 diff 對照與詳細說明，再繼續其他工作。")
  }
}'
exit 0
