#!/usr/bin/env bash
# verify-bootstrap.sh — One-command proof that a clean checkout can boot.
#
# Usage (from anywhere; the script relocates to the project root):
#   bash scripts/verify-bootstrap.sh
#
# What it proves (foundation spec FR-130 / SC-045):
#   1. The bootstrap contract's files exist — .env.example, docker-compose.yml,
#      scripts/seed.sh.
#   2. The backend actually starts and answers GET /api/v1/health with 200.
#      File-presence checks alone cannot catch a broken app factory, a missing
#      ASGI server, or a settings model that rejects its own documented
#      defaults; only starting the process can.
#
# Zero prerequisites beyond uv: no database and no containers are needed.
# Settings.database_url (backend/app/core/config.py) defaults to a local SQLite
# file and the health route touches no database, so this runs on a checkout
# where `docker` is not even installed.
#
# ALLOWED_ORIGINS is exported below rather than read from .env because it is
# the one setting with no default — Settings requires it and fails startup
# validation without it (FR-022 fail-fast). Hardcoding the same localhost pair
# .env.example documents keeps this script self-contained, so a contributor who
# has not yet run scripts/init.sh still gets a meaningful answer.
#
# Environment overrides:
#   VERIFY_BOOTSTRAP_PORT   Port to bind (default 8765).
#   VERIFY_BOOTSTRAP_TIMEOUT Seconds to wait for the server (default 30).
set -euo pipefail

cd "$(dirname "$0")/.."

PORT="${VERIFY_BOOTSTRAP_PORT:-8765}"
TIMEOUT="${VERIFY_BOOTSTRAP_TIMEOUT:-30}"
LOG_FILE="$(mktemp -t verify-bootstrap-uvicorn)"
SERVER_PID=""

# Kills the whole process group, not just $SERVER_PID. `uv run` spawns uvicorn
# as a child rather than exec'ing it, so signalling the pid we know about
# leaves the server orphaned and still holding the port — verified by an
# lsof check that found a listener after a plain `kill`. `set -m` below puts
# the background job in its own process group so the negative pid is safe:
# it can only reach the server and its children, never this script.
cleanup() {
  if [ -n "$SERVER_PID" ]; then
    kill -TERM -- "-$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -f "$LOG_FILE"
}
trap cleanup EXIT

fail() {
  echo "❌ $1" >&2
  exit 1
}

echo "=== Label Suite — Bootstrap Verification ==="

# 1. Bootstrap contract files (SC-045)
for required in .env.example docker-compose.yml scripts/seed.sh; do
  [ -f "$required" ] || fail "Missing bootstrap contract file: $required"
done
echo "✅ Bootstrap files present: .env.example, docker-compose.yml, scripts/seed.sh"

# 2. Toolchain
command -v uv >/dev/null 2>&1 ||
  fail "uv not found. Install: curl -LsSf https://astral.sh/uv/install.sh | sh"
command -v curl >/dev/null 2>&1 || fail "curl not found — required to probe the health endpoint."
echo "✅ uv $(uv --version)"

# 3. Port availability. Checked up front so that "server never answered" below
#    always means the server failed, never that we probed someone else's.
#    The brace group (not a subshell) is deliberate: `(exec 3<>...)` lets bash
#    elide the fork and exit the whole script on a successful connect, which
#    silently skipped the message below. The braces also scope 2>/dev/null over
#    bash's own "connection refused" notice, which a redirect-only suppression
#    still prints.
if { : <"/dev/tcp/127.0.0.1/$PORT"; } 2>/dev/null; then
  fail "Port $PORT is already in use. Re-run with VERIFY_BOOTSTRAP_PORT=<free port>."
fi

# 4. Start the backend.
#    `app.main:create_app --factory` is the only supported form: app/main.py
#    deliberately exports a factory and no module-level `app` object, so the
#    shorter `app.main:app` does not exist.
echo "→ Starting backend on 127.0.0.1:$PORT ..."
set -m  # own process group for the job below — see cleanup()
(
  cd backend
  ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000" \
    exec uv run uvicorn app.main:create_app --factory --host 127.0.0.1 --port "$PORT"
) >"$LOG_FILE" 2>&1 &
SERVER_PID=$!
set +m

# 5. Poll until the health endpoint answers, the server dies, or we time out.
HEALTH_URL="http://127.0.0.1:$PORT/api/v1/health"
BODY=""
for _ in $(seq 1 "$TIMEOUT"); do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "--- uvicorn output ---" >&2
    cat "$LOG_FILE" >&2
    fail "Backend exited before serving a request."
  fi
  if BODY="$(curl -fsS --max-time 2 "$HEALTH_URL" 2>/dev/null)"; then
    break
  fi
  BODY=""
  sleep 1
done

if [ -z "$BODY" ]; then
  echo "--- uvicorn output ---" >&2
  cat "$LOG_FILE" >&2
  fail "GET $HEALTH_URL did not respond within ${TIMEOUT}s."
fi

# 6. A 200 with the wrong body is still a broken bootstrap.
case "$BODY" in
  *'"status":"ok"'*) ;;
  *) fail "GET $HEALTH_URL returned an unexpected body: $BODY" ;;
esac

echo "✅ GET /api/v1/health → $BODY"
echo ""
echo "=== PASS — this checkout can boot ==="
