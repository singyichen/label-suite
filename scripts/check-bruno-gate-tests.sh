#!/usr/bin/env bash
# check-bruno-gate-tests.sh — Regression harness for scripts/check-bruno-gate.sh (issue #1262).
#
# Usage:
#   ./scripts/check-bruno-gate-tests.sh
#   bash scripts/check-bruno-gate-tests.sh
#
# IMPORTANT — when to use this script:
#   Use after changing scripts/check-bruno-gate.sh or the embedded FR-131 gate
#   logic described in .claude/agents/team-lead.md.
#   It builds temporary throwaway git repositories under TMPDIR, runs the real
#   gate script (scripts/check-bruno-gate.sh) against them with real git
#   commands, and removes the temporary files on exit.
#
# Follows the structure and conventions of scripts/speckit-tests.sh: each
# scenario is an isolated fixture repo, assertions fail loudly via exit 1,
# and the script prints a final success line only if every test function
# below runs to completion without triggering set -e.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/label-suite-bruno-gate.XXXXXX")"
TMP_ROOT="$(cd "$TMP_ROOT" && pwd)"
GATE_SCRIPT="$ROOT/scripts/check-bruno-gate.sh"

cleanup() {
    rm -rf "$TMP_ROOT"
}
trap cleanup EXIT

# --- assertion helpers -------------------------------------------------

assert_exit_code() {
    local expected="$1"
    local actual="$2"
    local context="$3"
    if [[ "$actual" != "$expected" ]]; then
        echo "$context: expected exit code $expected, got $actual" >&2
        exit 1
    fi
}

assert_output_contains() {
    local output="$1"
    local text="$2"
    local context="$3"
    if [[ "$output" != *"$text"* ]]; then
        echo "$context: expected output to contain: $text" >&2
        echo "--- output ---" >&2
        echo "$output" >&2
        exit 1
    fi
}

# --- gate invocation helpers --------------------------------------------

run_gate() {
    local repo="$1"
    shift
    (cd "$repo" && "$GATE_SCRIPT" "$@")
}

# Sets GATE_OUTPUT and GATE_EXIT without tripping `set -e` on a non-zero
# (expected) exit code from the gate script under test.
capture_gate() {
    local repo="$1"
    shift
    set +e
    GATE_OUTPUT="$(run_gate "$repo" "$@" 2>&1)"
    GATE_EXIT=$?
    set -e
}

# --- fixture content builders --------------------------------------------

write_router_py() {
    local path="$1"
    local version="${2:-v1}"
    cat > "$path" <<PY
from fastapi import APIRouter

router = APIRouter()


@router.get("/items")
def list_items():
    return {"items": [], "version": "$version"}
PY
}

write_split_router_py() {
    local path="$1"
    local version="${2:-v1}"
    cat > "$path" <<PY
from fastapi import APIRouter

router = APIRouter()


@router.post("/create")
def create_item():
    return {"status": "created", "version": "$version"}
PY
}

write_valid_bru() {
    local path="$1"
    local version="${2:-v1}"
    cat > "$path" <<BRU
meta {
  name: List Items
  type: http
}

get {
  url: {{baseUrl}}/api/v1/demo/items
  body: none
}

# version: $version
BRU
}

write_other_bru() {
    local path="$1"
    local version="${2:-v1}"
    cat > "$path" <<BRU
meta {
  name: Other Feature
  type: http
}

post {
  url: {{baseUrl}}/api/v1/demo/other
  body: none
}

# version: $version
BRU
}

# --- fixture repo builders ------------------------------------------------

# Single router.py module "demo", with a matching backend/bruno/demo/create/
# endpoint file and a backend/bruno/environments/ file. Returns repo path.
make_demo_repo() {
    local repo
    repo="$(mktemp -d "$TMP_ROOT/repo.XXXXXX")"
    mkdir -p "$repo/backend/app/modules/demo" \
        "$repo/backend/bruno/demo/create" \
        "$repo/backend/bruno/environments"

    git -C "$repo" init -q
    git -C "$repo" checkout -q -b main

    write_router_py "$repo/backend/app/modules/demo/router.py" v1
    write_valid_bru "$repo/backend/bruno/demo/create/create.bru" v1
    cat > "$repo/backend/bruno/environments/local.bru" <<'ENV'
vars {
  baseUrl: http://localhost:8000
}
ENV

    git -C "$repo" add .
    git -C "$repo" -c user.email="qa-test@example.com" -c user.name="QA Test" \
        commit -q -m "chore: seed demo fixture"
    echo "$repo"
}

# Split-router module "demo" with two features, "create" (router/create.py)
# and "other" (bruno-only, used to prove feature-mismatch detection). Returns
# repo path.
make_demo_split_repo() {
    local repo
    repo="$(mktemp -d "$TMP_ROOT/repo.XXXXXX")"
    mkdir -p "$repo/backend/app/modules/demo/router" \
        "$repo/backend/bruno/demo/create" \
        "$repo/backend/bruno/demo/other"

    git -C "$repo" init -q
    git -C "$repo" checkout -q -b main

    write_split_router_py "$repo/backend/app/modules/demo/router/create.py" v1
    write_valid_bru "$repo/backend/bruno/demo/create/create.bru" v1
    write_other_bru "$repo/backend/bruno/demo/other/other.bru" v1

    git -C "$repo" add .
    git -C "$repo" -c user.email="qa-test@example.com" -c user.name="QA Test" \
        commit -q -m "chore: seed split-router fixture"
    echo "$repo"
}

# --- scenarios -------------------------------------------------------------

# 1. Route changed, no .bru change, last commit lacks the exemption marker.
test_route_change_without_bru_fails() {
    local repo
    repo="$(make_demo_repo)"

    write_router_py "$repo/backend/app/modules/demo/router.py" v2
    git -C "$repo" add backend/app/modules/demo/router.py

    capture_gate "$repo"
    assert_exit_code 1 "$GATE_EXIT" "route change without .bru update"
    assert_output_contains "$GATE_OUTPUT" "FR-131 gate:" "route change without .bru update"
}

# 2. Same as (1), but HEAD's commit message carries the exemption marker.
test_exemption_marker_bypasses_gate() {
    local repo
    repo="$(make_demo_repo)"

    git -C "$repo" -c user.email="qa-test@example.com" -c user.name="QA Test" \
        commit -q --allow-empty -m "chore: declare exemption

FR-131-exempt: skeleton-only route"

    write_router_py "$repo/backend/app/modules/demo/router.py" v2
    git -C "$repo" add backend/app/modules/demo/router.py

    capture_gate "$repo"
    assert_exit_code 0 "$GATE_EXIT" "exemption marker bypass"
    assert_output_contains "$GATE_OUTPUT" "FR-131 gate:" "exemption marker bypass"
    assert_output_contains "$GATE_OUTPUT" "Bypassing" "exemption marker bypass"
}

# 3. Single router.py changed plus a valid .bru in the same module.
test_single_router_with_matching_bru_passes() {
    local repo
    repo="$(make_demo_repo)"

    write_router_py "$repo/backend/app/modules/demo/router.py" v2
    cat > "$repo/backend/bruno/demo/create/update.bru" <<'BRU'
meta {
  name: Update Items
  type: http
}

patch {
  url: {{baseUrl}}/api/v1/demo/items
  body: json
}
BRU
    git -C "$repo" add backend/app/modules/demo/router.py backend/bruno/demo/create/update.bru

    capture_gate "$repo"
    assert_exit_code 0 "$GATE_EXIT" "single router with matching bru"
}

# 4. Split router changed, but the only .bru change is under a *different*
#    feature folder of the same module. This is the subshell-exit-1 bug case
#    from the embedded team-lead.md version: the extracted script must still
#    fail here.
test_split_router_mismatched_feature_bru_fails() {
    local repo
    repo="$(make_demo_split_repo)"

    write_split_router_py "$repo/backend/app/modules/demo/router/create.py" v2
    write_other_bru "$repo/backend/bruno/demo/other/other.bru" v2
    git -C "$repo" add backend/app/modules/demo/router/create.py backend/bruno/demo/other/other.bru

    capture_gate "$repo"
    assert_exit_code 1 "$GATE_EXIT" "split router with wrong-feature bru"
    assert_output_contains "$GATE_OUTPUT" "FR-131 gate:" "split router with wrong-feature bru"
}

# 5. Split router changed plus a matching .bru under the same feature folder.
test_split_router_matching_feature_bru_passes() {
    local repo
    repo="$(make_demo_split_repo)"

    write_split_router_py "$repo/backend/app/modules/demo/router/create.py" v2
    write_valid_bru "$repo/backend/bruno/demo/create/create.bru" v2
    git -C "$repo" add backend/app/modules/demo/router/create.py backend/bruno/demo/create/create.bru

    capture_gate "$repo"
    assert_exit_code 0 "$GATE_EXIT" "split router with matching feature bru"
}

# 6. A changed .bru file at the wrong depth (missing the feature folder).
test_bru_wrong_depth_fails_path_check() {
    local repo
    repo="$(make_demo_repo)"

    cat > "$repo/backend/bruno/demo/wrongdepth.bru" <<'BRU'
meta {
  name: Wrong Depth
  type: http
}

get {
  url: {{baseUrl}}/api/v1/demo/wrong
  body: none
}
BRU
    git -C "$repo" add backend/bruno/demo/wrongdepth.bru

    capture_gate "$repo"
    assert_exit_code 1 "$GATE_EXIT" "bru file at wrong path depth"
    assert_output_contains "$GATE_OUTPUT" "Bruno path error:" "bru file at wrong path depth"
}

# 7. A changed .bru file at the right depth but missing meta{ / method block.
test_bru_missing_structure_fails() {
    local repo
    repo="$(make_demo_repo)"

    cat > "$repo/backend/bruno/demo/create/broken.bru" <<'BRU'
meta {
  name: Broken Endpoint
  type: http
}
BRU
    git -C "$repo" add backend/bruno/demo/create/broken.bru

    capture_gate "$repo"
    assert_exit_code 1 "$GATE_EXIT" "bru file missing method block"
    assert_output_contains "$GATE_OUTPUT" "Bruno structure error:" "bru file missing method block"
}

# 8. Only backend/bruno/environments/ changed (and no route change) — ignored.
test_environments_bru_change_ignored() {
    local repo
    repo="$(make_demo_repo)"

    cat >> "$repo/backend/bruno/environments/local.bru" <<'ENV'
  timeout: 5000
ENV
    git -C "$repo" add backend/bruno/environments/local.bru

    capture_gate "$repo"
    assert_exit_code 0 "$GATE_EXIT" "environments-only bru change"
}

# 9. --base <ref> mode: a committed route change (no .bru, no marker) on a
#    clean working tree is invisible to local mode, but visible via --base.
test_base_flag_detects_committed_route_change() {
    local repo
    repo="$(make_demo_repo)"

    git -C "$repo" checkout -q -b feature
    write_router_py "$repo/backend/app/modules/demo/router.py" v2
    git -C "$repo" add backend/app/modules/demo/router.py
    git -C "$repo" -c user.email="qa-test@example.com" -c user.name="QA Test" \
        commit -q -m "feat: update route"

    capture_gate "$repo"
    assert_exit_code 0 "$GATE_EXIT" "clean tree without --base"

    capture_gate "$repo" --base main
    assert_exit_code 1 "$GATE_EXIT" "--base main detects committed route change"
    assert_output_contains "$GATE_OUTPUT" "FR-131 gate:" "--base main detects committed route change"
}

# 10. No relevant changes at all.
test_no_changes_passes() {
    local repo
    repo="$(make_demo_repo)"

    capture_gate "$repo"
    assert_exit_code 0 "$GATE_EXIT" "no relevant changes"
}

# 11. CI mode (--base): on a GitHub pull_request run, actions/checkout leaves
#     HEAD at a synthetic merge commit ("Merge <head> into <base>"), so the
#     exemption marker committed on the feature branch never reaches HEAD's
#     own commit message. Corrected behaviour: the gate must scan every
#     non-merge commit in <base>..HEAD, not just HEAD, so the marker commit
#     inside the range still bypasses the gate.
test_base_flag_detects_marker_in_merge_commit_range() {
    local repo
    repo="$(make_demo_repo)"

    git -C "$repo" checkout -q -b feature
    write_router_py "$repo/backend/app/modules/demo/router.py" v2
    git -C "$repo" add backend/app/modules/demo/router.py
    git -C "$repo" -c user.email="qa-test@example.com" -c user.name="QA Test" \
        commit -q -m "feat: update route

FR-131-exempt: skeleton-only route"

    git -C "$repo" checkout -q main
    git -C "$repo" checkout -q -b synthetic
    git -C "$repo" -c user.email="qa-test@example.com" -c user.name="QA Test" \
        merge -q --no-ff feature -m "Merge feature into main"

    capture_gate "$repo" --base main
    assert_exit_code 0 "$GATE_EXIT" "CI merge-commit exemption across range"
    assert_output_contains "$GATE_OUTPUT" "Bypassing" "CI merge-commit exemption across range"
}

# 12. CI mode (--base): same synthetic-merge shape as (11), but no commit in
#     the range carries the exemption marker. The gate must still fail — this
#     guards against a fix for (11) that relaxes the marker requirement
#     entirely instead of widening the scan to the whole range.
test_base_flag_no_marker_in_range_fails() {
    local repo
    repo="$(make_demo_repo)"

    git -C "$repo" checkout -q -b feature
    write_router_py "$repo/backend/app/modules/demo/router.py" v2
    git -C "$repo" add backend/app/modules/demo/router.py
    git -C "$repo" -c user.email="qa-test@example.com" -c user.name="QA Test" \
        commit -q -m "feat: update route"

    git -C "$repo" checkout -q main
    git -C "$repo" checkout -q -b synthetic
    git -C "$repo" -c user.email="qa-test@example.com" -c user.name="QA Test" \
        merge -q --no-ff feature -m "Merge feature into main"

    capture_gate "$repo" --base main
    assert_exit_code 1 "$GATE_EXIT" "CI merge-commit without marker still fails"
    assert_output_contains "$GATE_OUTPUT" "FR-131 gate:" "CI merge-commit without marker still fails"
}

# 13. Local mode (no --base) must keep reading HEAD only: the exemption
#     marker sits on an older commit, not HEAD, so a route change staged in
#     the working tree still fails the gate.
test_local_mode_marker_not_at_head_still_fails() {
    local repo
    repo="$(make_demo_repo)"

    git -C "$repo" -c user.email="qa-test@example.com" -c user.name="QA Test" \
        commit -q --allow-empty -m "chore: declare exemption

FR-131-exempt: skeleton-only route"
    git -C "$repo" -c user.email="qa-test@example.com" -c user.name="QA Test" \
        commit -q --allow-empty -m "chore: unrelated follow-up"

    write_router_py "$repo/backend/app/modules/demo/router.py" v2
    git -C "$repo" add backend/app/modules/demo/router.py

    capture_gate "$repo"
    assert_exit_code 1 "$GATE_EXIT" "local mode marker not at HEAD"
    assert_output_contains "$GATE_OUTPUT" "FR-131 gate:" "local mode marker not at HEAD"
}

test_route_change_without_bru_fails
test_exemption_marker_bypasses_gate
test_single_router_with_matching_bru_passes
test_split_router_mismatched_feature_bru_fails
test_split_router_matching_feature_bru_passes
test_bru_wrong_depth_fails_path_check
test_bru_missing_structure_fails
test_environments_bru_change_ignored
test_base_flag_detects_committed_route_change
test_no_changes_passes
test_base_flag_detects_marker_in_merge_commit_range
test_base_flag_no_marker_in_range_fails
test_local_mode_marker_not_at_head_still_fails

echo "check-bruno-gate script tests passed"
