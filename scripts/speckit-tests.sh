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

INVENTORY_SENTINEL='design/system/screen-inventory.md is stale — run: node scripts/gen-screen-inventory.mjs'

write_inventory_generator_double() {
    local repo="$1"

    cat > "$repo/scripts/gen-screen-inventory.mjs" <<'GENERATOR'
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const mode = fs.readFileSync(path.join(scriptDir, 'inventory-double-mode.txt'), 'utf8').trim();
const sentinel = 'design/system/screen-inventory.md is stale — run: node scripts/gen-screen-inventory.mjs';

if (process.argv.slice(2).join(' ') !== '--check') {
  process.stderr.write('RAW_WRONG_GENERATOR_ARGUMENTS\n');
  process.exit(9);
}

switch (mode) {
  case 'fresh':
    process.stdout.write('RAW_FRESH_CHILD_OUTPUT\n');
    process.exit(0);
    break;
  case 'stale':
    process.stderr.write(`${sentinel}\n`);
    process.exit(1);
    break;
  case 'prefix':
    process.stdout.write(`RAW_SENTINEL_PREFIX${sentinel}\n`);
    process.exit(1);
    break;
  case 'suffix':
    process.stdout.write(`${sentinel}RAW_SENTINEL_SUFFIX\n`);
    process.exit(1);
    break;
  case 'extra-line':
    process.stdout.write(`${sentinel}\nRAW_EXTRA_NONBLANK_LINE\n`);
    process.exit(1);
    break;
  case 'sentinel-less':
    process.stderr.write('RAW_SENTINEL_LESS_EXIT_ONE\n');
    process.exit(1);
    break;
  case 'exit-two':
    process.stderr.write('RAW_GENERATOR_EXIT_TWO\n');
    process.exit(2);
    break;
  case 'unexpected-exit':
    process.stderr.write('RAW_GENERATOR_UNEXPECTED_EXIT\n');
    process.exit(7);
    break;
  case 'unrunnable':
    process.stderr.write('RAW_GENERATOR_UNRUNNABLE\n');
    process.exit(126);
    break;
  case 'caller-decoy':
    process.stderr.write('RAW_CALLER_GENERATOR_USED\n');
    process.exit(7);
    break;
  default:
    process.stderr.write('RAW_UNKNOWN_GENERATOR_MODE\n');
    process.exit(8);
}
GENERATOR
    printf 'fresh\n' > "$repo/scripts/inventory-double-mode.txt"
}

set_inventory_generator_mode() {
    local repo="$1"
    local mode="$2"

    printf '%s\n' "$mode" > "$repo/scripts/inventory-double-mode.txt"
}

make_sdd_repo() {
    local repo
    repo="$(mktemp -d "$TMP_ROOT/sdd-repo.XXXXXX")"

    mkdir -p \
        "$repo/.claude/agents" \
        "$repo/design/system" \
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
### FR-008
### FR-009
### SC-001
### SC-002
### SC-003
### SC-004
### SC-005
### SC-006
### SC-007
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
### AC-4.2
### AC-4.3
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
LEGACY_SPEC_HEADING	specs/dataset/001-legacy/spec.md	missing:## 功能目標
BASELINE
    cat > "$repo/design/system/screen-inventory.md" <<'INVENTORY'
# Synthetic screen inventory
INVENTORY
    write_inventory_generator_double "$repo"

    echo "$repo"
}

run_check_sdd_from() {
    local caller="$1"
    local repo="$2"
    shift 2
    local command="$ROOT/scripts/check-sdd.sh"

    if [[ ! -x "$command" ]]; then
        echo "Expected Project SDD lint command is missing: scripts/check-sdd.sh" >&2
        return 127
    fi

    (
        cd "$caller"
        "$command" "$@" "$repo"
    )
}

run_check_sdd() {
    local repo="$1"
    shift

    run_check_sdd_from "$TMP_ROOT" "$repo" "$@"
}

assert_command_fails_with() {
    local repo="$1"
    local expected_status="$2"
    local rule="$3"
    local path="$4"
    shift 4
    local output status
    output="$(mktemp "$TMP_ROOT/check-sdd.XXXXXX")"

    if run_check_sdd "$repo" "$@" >"$output" 2>&1; then
        echo "Expected check-sdd.sh to exit $expected_status" >&2
        exit 1
    else
        status=$?
    fi
    if [[ "$status" -ne "$expected_status" ]]; then
        echo "Expected check-sdd.sh to exit $expected_status, got: $status" >&2
        cat "$output" >&2
        exit 1
    fi
    assert_contains "$output" "$rule"
    assert_contains "$output" "$path"
}

assert_not_contains() {
    local path="$1"
    local text="$2"

    if grep -Fq "$text" "$path"; then
        echo "Expected $path not to contain: $text" >&2
        cat "$path" >&2
        exit 1
    fi
}

assert_inventory_success() {
    local repo="$1"
    shift
    local output status
    output="$(mktemp "$TMP_ROOT/check-sdd-inventory.XXXXXX")"

    if run_check_sdd "$repo" "$@" >"$output" 2>&1; then
        status=0
    else
        status=$?
    fi
    if [[ "$status" -ne 0 ]]; then
        echo "Expected fresh inventory lint to exit 0, got: $status" >&2
        cat "$output" >&2
        exit 1
    fi
    assert_contains "$output" "Project SDD lint: 0 error(s)"
    assert_not_contains "$output" "INVENTORY_FRESHNESS]"
    assert_not_contains "$output" "INVENTORY_CHECK_CONFIG"
    assert_not_contains "$output" "INVENTORY_FRESHNESS_UNVERIFIED"
    assert_not_contains "$output" "RAW_FRESH_CHILD_OUTPUT"
}

assert_inventory_failure() {
    local repo="$1"
    local expected_status="$2"
    local rule="$3"
    local path="$4"
    local raw_child_text="$5"
    shift 5
    local output status
    output="$(mktemp "$TMP_ROOT/check-sdd-inventory.XXXXXX")"

    if run_check_sdd "$repo" "$@" >"$output" 2>&1; then
        status=0
    else
        status=$?
    fi
    if [[ "$status" -ne "$expected_status" ]]; then
        echo "Expected inventory lint to exit $expected_status, got: $status" >&2
        cat "$output" >&2
        exit 1
    fi
    assert_contains "$output" "ERROR [$rule] $path:"
    case "$rule" in
        INVENTORY_FRESHNESS)
            assert_not_contains "$output" "INVENTORY_CHECK_CONFIG"
            ;;
        INVENTORY_CHECK_CONFIG)
            assert_not_contains "$output" "[INVENTORY_FRESHNESS]"
            ;;
    esac
    assert_not_contains "$output" "$raw_child_text"
    assert_not_contains "$output" "$INVENTORY_SENTINEL"
    assert_not_contains "$output" "INVENTORY_FRESHNESS_UNVERIFIED"
}

test_check_sdd_passes_for_valid_repo() {
    local repo output
    repo="$(make_sdd_repo)"
    output="$(mktemp "$TMP_ROOT/check-sdd.XXXXXX")"

    run_check_sdd "$repo" 2>&1 | tee "$output"
    assert_contains "$output" "Project SDD lint: 0 error(s)"
}

test_check_sdd_uses_explicit_repo_root() {
    local caller repo output
    caller="$(make_sdd_repo)"
    repo="$(make_sdd_repo)"
    output="$(mktemp "$TMP_ROOT/check-sdd.XXXXXX")"
    sed -i.bak '/^## 功能目標$/,/^## 規格相依性$/d' "$caller/specs/foundation/001-project-sdd-lint/spec.md"

    run_check_sdd_from "$caller" "$repo" >"$output" 2>&1
    assert_contains "$output" "Project SDD lint: 0 error(s)"
    assert_not_contains "$output" "SPEC_REQUIRED_HEADING"
}

test_check_sdd_fails_for_missing_goal_heading() {
    local repo
    repo="$(make_sdd_repo)"
    sed -i.bak '/^## 功能目標$/,/^## 規格相依性$/d' "$repo/specs/foundation/001-project-sdd-lint/spec.md"

    assert_command_fails_with "$repo" 1 "SPEC_REQUIRED_HEADING" "specs/foundation/001-project-sdd-lint/spec.md"
}

test_check_sdd_fails_for_active_change_stage_drift() {
    local repo
    repo="$(make_sdd_repo)"
    sed -i.bak 's/`in-progress`/`spec-ready`/' "$repo/specs/STATUS.md"

    assert_command_fails_with "$repo" 1 "ACTIVE_CHANGE_STAGE" "specs/STATUS.md"
}

test_check_sdd_fails_for_missing_source_id() {
    local repo
    repo="$(make_sdd_repo)"
    printf '\nFR-999\n' >> "$repo/openspec/changes/project-sdd-lint/proposal.md"

    assert_command_fails_with "$repo" 1 "SOURCE_VERIFY_ID" "openspec/changes/project-sdd-lint/proposal.md"
}

test_check_sdd_fails_for_invalid_assignee() {
    local repo

    repo="$(make_sdd_repo)"
    sed -i.bak '/^\*\*故事目標\*\*/d' "$repo/openspec/changes/project-sdd-lint/tasks.md"
    assert_command_fails_with "$repo" 1 "TASK_STORY_GOAL" "openspec/changes/project-sdd-lint/tasks.md"

    repo="$(make_sdd_repo)"
    sed -i.bak 's/SC-001/SC-999/' "$repo/openspec/changes/project-sdd-lint/tasks.md"
    assert_command_fails_with "$repo" 1 "TASK_STORY_GOAL" "openspec/changes/project-sdd-lint/tasks.md"

    repo="$(make_sdd_repo)"
    sed -i.bak 's/\[@senior-qa\]/[@missing-agent]/' "$repo/openspec/changes/project-sdd-lint/tasks.md"

    assert_command_fails_with "$repo" 1 "TASK_ASSIGNEE" "openspec/changes/project-sdd-lint/tasks.md"
}

test_check_sdd_fails_for_incomplete_exception() {
    local repo
    repo="$(make_sdd_repo)"
    printf '\n- [ ] 1.3 Scaffold. Exception: scaffold; Files: `scripts/a.sh`, `scripts/b.sh`. [@senior-devops]\n' >> "$repo/openspec/changes/project-sdd-lint/tasks.md"

    assert_command_fails_with "$repo" 1 "TASK_EXCEPTION" "openspec/changes/project-sdd-lint/tasks.md"
}

test_check_sdd_fails_for_wrong_red_owner() {
    local repo
    repo="$(make_sdd_repo)"
    sed -i.bak 's/Red contract in `scripts\/speckit-tests.sh`. \[@senior-qa\]/Red contract in `scripts\/speckit-tests.sh`. [@senior-devops]/' "$repo/openspec/changes/project-sdd-lint/tasks.md"

    assert_command_fails_with "$repo" 1 "TASK_RED_OWNER" "openspec/changes/project-sdd-lint/tasks.md"

    repo="$(make_sdd_repo)"
    sed -i.bak 's/Green command in `scripts\/check-sdd.sh`. \[@senior-devops\]/Green command in `scripts\/check-sdd.sh`. [@senior-qa]/' "$repo/openspec/changes/project-sdd-lint/tasks.md"
    assert_command_fails_with "$repo" 1 "TASK_FILE_OWNER" "openspec/changes/project-sdd-lint/tasks.md"
}

test_check_sdd_fails_for_retired_command() {
    local repo

    repo="$(make_sdd_repo)"
    printf '\nnpm test\n' >> "$repo/AGENTS.md"
    assert_command_fails_with "$repo" 1 "RETIRED_COMMAND" "AGENTS.md"

    repo="$(make_sdd_repo)"
    printf '\nnpm run lint\n' >> "$repo/AGENTS.md"
    assert_command_fails_with "$repo" 1 "RETIRED_COMMAND" "AGENTS.md"

    repo="$(make_sdd_repo)"
    printf '\n/ui-ux-pro-max\n' >> "$repo/AGENTS.md"
    assert_command_fails_with "$repo" 1 "RETIRED_COMMAND" "AGENTS.md"

    repo="$(make_sdd_repo)"
    printf '\n/speckit.analyze\n' >> "$repo/AGENTS.md"
    assert_command_fails_with "$repo" 1 "RETIRED_COMMAND" "AGENTS.md"
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

    assert_command_fails_with "$repo" 1 "LEGACY_SPEC_HEADING" "specs/dataset/002-new-debt/spec.md"
}

test_check_sdd_fails_for_stale_baseline_entry() {
    local repo
    repo="$(make_sdd_repo)"
    sed -i.bak '1a\\
## 功能目標\
\
Legacy goal.' "$repo/specs/dataset/001-legacy/spec.md"

    assert_command_fails_with "$repo" 1 "BASELINE_STALE" "scripts/sdd-lint-baseline.txt"
}

test_check_sdd_fails_for_duplicate_or_unsorted_baseline() {
    local repo
    repo="$(make_sdd_repo)"
    printf 'LEGACY_SPEC_HEADING\tspecs/dataset/001-legacy/spec.md\tmissing:## 功能目標\n' >> "$repo/scripts/sdd-lint-baseline.txt"
    assert_command_fails_with "$repo" 2 "BASELINE_FORMAT" "scripts/sdd-lint-baseline.txt"

    repo="$(make_sdd_repo)"
    mkdir -p "$repo/specs/dataset/000-earlier"
    printf '# Earlier legacy debt\n' > "$repo/specs/dataset/000-earlier/spec.md"
    printf 'LEGACY_SPEC_HEADING\tspecs/dataset/000-earlier/spec.md\tmissing:## 功能目標\n' >> "$repo/scripts/sdd-lint-baseline.txt"
    assert_command_fails_with "$repo" 2 "BASELINE_FORMAT" "scripts/sdd-lint-baseline.txt"
}

test_check_sdd_strict_promotes_baseline_debt() {
    local repo
    repo="$(make_sdd_repo)"

    assert_command_fails_with "$repo" 1 "LEGACY_SPEC_HEADING" "specs/dataset/001-legacy/spec.md" --strict
}

test_check_sdd_inventory_fresh_has_no_diagnostic() {
    local repo
    repo="$(make_sdd_repo)"

    assert_inventory_success "$repo"

    repo="$(make_sdd_repo)"
    sed -i.bak '1a\\
## 功能目標\
\
Legacy goal.' "$repo/specs/dataset/001-legacy/spec.md"
    : > "$repo/scripts/sdd-lint-baseline.txt"
    assert_inventory_success "$repo" --strict
}

test_check_sdd_inventory_exact_stale_sentinel() {
    local repo

    repo="$(make_sdd_repo)"
    set_inventory_generator_mode "$repo" stale
    assert_inventory_failure "$repo" 1 "INVENTORY_FRESHNESS" "design/system/screen-inventory.md" "$INVENTORY_SENTINEL"

    repo="$(make_sdd_repo)"
    set_inventory_generator_mode "$repo" stale
    assert_inventory_failure "$repo" 1 "INVENTORY_FRESHNESS" "design/system/screen-inventory.md" "$INVENTORY_SENTINEL" --strict
}

test_check_sdd_inventory_rejects_near_sentinels() {
    local repo

    repo="$(make_sdd_repo)"
    set_inventory_generator_mode "$repo" prefix
    assert_inventory_failure "$repo" 2 "INVENTORY_CHECK_CONFIG" "scripts/gen-screen-inventory.mjs" "RAW_SENTINEL_PREFIX"

    repo="$(make_sdd_repo)"
    set_inventory_generator_mode "$repo" suffix
    assert_inventory_failure "$repo" 2 "INVENTORY_CHECK_CONFIG" "scripts/gen-screen-inventory.mjs" "RAW_SENTINEL_SUFFIX"

    repo="$(make_sdd_repo)"
    set_inventory_generator_mode "$repo" extra-line
    assert_inventory_failure "$repo" 2 "INVENTORY_CHECK_CONFIG" "scripts/gen-screen-inventory.mjs" "RAW_EXTRA_NONBLANK_LINE"

    repo="$(make_sdd_repo)"
    set_inventory_generator_mode "$repo" sentinel-less
    assert_inventory_failure "$repo" 2 "INVENTORY_CHECK_CONFIG" "scripts/gen-screen-inventory.mjs" "RAW_SENTINEL_LESS_EXIT_ONE"
}

test_check_sdd_inventory_configuration_failures() {
    local node_bin repo

    repo="$(make_sdd_repo)"
    mv "$repo/scripts/gen-screen-inventory.mjs" "$repo/scripts/gen-screen-inventory.mjs.missing"
    assert_inventory_failure "$repo" 2 "INVENTORY_CHECK_CONFIG" "scripts/gen-screen-inventory.mjs" "MODULE_NOT_FOUND"

    repo="$(make_sdd_repo)"
    chmod 000 "$repo/scripts/gen-screen-inventory.mjs"
    assert_inventory_failure "$repo" 2 "INVENTORY_CHECK_CONFIG" "scripts/gen-screen-inventory.mjs" "EACCES"

    repo="$(make_sdd_repo)"
    cat > "$repo/scripts/gen-screen-inventory.mjs" <<'GENERATOR'
const RAW_UNLOADABLE_GENERATOR = ;
GENERATOR
    assert_inventory_failure "$repo" 2 "INVENTORY_CHECK_CONFIG" "scripts/gen-screen-inventory.mjs" "RAW_UNLOADABLE_GENERATOR"

    repo="$(make_sdd_repo)"
    set_inventory_generator_mode "$repo" unrunnable
    assert_inventory_failure "$repo" 2 "INVENTORY_CHECK_CONFIG" "scripts/gen-screen-inventory.mjs" "RAW_GENERATOR_UNRUNNABLE"

    repo="$(make_sdd_repo)"
    set_inventory_generator_mode "$repo" exit-two
    assert_inventory_failure "$repo" 2 "INVENTORY_CHECK_CONFIG" "scripts/gen-screen-inventory.mjs" "RAW_GENERATOR_EXIT_TWO"

    repo="$(make_sdd_repo)"
    set_inventory_generator_mode "$repo" unexpected-exit
    assert_inventory_failure "$repo" 2 "INVENTORY_CHECK_CONFIG" "scripts/gen-screen-inventory.mjs" "RAW_GENERATOR_UNEXPECTED_EXIT"

    repo="$(make_sdd_repo)"
    node_bin="$(mktemp -d "$TMP_ROOT/node-unavailable.XXXXXX")"
    cat > "$node_bin/node" <<'NODE'
#!/bin/sh
echo 'RAW_NODE_UNAVAILABLE' >&2
exit 127
NODE
    chmod +x "$node_bin/node"
    (
        PATH="$node_bin:$PATH"
        export PATH
        assert_inventory_failure "$repo" 2 "INVENTORY_CHECK_CONFIG" "scripts/gen-screen-inventory.mjs" "RAW_NODE_UNAVAILABLE"
    )
}

test_check_sdd_inventory_strict_config_mapping_is_invariant() {
    local repo

    repo="$(make_sdd_repo)"
    set_inventory_generator_mode "$repo" exit-two
    assert_inventory_failure "$repo" 2 "INVENTORY_CHECK_CONFIG" "scripts/gen-screen-inventory.mjs" "RAW_GENERATOR_EXIT_TWO" --strict
}

test_check_sdd_inventory_uses_target_root_generator() {
    local caller output repo status
    caller="$(make_sdd_repo)"
    repo="$(make_sdd_repo)"
    output="$(mktemp "$TMP_ROOT/check-sdd-inventory.XXXXXX")"
    set_inventory_generator_mode "$caller" caller-decoy

    if run_check_sdd_from "$caller" "$repo" >"$output" 2>&1; then
        status=0
    else
        status=$?
    fi
    if [[ "$status" -ne 0 ]]; then
        echo "Expected explicit target-root inventory lint to exit 0, got: $status" >&2
        cat "$output" >&2
        exit 1
    fi
    assert_contains "$output" "Project SDD lint: 0 error(s)"
    assert_not_contains "$output" "INVENTORY_FRESHNESS]"
    assert_not_contains "$output" "INVENTORY_CHECK_CONFIG"
    assert_not_contains "$output" "INVENTORY_FRESHNESS_UNVERIFIED"
    assert_not_contains "$output" "RAW_CALLER_GENERATOR_USED"
    assert_not_contains "$output" "RAW_FRESH_CHILD_OUTPUT"
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
test_check_sdd_inventory_fresh_has_no_diagnostic
test_check_sdd_inventory_exact_stale_sentinel
test_check_sdd_inventory_rejects_near_sentinels
test_check_sdd_inventory_configuration_failures
test_check_sdd_inventory_strict_config_mapping_is_invariant
test_check_sdd_inventory_uses_target_root_generator

echo "speckit script tests passed"
