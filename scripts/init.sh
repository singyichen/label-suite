#!/usr/bin/env bash
# init.sh — Bootstrap the Label Suite development environment for new contributors.
#
# Usage (from project root):
#   bash scripts/init.sh
#
# IMPORTANT — when to use this script:
#   Run once after cloning the repository. Safe to re-run — it skips steps that
#   are already complete (existing .env, installed deps). Do NOT use as a daily
#   dev startup command; use 'uv run uvicorn ...' / 'pnpm dev' directly instead.
#
# How it works:
#   Copies .env.example → .env if .env is absent, verifies uv and pnpm are
#   installed, then runs 'uv sync' in backend/ and 'pnpm install' in frontend/
#   if the respective package manifests exist.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== Label Suite — Environment Setup ==="

# 1. .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠️  Created .env from .env.example — REVIEW AND UPDATE all values (SECRET_KEY, DATABASE_URL, etc.) before running" >&2
else
  echo "✅ .env already exists"
fi

# 2. uv (backend package manager)
if ! command -v uv &>/dev/null; then
  echo "❌ uv not found. Install: curl -LsSf https://astral.sh/uv/install.sh | sh"
  exit 1
fi
echo "✅ uv $(uv --version)"

# 3. pnpm (frontend package manager)
if ! command -v pnpm &>/dev/null; then
  echo "❌ pnpm not found. Install: npm install -g pnpm"
  exit 1
fi
echo "✅ pnpm $(pnpm --version)"

# 4. Backend deps
if [ -f backend/pyproject.toml ]; then
  echo "→ Installing backend deps..."
  (cd backend && uv sync)
  echo "✅ Backend deps installed"
else
  echo "⏭  backend/ not yet initialized — skipping"
fi

# 5. Frontend deps
if [ -f frontend/package.json ]; then
  echo "→ Installing frontend deps..."
  (cd frontend && pnpm install)
  echo "✅ Frontend deps installed"
else
  echo "⏭  frontend/ not yet initialized — skipping"
fi

echo ""
echo "=== Setup complete ==="
echo "  Backend:  cd backend && uv run uvicorn app.main:app --reload"
echo "  Frontend: cd frontend && pnpm dev"
