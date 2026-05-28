#!/usr/bin/env bash
# block-sensitive.sh — Block Claude Code tool calls that access sensitive files or paths.
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
# What is blocked:
#   - Production/staging .env files (write-anywhere, read-anywhere)
#   - TLS/SSL certificate and private key files (.pem, .key, .p12, .pfx)
#   - SSH private key files (id_rsa, id_ed25519, id_ecdsa, id_dsa)
#   - Cloud credential files (credentials.json, service-account*.json)
#   - System secret directories: ~/.ssh/, ~/.aws/, ~/.gnupg/
set -uo pipefail

INPUT=$(cat)
TOOL_NAME=$(printf '%s\n' "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null || echo "")

# Patterns that block reads AND writes via file-operation tools (Read/Write/Edit/Grep/Glob)
FULL_BLOCK_PATTERN='\.env\.(production|staging|prod)(\.local)?$|\.pem$|\.p12$|\.pfx$|/(\.ssh|\.aws|\.gnupg)/'

# Patterns that block writes only via file-operation tools (Write/Edit)
WRITE_BLOCK_PATTERN='\.key$|id_rsa$|id_ed25519$|id_ecdsa$|id_dsa$|credentials\.json$|service-account.*\.json$'

check_path() {
  local file_path="$1"
  local allow_read="${2:-false}"
  [ -z "$file_path" ] && return 0

  if echo "$file_path" | grep -qE "$FULL_BLOCK_PATTERN"; then
    echo "❌ Blocked: 禁止存取敏感檔案或目錄 '$file_path'" >&2
    exit 2
  fi

  if [ "$allow_read" = "false" ] && echo "$file_path" | grep -qE "$WRITE_BLOCK_PATTERN"; then
    echo "❌ Blocked: 禁止寫入憑證或金鑰檔案 '$file_path'" >&2
    exit 2
  fi
}

case "$TOOL_NAME" in
  Write|Edit|NotebookEdit)
    FILE_PATH=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || echo "")
    check_path "$FILE_PATH" "false"
    ;;
  Read)
    FILE_PATH=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || echo "")
    check_path "$FILE_PATH" "true"
    ;;
  Grep)
    FILE_PATH=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.path // empty' 2>/dev/null || echo "")
    check_path "$FILE_PATH" "true"
    ;;
  Glob)
    FILE_PATH=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.pattern // empty' 2>/dev/null || echo "")
    check_path "$FILE_PATH" "true"
    ;;
  *)
    exit 0
    ;;
esac

exit 0
