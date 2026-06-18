#!/usr/bin/env bash
set -euo pipefail

# Migrate GitHub labels from Chinese names to English names.
# Chinese names are preserved as label descriptions.
# Run once: bash scripts/migrate-labels.sh

REPO="singyichen/label-suite"

echo "=== Phase 1: Rename existing Chinese labels to English ==="

RENAME_OLD=(
  "錯誤回報"
  "功能新增"
  "功能修改"
  "任務追蹤"
  "樣式調整"
  "技術調研"
  "文件需求/修正"
  "提問"
  "線上事故"
)
RENAME_NEW=(
  "bug"
  "feature"
  "enhancement"
  "task"
  "ui"
  "spike"
  "docs"
  "question"
  "incident"
)
RENAME_DESC=(
  "錯誤回報 — Bug reports and unexpected behavior"
  "功能新增 — New feature requests"
  "功能修改 — Changes to existing features"
  "任務追蹤 — Trackable tasks and to-dos"
  "樣式調整 — UI and styling adjustments"
  "技術調研 — Research spikes and PoC"
  "文件需求/修正 — Documentation additions or fixes"
  "提問 — Support questions and help requests"
  "線上事故 — Production incidents and outages"
)
RENAME_COLOR=(
  "d73a4a"
  "0e8a16"
  "1d76db"
  "5319e7"
  "f9d0c4"
  "d4c5f9"
  "0075ca"
  "d876e3"
  "b60205"
)

for i in "${!RENAME_OLD[@]}"; do
  echo "  Renaming: '${RENAME_OLD[$i]}' → '${RENAME_NEW[$i]}'"
  gh label edit "${RENAME_OLD[$i]}" \
    --repo "$REPO" \
    --name "${RENAME_NEW[$i]}" \
    --description "${RENAME_DESC[$i]}" \
    --color "${RENAME_COLOR[$i]}" \
    || echo "  ⚠️  Failed to rename '${RENAME_OLD[$i]}' (may not exist or already renamed)"
done

echo ""
echo "=== Phase 2: Create new type labels ==="

TYPE_NAMES=("refactor"   "performance"  "test"                      "ci-cd")
TYPE_DESCS=("重構 — Code restructuring without behavior change" "效能優化 — Performance improvements" "測試 — Test additions or changes" "CI/CD — Pipeline and deployment changes")
TYPE_COLORS=("fbca04"    "ff7619"       "bfd4f2"                    "e4e669")

for i in "${!TYPE_NAMES[@]}"; do
  echo "  Creating: '${TYPE_NAMES[$i]}'"
  gh label create "${TYPE_NAMES[$i]}" \
    --repo "$REPO" \
    --description "${TYPE_DESCS[$i]}" \
    --color "${TYPE_COLORS[$i]}" \
    || echo "  ⚠️  '${TYPE_NAMES[$i]}' may already exist"
done

echo ""
echo "=== Phase 3: Create new scope labels ==="

SCOPE_NAMES=("scope:frontend" "scope:backend" "scope:e2e"             "scope:infra")
SCOPE_DESCS=("前端 — Changes in frontend/" "後端 — Changes in backend/" "E2E 測試 — Changes in e2e/" "基礎建設 — CI/CD, Docker, scripts, config")
SCOPE_COLOR="c5def5"

for i in "${!SCOPE_NAMES[@]}"; do
  echo "  Creating: '${SCOPE_NAMES[$i]}'"
  gh label create "${SCOPE_NAMES[$i]}" \
    --repo "$REPO" \
    --description "${SCOPE_DESCS[$i]}" \
    --color "$SCOPE_COLOR" \
    || echo "  ⚠️  '${SCOPE_NAMES[$i]}' may already exist"
done

echo ""
echo "=== Done! ==="
echo "Verify at: https://github.com/$REPO/labels"
