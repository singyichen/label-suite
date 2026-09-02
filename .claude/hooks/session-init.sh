#!/usr/bin/env bash
# session-init.sh — Check environment prerequisites at Claude Code session start.
#
# Trigger:
#   Registered as a SessionStart hook in .claude/settings.json; fires once per session.
#
# IMPORTANT — when this hook fires:
#   Automatically invoked by the Claude Code harness when a new session begins.
#   Never run manually.
#   Outputs a systemMessage JSON payload injected into the initial context window.
#
# How it works:
#   1. Verifies that .env exists in the project root.
#   2. If claude-progress.md exists, extracts its task name and pending checklist items.
#   3. If feature_list.json exists, counts pending vs. done features.
#   4. Sets git core.hooksPath to scripts/git-hooks so the committed git hooks
#      (commit batch guard, commit message language guard) are active.
#   Emits either a pass or a warning systemMessage so Claude knows the environment
#   and in-progress task state before starting work.
set -uo pipefail

cd /Users/mandychen/mandy/project/label-suite

WARNINGS=()
CONTEXT_PARTS=()

# 1. .env check
if [ ! -f ".env" ]; then
  WARNINGS+=(".env 不存在，請執行: cp .env.example .env")
fi

# 2. claude-progress.md — extract task name and pending items
if [ -f "claude-progress.md" ]; then
  TASK_NAME=$(grep -m1 '^# Task:' claude-progress.md | sed 's/^# Task: *//' || echo "unknown")
  LAST_UPDATED=$(grep -m1 '^Last updated:' claude-progress.md | sed 's/^Last updated: *//' || echo "unknown")
  PENDING_COUNT=$(grep -c '^\- \[ \]' claude-progress.md 2>/dev/null || echo 0)
  DONE_COUNT=$(grep -c '^\- \[x\]' claude-progress.md 2>/dev/null || echo 0)
  NEXT_SECTION=$(awk '/^## Next Session/{found=1; next} found && /^##/{exit} found{print}' claude-progress.md | grep -v '^$' | head -3 | tr '\n' ' ' || echo "")

  PROGRESS_MSG="[進行中任務] ${TASK_NAME} (更新: ${LAST_UPDATED}) — ✅ ${DONE_COUNT} 完成 / ⏳ ${PENDING_COUNT} 待辦"
  if [ -n "$NEXT_SECTION" ]; then
    PROGRESS_MSG="${PROGRESS_MSG} | 下次起點: ${NEXT_SECTION}"
  fi
  CONTEXT_PARTS+=("$PROGRESS_MSG")
fi

# 3. feature_list.json — count pending vs done features
if [ -f "feature_list.json" ]; then
  if command -v python3 >/dev/null 2>&1; then
    FL_SUMMARY=$(python3 - <<'EOF'
import json, sys
try:
    with open("feature_list.json") as f:
        data = json.load(f)
    features = data.get("features", [])
    done = sum(1 for f in features if f.get("status") == "done")
    pending = sum(1 for f in features if f.get("status") == "pending")
    task = data.get("task", "unknown")
    print(f"[feature_list] {task} — {done}/{len(features)} features done, {pending} pending")
except Exception as e:
    print(f"[feature_list] 讀取失敗: {e}")
EOF
)
    CONTEXT_PARTS+=("$FL_SUMMARY")
  fi
fi

# 4. Ensure git hooks path points at the committed hooks (pre-commit, commit-msg)
if [ -d "scripts/git-hooks" ] && [ "$(git config core.hooksPath 2>/dev/null || true)" != "scripts/git-hooks" ]; then
  git config core.hooksPath scripts/git-hooks
fi

# Build and emit systemMessage — use python3 to ensure valid JSON output
emit_json() {
  python3 -c "import json, sys; print(json.dumps({'systemMessage': sys.argv[1]}))" "$1"
}

if [ ${#WARNINGS[@]} -gt 0 ]; then
  WARN_MSG=$(printf '%s；' "${WARNINGS[@]}")
  WARN_MSG="${WARN_MSG%；}"
  if [ ${#CONTEXT_PARTS[@]} -gt 0 ]; then
    CTX_MSG=$(printf '%s | ' "${CONTEXT_PARTS[@]}")
    CTX_MSG="${CTX_MSG% | }"
    emit_json "⚠️ 環境未就緒：${WARN_MSG} | ${CTX_MSG}"
  else
    emit_json "⚠️ 環境未就緒：${WARN_MSG}"
  fi
  exit 1
fi

if [ ${#CONTEXT_PARTS[@]} -gt 0 ]; then
  CTX_MSG=$(printf '%s | ' "${CONTEXT_PARTS[@]}")
  CTX_MSG="${CTX_MSG% | }"
  emit_json "✓ 環境檢查通過 | ${CTX_MSG}"
else
  emit_json "✓ 環境檢查通過"
fi
exit 0
