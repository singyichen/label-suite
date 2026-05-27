#!/usr/bin/env bash
# block-sensitive.sh — Block Claude Code tool calls that access production/staging .env files.
#
# Trigger:
#   Registered as a PreToolUse hook in .claude/settings.json for file-touching tools:
#   Read, Edit, Write, NotebookEdit, Grep, Glob, Bash.
#
# IMPORTANT — when this hook fires:
#   Automatically invoked by the Claude Code harness before every Read/Edit/Write/
#   NotebookEdit/Grep/Glob/Bash tool call. Never run manually.
#   Exit 2 = block the tool call and surface the error to Claude.
#   Exit 0 = allow the tool call to proceed.
#
# How it works:
#   Reads the JSON tool-call payload from stdin, extracts the file path or Bash
#   command, and blocks any access matching the pattern \.env\.(production|staging|prod).
set -uo pipefail

INPUT=$(cat)
TOOL_NAME=$(printf '%s\n' "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null || echo "")

SENSITIVE_PATTERN='\.env\.(production|staging|prod)'

case "$TOOL_NAME" in
  Read|Edit|Write|NotebookEdit)
    FILE_PATH=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || echo "")
    ;;
  Grep)
    FILE_PATH=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.path // empty' 2>/dev/null || echo "")
    ;;
  Glob)
    FILE_PATH=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.pattern // empty' 2>/dev/null || echo "")
    ;;
  Bash)
    COMMAND=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || echo "")
    if echo "$COMMAND" | grep -qE "$SENSITIVE_PATTERN"; then
      echo "❌ Blocked: Bash 指令引用了敏感檔案路徑" >&2
      exit 2
    fi
    exit 0
    ;;
  *)
    exit 0
    ;;
esac

if [ -n "$FILE_PATH" ] && echo "$FILE_PATH" | grep -qE "$SENSITIVE_PATTERN"; then
  echo "❌ Blocked: 禁止存取敏感檔案 '$FILE_PATH'" >&2
  exit 2
fi

exit 0
