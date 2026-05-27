#!/usr/bin/env bash
# Environment bootstrap for new contributors.
# Run once after cloning: bash scripts/init.sh
set -euo pipefail

echo "=== Label Suite — Environment Setup ==="

# 1. .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created .env from .env.example — update values before running"
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
