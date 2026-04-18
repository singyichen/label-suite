#!/usr/bin/env bash
# serve-prototype.sh - Serve the design/prototype directory as a static site.
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

detect_python_command() {
  if command -v python3 >/dev/null 2>&1; then
    echo "python3"
    return 0
  fi

  if command -v python >/dev/null 2>&1; then
    echo "python"
    return 0
  fi

  if command -v py >/dev/null 2>&1; then
    echo "py"
    return 0
  fi

  return 1
}

PYTHON_CMD="$(detect_python_command || true)"

if [[ -z "$PYTHON_CMD" ]]; then
  echo "Error: Python not found. Install python3/python/py and try again." >&2
  exit 1
fi

echo "Serving prototype at http://localhost:${PORT}"
echo "Using Python launcher: ${PYTHON_CMD}"
echo "Press Ctrl+C to stop."

cd "$PROTOTYPE_DIR"

if [[ "$PYTHON_CMD" == "py" ]]; then
  exec py -3 -m http.server "$PORT"
else
  exec "$PYTHON_CMD" -m http.server "$PORT"
fi
