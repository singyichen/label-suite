#!/usr/bin/env bash
# audit-log.sh — Append every tool invocation to .claude/audit.log for post-incident analysis.
#
# Trigger:
#   Registered as a PostToolUse hook in .claude/settings.json; fires after every tool call.
#
# IMPORTANT — when this hook fires:
#   Automatically invoked by the Claude Code harness after each tool completes.
#   Never run manually.
#   Appends one line per invocation to .claude/audit.log (gitignored, local only).
#   Always exits 0 — logging must never block tool execution.
#
# Log format (tab-separated):
#   <ISO-8601 timestamp> TAB <tool_name> TAB <key argument>
set -uo pipefail

LOG_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/.claude/audit.log"

INPUT=$(cat)

if command -v jq &>/dev/null; then
  TOOL_NAME=$(printf '%s\n' "$INPUT" | jq -r '.tool_name // "unknown"' 2>/dev/null || echo "unknown")
  # Extract the most meaningful parameter per tool type
  case "$TOOL_NAME" in
    Bash)
      ARG=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null | cut -c1-120)
      ;;
    Read|Write|Edit|NotebookEdit)
      ARG=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.file_path // ""' 2>/dev/null)
      ;;
    Grep)
      PATTERN=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.pattern // ""' 2>/dev/null)
      PATH_ARG=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.path // ""' 2>/dev/null)
      ARG="${PATTERN} in ${PATH_ARG}"
      ;;
    Glob)
      ARG=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.pattern // ""' 2>/dev/null)
      ;;
    Agent)
      ARG=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.description // ""' 2>/dev/null | cut -c1-80)
      ;;
    *)
      ARG=$(printf '%s\n' "$INPUT" | jq -r '.tool_input | to_entries | .[0] | "\(.key)=\(.value)"' 2>/dev/null | cut -c1-80 || echo "")
      ;;
  esac
else
  TOOL_NAME=$(printf '%s\n' "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('tool_name','unknown'))" 2>/dev/null || echo "unknown")
  ARG=""
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%SZ")

# Ensure log directory exists (it should, but be defensive)
mkdir -p "$(dirname "$LOG_FILE")"

printf '%s\t%s\t%s\n' "$TIMESTAMP" "$TOOL_NAME" "${ARG:-}" >> "$LOG_FILE"

# Rotation: keep only the last 2000 lines when file exceeds 5000 lines.
# Runs after append so the newest entry is always preserved.
MAX_LINES=5000
KEEP_LINES=2000
if [ -f "$LOG_FILE" ]; then
  LINE_COUNT=$(wc -l < "$LOG_FILE" 2>/dev/null || echo 0)
  if [ "$LINE_COUNT" -gt "$MAX_LINES" ]; then
    TMP="${LOG_FILE}.tmp"
    tail -n "$KEEP_LINES" "$LOG_FILE" > "$TMP" && mv "$TMP" "$LOG_FILE"
  fi
fi

exit 0
