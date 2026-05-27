#!/usr/bin/env bash
# worktree-init.sh — Create a new git worktree for parallel feature development.
#
# Usage (from project root):
#   ./scripts/worktree-init.sh <branch-type>/<feature-name>
#   ./scripts/worktree-init.sh feat/search-module
#   ./scripts/worktree-init.sh fix/score-calculation
#
# IMPORTANT — when to use this script:
#   Use when starting a new feature that should run in parallel with other work, or
#   when isolating a sub-agent to a separate workspace. Each worktree gets its own
#   Claude session history and independent MEMORY.md namespace. Do NOT use for
#   sequential, single-track work — a plain branch is sufficient in that case.
#
# How it works:
#   Creates a new git worktree at ../label-suite-<feature-name> on a new branch.
#   Copies the project .env if it exists (worktrees don't inherit .env automatically).
#   Prints the path and the cd command so you can switch to it immediately.
#   Branch name is taken directly from the argument (e.g. feat/search-module).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ $# -eq 0 ]; then
  echo "Usage: $0 <branch-type>/<feature-name>" >&2
  echo "  e.g: $0 feat/search-module" >&2
  echo "  e.g: $0 fix/score-calculation" >&2
  exit 1
fi

BRANCH="$1"

# Derive a safe directory name: replace / with -
FEATURE_SLUG="${BRANCH//\//-}"
WORKTREE_DIR="$(cd "$PROJECT_ROOT/.." && pwd)/label-suite-${FEATURE_SLUG}"

# Safety: abort if worktree directory already exists
if [ -d "$WORKTREE_DIR" ]; then
  echo "❌ Directory already exists: $WORKTREE_DIR" >&2
  echo "   Remove it first or choose a different branch name." >&2
  exit 1
fi

# Safety: abort if branch already exists
if git -C "$PROJECT_ROOT" show-ref --verify --quiet "refs/heads/$BRANCH" 2>/dev/null; then
  echo "❌ Branch '$BRANCH' already exists. Use a different name or delete the branch first." >&2
  exit 1
fi

echo "→ Creating worktree: $WORKTREE_DIR"
echo "  Branch: $BRANCH"
git -C "$PROJECT_ROOT" worktree add -b "$BRANCH" "$WORKTREE_DIR"

# Copy .env so the new worktree has environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
  cp "$PROJECT_ROOT/.env" "$WORKTREE_DIR/.env"
  echo "✅ Copied .env to worktree"
else
  echo "⚠️  No .env found in project root — worktree will start without it"
fi

echo ""
echo "✅ Worktree ready."
echo ""
echo "  Path:   $WORKTREE_DIR"
echo "  Branch: $BRANCH"
echo ""
echo "  Switch to it:"
echo "    cd $WORKTREE_DIR"
echo ""
echo "  List all worktrees:"
echo "    git worktree list"
echo ""
echo "  Remove when done:"
echo "    git worktree remove $WORKTREE_DIR"
echo "    git branch -d $BRANCH"
