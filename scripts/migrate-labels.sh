#!/usr/bin/env bash
set -euo pipefail

# Migrate GitHub labels from Chinese names to English names.
# Chinese names are preserved as label descriptions.
# Run once: bash scripts/migrate-labels.sh

REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null || echo "singyichen/label-suite")

echo "⚠️  This script will modify labels for repository: $REPO"
read -p "Continue? (yes/no): " confirm
if [[ "$confirm" != "yes" ]]; then
  echo "Aborted."
  exit 1
fi

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
  old="${RENAME_OLD[$i]}"
  new="${RENAME_NEW[$i]}"
  desc="${RENAME_DESC[$i]}"
  color="${RENAME_COLOR[$i]}"
  echo "  Renaming: '$old' → '$new'"
  if gh label edit "$old" --repo "$REPO" --name "$new" --description "$desc" --color "$color" 2>/dev/null; then
    continue
  fi
  # Rename failed — if the English label already exists, delete the Chinese one and update the English one
  if gh label edit "$new" --repo "$REPO" --description "$desc" --color "$color" 2>/dev/null; then
    echo "    '$new' already exists — updated description/color, deleting old '$old'"
    gh label delete "$old" --repo "$REPO" --yes 2>/dev/null || true
  else
    echo "  ❌ Failed to rename '$old' → '$new' and could not update existing '$new'"
    exit 1
  fi
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
echo "=== Phase 4: Delete stale GitHub default labels ==="

STALE_DEFAULTS=("documentation" "duplicate" "good first issue" "help wanted" "invalid" "wontfix" "Amazon Q development agent")

for name in "${STALE_DEFAULTS[@]}"; do
  if gh label delete "$name" --repo "$REPO" --yes 2>/dev/null; then
    echo "  Deleted: '$name'"
  else
    echo "  Skipped: '$name' (not found)"
  fi
done

echo ""
echo "=== Done! ==="
echo "Verify at: https://github.com/$REPO/labels"
