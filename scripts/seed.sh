#!/usr/bin/env bash
# seed.sh — Seed initial dev-environment data (FR-130 bootstrap contract).
#
# Usage (from project root):
#   bash scripts/seed.sh
#
# IMPORTANT — current status: NOT YET IMPLEMENTED.
#   Foundation-Core (this change) ships no domain models and no Alembic
#   migrations — there are no tables to seed data into yet. This script is a
#   placeholder referenced by `specs/foundation/000-foundation/plan.md` so the
#   bootstrap contract's file layout exists before any module needs it; it
#   intentionally does nothing beyond printing its own status. It exits 0 so
#   that once a bootstrap chain does call it, a step with nothing to do is
#   not mistaken for a failure.
#
# How it will work once a module needs seed data:
#   The first module to add domain models + Alembic migrations (e.g.
#   task-management or account) should replace this stub with logic that:
#     1. Waits for the target database to be reachable (DATABASE_URL).
#     2. Runs any pending Alembic migrations.
#     3. Inserts a minimal, idempotent set of dev-only fixture rows (e.g. one
#        admin account, one sample task config) — safe to re-run, and gated
#        so it refuses to run against ENVIRONMENT=production.
set -euo pipefail

echo "=== Label Suite — Seed Data ==="
echo "⏭  Not yet implemented: Foundation-Core has no domain models or"
echo "    migrations yet, so there is no dev data to seed. This is a stub —"
echo "    see the header comment in scripts/seed.sh for what a real"
echo "    implementation will need to do."
