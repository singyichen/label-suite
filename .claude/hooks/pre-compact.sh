#!/usr/bin/env bash
# pre-compact.sh — PreCompact hook placeholder (allows compaction).
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
#   Currently a no-op that allows compaction. The Generator-phase /clear rule lives in
#   CLAUDE.md § Context management; the repo has no memory/ directory to remind about.
exit 0
