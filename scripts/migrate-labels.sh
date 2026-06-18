#!/usr/bin/env bash
set -euo pipefail

# Migrate GitHub labels from Chinese names to English names.
# Chinese names are preserved as label descriptions.
# Run once: bash scripts/migrate-labels.sh

REPO="singyichen/label-suite"

echo "=== Phase 1: Rename existing Chinese labels to English ==="

declare -A RENAME_MAP=(
  ["錯誤回報"]="bug"
  ["功能新增"]="feature"
  ["功能修改"]="enhancement"
  ["任務追蹤"]="task"
  ["樣式調整"]="ui"
  ["技術調研"]="spike"
  ["文件需求/修正"]="docs"
  ["提問"]="question"
  ["線上事故"]="incident"
)

declare -A RENAME_DESC=(
  ["錯誤回報"]="錯誤回報 — Bug reports and unexpected behavior"
  ["功能新增"]="功能新增 — New feature requests"
  ["功能修改"]="功能修改 — Changes to existing features"
  ["任務追蹤"]="任務追蹤 — Trackable tasks and to-dos"
  ["樣式調整"]="樣式調整 — UI and styling adjustments"
  ["技術調研"]="技術調研 — Research spikes and PoC"
  ["文件需求/修正"]="文件需求/修正 — Documentation additions or fixes"
  ["提問"]="提問 — Support questions and help requests"
  ["線上事故"]="線上事故 — Production incidents and outages"
)

declare -A RENAME_COLOR=(
  ["錯誤回報"]="d73a4a"
  ["功能新增"]="0e8a16"
  ["功能修改"]="1d76db"
  ["任務追蹤"]="5319e7"
  ["樣式調整"]="f9d0c4"
  ["技術調研"]="d4c5f9"
  ["文件需求/修正"]="0075ca"
  ["提問"]="d876e3"
  ["線上事故"]="b60205"
)

for chinese_name in "${!RENAME_MAP[@]}"; do
  english_name="${RENAME_MAP[$chinese_name]}"
  description="${RENAME_DESC[$chinese_name]}"
  color="${RENAME_COLOR[$chinese_name]}"
  echo "  Renaming: '$chinese_name' → '$english_name'"
  gh label edit "$chinese_name" \
    --repo "$REPO" \
    --name "$english_name" \
    --description "$description" \
    --color "$color" \
    || echo "  ⚠️  Failed to rename '$chinese_name' (may not exist or already renamed)"
done

echo ""
echo "=== Phase 2: Create new type labels ==="

declare -A NEW_TYPE_LABELS=(
  ["refactor"]="重構 — Code restructuring without behavior change"
  ["performance"]="效能優化 — Performance improvements"
  ["test"]="測試 — Test additions or changes"
  ["ci-cd"]="CI/CD — Pipeline and deployment changes"
)

declare -A NEW_TYPE_COLORS=(
  ["refactor"]="fbca04"
  ["performance"]="ff7619"
  ["test"]="bfd4f2"
  ["ci-cd"]="e4e669"
)

for name in "${!NEW_TYPE_LABELS[@]}"; do
  description="${NEW_TYPE_LABELS[$name]}"
  color="${NEW_TYPE_COLORS[$name]}"
  echo "  Creating: '$name'"
  gh label create "$name" \
    --repo "$REPO" \
    --description "$description" \
    --color "$color" \
    || echo "  ⚠️  '$name' may already exist"
done

echo ""
echo "=== Phase 3: Create new scope labels ==="

declare -A NEW_SCOPE_LABELS=(
  ["scope:frontend"]="前端 — Changes in frontend/"
  ["scope:backend"]="後端 — Changes in backend/"
  ["scope:e2e"]="E2E 測試 — Changes in e2e/"
  ["scope:infra"]="基礎建設 — CI/CD, Docker, scripts, config"
)

SCOPE_COLOR="c5def5"

for name in "${!NEW_SCOPE_LABELS[@]}"; do
  description="${NEW_SCOPE_LABELS[$name]}"
  echo "  Creating: '$name'"
  gh label create "$name" \
    --repo "$REPO" \
    --description "$description" \
    --color "$SCOPE_COLOR" \
    || echo "  ⚠️  '$name' may already exist"
done

echo ""
echo "=== Done! ==="
echo "Verify at: https://github.com/$REPO/labels"
