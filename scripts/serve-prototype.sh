#!/usr/bin/env bash
# serve-prototype.sh — Serve the design/prototype directory as a static site.
#
# Usage (from project root):
#   ./scripts/serve-prototype.sh          # default port 8888
#   ./scripts/serve-prototype.sh 9000     # custom port
#
# Then open: http://localhost:8888

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROTOTYPE_DIR="$PROJECT_ROOT/design/prototype"
PORT="${1:-8888}"

echo "Serving prototype at http://localhost:${PORT}"
echo "Press Ctrl+C to stop."
cd "$PROTOTYPE_DIR" && python3 -m http.server "$PORT"
