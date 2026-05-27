#!/usr/bin/env bash
# pre-compact.sh — Warn Claude to persist context entries before conversation compaction.
#
# Trigger:
#   Registered as a PreCompact hook in .claude/settings.json; fires before /compact.
#
# IMPORTANT — when this hook fires:
#   Automatically invoked by the Claude Code harness just before context compaction.
#   Never run manually.
#   Exit 0 = allow compaction to proceed; exit 2 = block compaction.
#
# How it works:
#   Writes a warning to stderr reminding the agent to update relevant memory/ entries
#   before the context window is compressed and prior messages are summarised.
echo "⚠️  Pre-compact: update any relevant entries in memory/ before context is compressed." >&2
exit 0
