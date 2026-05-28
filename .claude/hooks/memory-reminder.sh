#!/usr/bin/env bash
# memory-reminder.sh — Remind Claude to update the memory/ directory after task completion.
#
# Trigger:
#   Registered as a Stop hook in .claude/settings.json; fires when Claude finishes a turn.
#
# IMPORTANT — when this hook fires:
#   Automatically invoked by the Claude Code harness at the end of every Claude turn.
#   Never run manually.
#   Outputs a systemMessage JSON payload injected into the next context window.
#
# How it works:
#   Prints a JSON object with a systemMessage field reminding the agent to persist
#   any important findings to memory/ before the session closes.
echo '{"systemMessage": "任務完成 — 若有重要發現，記得更新 memory/ 目錄"}'
exit 0
