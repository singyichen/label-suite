#!/usr/bin/env bash
# session-init.sh — Check environment prerequisites at Claude Code session start.
#
# Trigger:
#   Registered as a SessionStart hook in .claude/settings.json; fires once per session.
#
# IMPORTANT — when this hook fires:
#   Automatically invoked by the Claude Code harness when a new session begins.
#   Never run manually.
#   Outputs a systemMessage JSON payload injected into the initial context window.
#
# How it works:
#   Verifies that .env exists in the project root. Collects warnings for missing
#   prerequisites and emits either a pass or a warning systemMessage so Claude
#   knows the environment state before starting work.
set -uo pipefail

cd /Users/mandychen/mandy/project/label-suite

WARNINGS=()

if [ ! -f ".env" ]; then
  WARNINGS+=(".env 不存在，請執行: cp .env.example .env")
fi

if [ ${#WARNINGS[@]} -gt 0 ]; then
  MSG=$(printf '%s；' "${WARNINGS[@]}")
  printf '{"systemMessage": "⚠️ 環境未就緒：%s"}\n' "${MSG%；}"
  exit 1
fi

echo '{"systemMessage": "✓ 環境檢查通過"}'
exit 0
