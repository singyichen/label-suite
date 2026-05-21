#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/label-suite-speckit.XXXXXX")"
TMP_ROOT="$(cd "$TMP_ROOT" && pwd)"

cleanup() {
    rm -rf "$TMP_ROOT"
}
trap cleanup EXIT

assert_file() {
    local path="$1"
    if [[ ! -f "$path" ]]; then
        echo "Expected file to exist: $path" >&2
        exit 1
    fi
}

assert_contains() {
    local path="$1"
    local text="$2"
    if ! grep -Fq "$text" "$path"; then
        echo "Expected $path to contain: $text" >&2
        echo "--- $path ---" >&2
        cat "$path" >&2
        exit 1
    fi
}

make_repo() {
    local repo="$TMP_ROOT/repo"
    mkdir -p "$repo/.specify/templates" "$repo/specs/task-management/013-task-new" "$repo/specs/dataset"
    git -C "$repo" init -q
    git -C "$repo" checkout -q -b feat/task-management/013-task-new

    cat > "$repo/.specify/templates/spec-template.md" <<'SPEC'
# Feature Specification: [FEATURE NAME]
SPEC
    cat > "$repo/.specify/templates/plan-template.md" <<'PLAN'
# Implementation Plan: [FEATURE]
PLAN
    cat > "$repo/specs/task-management/013-task-new/spec.md" <<'SPEC'
# Feature Specification: Existing Task
SPEC
    cat > "$repo/specs/task-management/013-task-new/plan.md" <<'PLAN'
# Implementation Plan: Existing Task
PLAN
    cat > "$repo/specs/task-management/013-task-new/tasks.md" <<'TASKS'
# Tasks: Existing Task
TASKS
    cat > "$repo/specs/STATUS.md" <<'STATUS'
# 規格狀態索引

| ID | 功能 | 模組 | 狀態 | 分支 | 備註 |
| --- | --- | --- | --- | --- | --- |
| task-management-013 | Existing Task | task-management | `tasks-ready` | `feat/task-management/013-task-new` | seeded |

## 變更紀錄

| 日期 | 更新內容 |
|------|----------|
STATUS

    mkdir -p "$repo/scripts"
    cp -R "$ROOT/scripts/speckit" "$repo/scripts/speckit"
    echo "$repo"
}

test_prerequisites_resolve_module_feature_paths() {
    local repo
    repo="$(make_repo)"

    local output
    output="$("$repo/scripts/speckit/check-prerequisites.sh" --json --require-tasks --include-tasks)"

    [[ "$output" == *'"FEATURE_MODULE":"task-management"'* ]] || { echo "$output" >&2; exit 1; }
    [[ "$output" == *'"FEATURE_NAME":"013-task-new"'* ]] || { echo "$output" >&2; exit 1; }
    [[ "$output" == *'"FEATURE_DIR":"'"$repo"'/specs/task-management/013-task-new"'* ]] || { echo "$output" >&2; exit 1; }
    [[ "$output" == *'"tasks.md"'* ]] || { echo "$output" >&2; exit 1; }
}

test_create_feature_creates_module_branch_spec_and_status() {
    local repo
    repo="$(make_repo)"

    "$repo/scripts/speckit/create-new-feature.sh" --module dataset --short-name quality-export --json "Dataset quality export" >/tmp/create-feature.json

    assert_file "$repo/specs/dataset/001-quality-export/spec.md"
    assert_contains "$repo/specs/STATUS.md" '| dataset-001 | Dataset quality export | dataset | `spec-ready` | `feat/dataset/001-quality-export` |'
    local branch
    branch="$(git -C "$repo" symbolic-ref --short HEAD)"
    [[ "$branch" == "feat/dataset/001-quality-export" ]] || { echo "Unexpected branch: $branch" >&2; exit 1; }
}

test_setup_plan_and_status_update() {
    local repo
    repo="$(make_repo)"

    "$repo/scripts/speckit/setup-plan.sh" --json >/tmp/setup-plan.json
    assert_file "$repo/specs/task-management/013-task-new/plan.md"
    assert_contains "$repo/specs/STATUS.md" '| task-management-013 | Existing Task | task-management | `plan-ready` | `feat/task-management/013-task-new` |'

    "$repo/scripts/speckit/update-status.sh" --module task-management --feature 013-task-new --status in-progress --branch feat/task-management/013-task-new --note "implementation started"
    assert_contains "$repo/specs/STATUS.md" '| task-management-013 | Existing Task | task-management | `in-progress` | `feat/task-management/013-task-new` | implementation started |'
}

test_prerequisites_resolve_module_feature_paths
test_create_feature_creates_module_branch_spec_and_status
test_setup_plan_and_status_update

echo "speckit script tests passed"
