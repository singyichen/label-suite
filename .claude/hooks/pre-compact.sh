#!/usr/bin/env bash
# Reminds agent to persist important context before compaction.
# Exit 0 = allow compact to proceed; exit 2 = block.
echo "⚠️  Pre-compact: update any relevant entries in memory/ before context is compressed." >&2
exit 0
