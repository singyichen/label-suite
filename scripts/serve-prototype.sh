#!/usr/bin/env bash
# serve-prototype.sh — Serve the design/prototype directory as a local static site.
#
# Usage (from project root):
#   ./scripts/serve-prototype.sh          # default port 8888
#   ./scripts/serve-prototype.sh 9000     # custom port
#
# IMPORTANT — when to use this script:
#   Use during design review to browse prototype HTML pages in a browser at
#   http://localhost:<port>. Do not use in CI or as a production server — this
#   is a local developer preview only.
#
# How it works:
#   Delegates to design/prototype/tests/serve.mjs — the same zero-dependency
#   Node server Playwright starts for the test suite — so preview and tests
#   can never drift apart (and a leftover preview server reused by Playwright
#   via reuseExistingServer is the same implementation either way).
#   Press Ctrl+C to stop.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PORT="${1:-8888}"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js not found. Install Node 20+ and try again." >&2
  exit 1
fi

echo "Serving prototype at http://127.0.0.1:${PORT}"
echo "Press Ctrl+C to stop."

exec node "$PROJECT_ROOT/design/prototype/tests/serve.mjs" "$PORT"
