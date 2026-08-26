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

make_sdd_repo() {
    local repo
    repo="$(mktemp -d "$TMP_ROOT/sdd-repo.XXXXXX")"

    mkdir -p \
        "$repo/.claude/agents" \
        "$repo/docs" \
        "$repo/openspec/changes/project-sdd-lint/specs/foundation/001-project-sdd-lint" \
        "$repo/openspec" \
        "$repo/scripts" \
        "$repo/specs/dataset/001-legacy" \
        "$repo/specs/foundation/001-project-sdd-lint"

    cat > "$repo/.claude/agents/senior-qa.md" <<'AGENT'
# Senior QA

## Owns

- `scripts/*-tests.sh`
AGENT
    cat > "$repo/.claude/agents/senior-devops.md" <<'AGENT'
# Senior DevOps

## Must Not Touch

- `scripts/*-tests.sh`

## Owns

- production `scripts/`
AGENT
    cat > "$repo/AGENTS.md" <<'GUIDANCE'
# Fixture guidance

Use pnpm test for prototype checks.
GUIDANCE
    cat > "$repo/CLAUDE.md" <<'GUIDANCE'
# Fixture guidance

Use pnpm run lint for frontend checks.
GUIDANCE
    cat > "$repo/docs/sdd-workflow.md" <<'GUIDANCE'
# Fixture SDD workflow
GUIDANCE
    cat > "$repo/openspec/config.yaml" <<'CONFIG'
schema: specification
CONFIG
    cat > "$repo/specs/foundation/001-project-sdd-lint/spec.md" <<'SPEC'
# Project SDD lint

## 功能目標

Provide an offline governance check.

## 規格相依性

None.

### FR-001
### FR-002
### FR-003
### FR-004
### FR-005
### FR-006
### FR-007
### SC-001
### SC-002
### SC-003
### SC-004
### SC-005
### SC-006
### AC-1.1
### AC-1.2
### AC-1.3
### AC-1.4
### AC-2.1
### AC-2.2
### AC-2.3
### AC-3.1
### AC-3.2
### AC-3.3
### AC-4.1
SPEC
    cat > "$repo/specs/dataset/001-legacy/spec.md" <<'SPEC'
# Legacy dataset fixture

## 規格相依性

None.
SPEC
    cat > "$repo/specs/STATUS.md" <<'STATUS'
# 規格狀態索引

| ID | 功能 | 模組 | 狀態 | 分支 | 備註 |
| --- | --- | --- | --- | --- | --- |
| foundation-001 | Project SDD lint | foundation | `in-progress` | `feat/project-sdd-lint` | fixture |
| dataset-001 | Legacy dataset | dataset | `done` | `main` | fixture |
STATUS
    cat > "$repo/openspec/changes/project-sdd-lint/proposal.md" <<'PROPOSAL'
# Project SDD lint proposal

對應 Spec: specs/foundation/001-project-sdd-lint/spec.md

FR-001 SC-001 AC-1.1
PROPOSAL
    cat > "$repo/openspec/changes/project-sdd-lint/design.md" <<'DESIGN'
# Project SDD lint design

## 功能目標

Serve SC-001 with a local command.

FR-002 SC-002 AC-3.1
DESIGN
    cat > "$repo/openspec/changes/project-sdd-lint/tasks.md" <<'TASKS'
# Tasks: Project SDD lint

## 1. Red and Green

**故事目標**：SC-001

- [ ] 1.1 Red contract in `scripts/speckit-tests.sh`. [@senior-qa]
- [ ] 1.2 Green command in `scripts/check-sdd.sh`. [@senior-devops]
TASKS
    cat > "$repo/openspec/changes/project-sdd-lint/specs/foundation/001-project-sdd-lint/spec.md" <<'DELTA'
## Purpose

FR-003 SC-003 AC-2.1
DELTA
    cat > "$repo/scripts/sdd-lint-baseline.txt" <<'BASELINE'
LEGACY_SPEC_HEADING	specs/dataset/001-legacy/spec.md	功能目標
BASELINE

    echo "$repo"
}

run_check_sdd() {
    local repo="$1"
    shift
    local command="$ROOT/scripts/check-sdd.sh"

    if [[ ! -x "$command" ]]; then
        echo "Expected Project SDD lint command is missing: scripts/check-sdd.sh" >&2
        return 127
    fi

    (
        cd "$TMP_ROOT"
        "$command" "$@" "$repo"
    )
}

assert_command_fails_with() {
    local repo="$1"
    local expected="$2"
    shift 2
    local output
    output="$(mktemp "$TMP_ROOT/check-sdd.XXXXXX")"

    if run_check_sdd "$repo" "$@" >"$output" 2>&1; then
        echo "Expected check-sdd.sh to fail" >&2
        exit 1
    fi
    assert_contains "$output" "$expected"
}

test_check_sdd_passes_for_valid_repo() {
    local repo output
    repo="$(make_sdd_repo)"
    output="$(mktemp "$TMP_ROOT/check-sdd.XXXXXX")"

    run_check_sdd "$repo" 2>&1 | tee "$output"
    assert_contains "$output" "Project SDD lint: 0 error(s)"
}

test_check_sdd_uses_explicit_repo_root() {
    local repo output
    repo="$(make_sdd_repo)"
    output="$(mktemp "$TMP_ROOT/check-sdd.XXXXXX")"

    run_check_sdd "$repo" >"$output" 2>&1
    assert_contains "$output" "Project SDD lint: 0 error(s)"
}

test_check_sdd_fails_for_missing_goal_heading() {
    local repo
    repo="$(make_sdd_repo)"
    sed -i.bak '/^## 功能目標$/,/^## 規格相依性$/d' "$repo/specs/foundation/001-project-sdd-lint/spec.md"

    assert_command_fails_with "$repo" "SPEC_REQUIRED_HEADING"
}

test_check_sdd_fails_for_active_change_stage_drift() {
    local repo
    repo="$(make_sdd_repo)"
    sed -i.bak 's/`in-progress`/`spec-ready`/' "$repo/specs/STATUS.md"

    assert_command_fails_with "$repo" "ACTIVE_CHANGE_STAGE"
}

test_check_sdd_fails_for_missing_source_id() {
    local repo
    repo="$(make_sdd_repo)"
    printf '\nFR-999\n' >> "$repo/openspec/changes/project-sdd-lint/proposal.md"

    assert_command_fails_with "$repo" "SOURCE_VERIFY_ID"
}

test_check_sdd_fails_for_invalid_assignee() {
    local repo
    repo="$(make_sdd_repo)"
    sed -i.bak 's/\[@senior-qa\]/[@missing-agent]/' "$repo/openspec/changes/project-sdd-lint/tasks.md"

    assert_command_fails_with "$repo" "TASK_ASSIGNEE"
}

test_check_sdd_fails_for_incomplete_exception() {
    local repo
    repo="$(make_sdd_repo)"
    printf '\n- [ ] 1.3 Scaffold. Exception: scaffold; Files: `scripts/a.sh`, `scripts/b.sh`. [@senior-devops]\n' >> "$repo/openspec/changes/project-sdd-lint/tasks.md"

    assert_command_fails_with "$repo" "TASK_EXCEPTION"
}

test_check_sdd_fails_for_wrong_red_owner() {
    local repo
    repo="$(make_sdd_repo)"
    sed -i.bak 's/Red contract in `scripts\/speckit-tests.sh`. \[@senior-qa\]/Red contract in `scripts\/speckit-tests.sh`. [@senior-devops]/' "$repo/openspec/changes/project-sdd-lint/tasks.md"

    assert_command_fails_with "$repo" "TASK_RED_OWNER"
}

test_check_sdd_fails_for_retired_command() {
    local repo
    repo="$(make_sdd_repo)"
    printf '\nnpm test\n' >> "$repo/AGENTS.md"

    assert_command_fails_with "$repo" "RETIRED_COMMAND"
}

test_check_sdd_does_not_match_pnpm() {
    local repo output
    repo="$(make_sdd_repo)"
    output="$(mktemp "$TMP_ROOT/check-sdd.XXXXXX")"

    run_check_sdd "$repo" >"$output" 2>&1
    assert_contains "$output" "Project SDD lint: 0 error(s)"
}

test_check_sdd_accepts_exact_legacy_baseline() {
    local repo output
    repo="$(make_sdd_repo)"
    output="$(mktemp "$TMP_ROOT/check-sdd.XXXXXX")"

    run_check_sdd "$repo" >"$output" 2>&1
    assert_contains "$output" "LEGACY_SPEC_HEADING"
}

test_check_sdd_fails_for_new_baseline_violation() {
    local repo
    repo="$(make_sdd_repo)"
    mkdir -p "$repo/specs/dataset/002-new-debt"
    printf '# New legacy debt\n' > "$repo/specs/dataset/002-new-debt/spec.md"

    assert_command_fails_with "$repo" "LEGACY_SPEC_HEADING"
}

test_check_sdd_fails_for_stale_baseline_entry() {
    local repo
    repo="$(make_sdd_repo)"
    sed -i.bak '1a\\
## 功能目標\
\
Legacy goal.' "$repo/specs/dataset/001-legacy/spec.md"

    assert_command_fails_with "$repo" "stale"
}

test_check_sdd_fails_for_duplicate_or_unsorted_baseline() {
    local repo
    repo="$(make_sdd_repo)"
    printf 'LEGACY_SPEC_HEADING\tspecs/dataset/001-legacy/spec.md\t功能目標\n' >> "$repo/scripts/sdd-lint-baseline.txt"

    assert_command_fails_with "$repo" "BASELINE_FORMAT"
}

test_check_sdd_strict_promotes_baseline_debt() {
    local repo
    repo="$(make_sdd_repo)"

    assert_command_fails_with "$repo" "LEGACY_SPEC_HEADING" --strict
}

test_check_sdd_inventory_warning_is_non_blocking() {
    local repo output
    repo="$(make_sdd_repo)"
    output="$(mktemp "$TMP_ROOT/check-sdd.XXXXXX")"

    run_check_sdd "$repo" >"$output" 2>&1
    assert_contains "$output" "INVENTORY_FRESHNESS_UNVERIFIED"
}

test_prerequisites_resolve_module_feature_paths
test_create_feature_creates_module_branch_spec_and_status
test_setup_plan_and_status_update
test_check_spec_artifacts_passes_for_synced_repo
test_check_spec_artifacts_fails_for_untracked_spec
test_ci_uses_pnpm_for_prototype_jobs
test_check_sdd_passes_for_valid_repo
test_check_sdd_uses_explicit_repo_root
test_check_sdd_fails_for_missing_goal_heading
test_check_sdd_fails_for_active_change_stage_drift
test_check_sdd_fails_for_missing_source_id
test_check_sdd_fails_for_invalid_assignee
test_check_sdd_fails_for_incomplete_exception
test_check_sdd_fails_for_wrong_red_owner
test_check_sdd_fails_for_retired_command
test_check_sdd_does_not_match_pnpm
test_check_sdd_accepts_exact_legacy_baseline
test_check_sdd_fails_for_new_baseline_violation
test_check_sdd_fails_for_stale_baseline_entry
test_check_sdd_fails_for_duplicate_or_unsorted_baseline
test_check_sdd_strict_promotes_baseline_debt
test_check_sdd_inventory_warning_is_non_blocking

echo "speckit script tests passed"
