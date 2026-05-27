#!/usr/bin/env bash
# speckit-tests.sh — Run local regression tests for Label Suite speckit helper scripts.
#
# Usage:
#   ./scripts/speckit-tests.sh
#   bash scripts/speckit-tests.sh
#
# IMPORTANT — when to use this script:
#   Use after changing scripts/speckit/*, scripts/check-spec-artifacts.sh, or
#   CI rules that enforce the spec/prototype harness.
#   It builds temporary git repositories under TMPDIR and validates feature
#   branch resolution, spec creation, STATUS.md updates, artifact sync checks,
#   and prototype CI package-manager rules.
#
# How it works:
#   Each test creates an isolated throwaway repo with minimal .specify templates,
#   specs, STATUS.md, and prototype test folders. The script copies the current
#   helper scripts into that repo, runs real git/shell commands, and removes the
#   temporary files on exit.

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
    local repo
    repo="$(mktemp -d "$TMP_ROOT/repo.XXXXXX")"
    mkdir -p "$repo/.specify/templates" "$repo/specs/task-management/013-task-new" "$repo/specs/dataset" "$repo/design/prototype/tests/task-management"
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
    cat > "$repo/design/prototype/tests/task-management/task-new.spec.ts" <<'TEST'
import { test } from '@playwright/test'
test('placeholder', async () => {})
TEST
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
    cp "$ROOT/scripts/check-spec-artifacts.sh" "$repo/scripts/check-spec-artifacts.sh"
    git -C "$repo" add .
    git -C "$repo" -c user.email="speckit-test@example.com" -c user.name="Speckit Test" commit -q -m "seed test repo"
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

test_check_spec_artifacts_passes_for_synced_repo() {
    local repo
    repo="$(make_repo)"

    "$repo/scripts/check-spec-artifacts.sh" "$repo"
}

test_check_spec_artifacts_fails_for_untracked_spec() {
    local repo
    repo="$(make_repo)"

    mkdir -p "$repo/specs/dataset/001-quality-export"
    cat > "$repo/specs/dataset/001-quality-export/spec.md" <<'SPEC'
# Feature Specification: Dataset quality export
SPEC

    if "$repo/scripts/check-spec-artifacts.sh" "$repo" >/tmp/check-spec-artifacts.out 2>/tmp/check-spec-artifacts.err; then
        echo "Expected check-spec-artifacts.sh to fail for untracked spec" >&2
        exit 1
    fi
    assert_contains /tmp/check-spec-artifacts.err "Missing STATUS.md row for spec: dataset/001-quality-export"
}

test_ci_uses_pnpm_for_prototype_jobs() {
    local ci="$ROOT/.github/workflows/ci.yml"

    assert_contains "$ci" "scripts/check-spec-artifacts.sh"
    assert_contains "$ci" "pnpm/action-setup"
    assert_contains "$ci" "pnpm install --frozen-lockfile"
    assert_contains "$ci" "pnpm test"
    if grep -Eq 'run: npm (ci|test|run)' "$ci"; then
        echo "Prototype CI must use pnpm, not npm" >&2
        exit 1
    fi
}

test_prerequisites_resolve_module_feature_paths
test_create_feature_creates_module_branch_spec_and_status
test_setup_plan_and_status_update
test_check_spec_artifacts_passes_for_synced_repo
test_check_spec_artifacts_fails_for_untracked_spec
test_ci_uses_pnpm_for_prototype_jobs

echo "speckit script tests passed"
