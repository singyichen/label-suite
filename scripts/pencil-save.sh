#!/usr/bin/env bash
# pencil-save.sh — Save the active Pencil document to a project path.
#
# Usage:
#   ./scripts/pencil-save.sh pencil/design-system.pen
#   ./scripts/pencil-save.sh pencil/pages/dashboard.pen
#
# IMPORTANT — when to use this script:
#   ✅ Use for NEW documents (open_document("new") → batch_design → pencil-save.sh)
#   ❌ Do NOT use after batch_design(filePath=existingFile):
#      batch_design with filePath writes directly to the .pen file on disk.
#      Running pencil-save.sh afterwards will OVERWRITE those changes with the
#      old workspace cache version.
#
# How it works:
#   Pencil auto-syncs the active document to a workspace storage cache file.
#   This script finds the most recently modified cache file across all
#   Windsurf/Cursor workspace storages and copies it to the target path.
#   No Cmd+S required.

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <target-path>  (relative to project root, e.g. pencil/design-system.pen)" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET="$PROJECT_ROOT/$1"

# --- find the most recently modified Pencil workspace cache ------------------
PENCIL_SOURCE=""

for BASE_DIR in \
  "$HOME/Library/Application Support/Windsurf/User/workspaceStorage" \
  "$HOME/Library/Application Support/Cursor/User/workspaceStorage"; do
  [ -d "$BASE_DIR" ] || continue

  # Use stat to get mtime, sort numerically descending, pick the newest
  CANDIDATE=$(
    find "$BASE_DIR" -path "*/highagency.pencildev/*" -type f ! -name "*.json" \
      -print0 2>/dev/null \
    | xargs -0 stat -f "%m %N" 2>/dev/null \
    | sort -rn \
    | head -1 \
    | cut -d' ' -f2-
  )
  if [ -n "$CANDIDATE" ]; then
    PENCIL_SOURCE="$CANDIDATE"
    break
  fi
done

if [ -z "$PENCIL_SOURCE" ]; then
  echo "❌  Cannot find Pencil workspace cache. Make sure a .pen file is open in the editor." >&2
  exit 1
fi

# --- validate it looks like a .pen file --------------------------------------
if ! head -c 30 "$PENCIL_SOURCE" 2>/dev/null | grep -q '"version"'; then
  echo "❌  Cache file does not look like a .pen document: $PENCIL_SOURCE" >&2
  exit 1
fi

# --- copy --------------------------------------------------------------------
mkdir -p "$(dirname "$TARGET")"
cp "$PENCIL_SOURCE" "$TARGET"

BYTES=$(wc -c < "$PENCIL_SOURCE" | tr -d ' ')
echo "✅  Saved: $TARGET"
echo "    Source: $PENCIL_SOURCE (${BYTES} bytes)"
