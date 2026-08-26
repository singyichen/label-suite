#!/usr/bin/env bash
# pre-tool-use-tests.sh — Run local regression tests for .claude/hooks/pre-tool-use.sh.
#
# Usage:
#   ./scripts/pre-tool-use-tests.sh
#   bash scripts/pre-tool-use-tests.sh
#
# IMPORTANT — when to use this script:
#   Use after changing .claude/hooks/pre-tool-use.sh, especially its
#   git-push branch-detection guard (AGENTS.md Rule 2 / issue #471).
#   It builds temporary git repositories (and, for the worktree case, a
#   linked worktree) under TMPDIR and feeds each hook a synthetic
#   PreToolUse JSON payload on stdin, then asserts the hook's exit code.
#
# How it works:
#   Each test creates an isolated throwaway repo under TMP_ROOT with a
#   single commit, checks out the branch state the case needs, and invokes
#   `bash <path-to-hook>` with a JSON payload on stdin. The hook process is
#   spawned from an explicit "spawn cwd" that may differ from the "cwd"
#   field embedded in the payload — this is what makes the difference
#   between "the hook process's own cwd" and "the directory the intercepted
#   command actually runs in" observable. The hook itself is referenced
#   directly from this worktree (never copied/modified) since it depends
#   only on stdin JSON and the git state of whatever directory it runs in.
#   All temporary repos/worktrees are removed on exit.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOK="$ROOT/.claude/hooks/pre-tool-use.sh"
TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/label-suite-pre-tool-use.XXXXXX")"
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

# Runs the hook as `bash "$HOOK"`, spawned with process cwd = $1, fed the
# JSON payload $2 on stdin. Populates LAST_HOOK_CODE / LAST_HOOK_OUTPUT.
run_hook() {
    local spawn_cwd="$1"
    local payload="$2"
    LAST_HOOK_OUTPUT=$(cd "$spawn_cwd" && printf '%s' "$payload" | bash "$HOOK" 2>&1)
    LAST_HOOK_CODE=$?
}

assert_exit_code() {
    local expected="$1"
    local desc="$2"
    if [[ "$LAST_HOOK_CODE" != "$expected" ]]; then
        echo "FAIL: $desc (expected exit $expected, got $LAST_HOOK_CODE)" >&2
        echo "--- hook stdout/stderr ---" >&2
        echo "$LAST_HOOK_OUTPUT" >&2
        exit 1
    fi
}

# Builds a PreToolUse-shaped payload with a top-level "cwd" field (the
# directory the intercepted Bash command actually runs in).
payload_with_cwd() {
    local command="$1"
    local cwd="$2"
    printf '{"tool_name":"Bash","tool_input":{"command":"%s"},"cwd":"%s"}' "$command" "$cwd"
}

# Builds a PreToolUse-shaped payload with no "cwd" field at all.
payload_without_cwd() {
    local command="$1"
    printf '{"tool_name":"Bash","tool_input":{"command":"%s"}}' "$command"
}

# Creates a throwaway repo with one commit, checked out on $1.
make_repo() {
    local branch="$1"
    local repo
    repo="$(mktemp -d "$TMP_ROOT/repo.XXXXXX")"
    git -C "$repo" init -q
    git -C "$repo" -c user.email="qa@example.com" -c user.name="QA Bot" commit -q -m "init" --allow-empty
    git -C "$repo" branch -m "$branch"
    echo "$repo"
}

test_guard_blocks_push_on_main() {
    local repo
    repo="$(make_repo main)"
    local payload
    payload="$(payload_with_cwd "git push" "$repo")"

    run_hook "$repo" "$payload"
    assert_exit_code 2 "guard: plain 'git push' while checked out on main must be blocked"
    echo "PASS: guard blocks git push while on main (exit 2)"
}

test_guard_allows_push_on_feature_branch() {
    local repo
    repo="$(make_repo feat/example)"
    local payload
    payload="$(payload_with_cwd "git push" "$repo")"

    run_hook "$repo" "$payload"
    assert_exit_code 0 "guard: plain 'git push' while checked out on a feature branch must be allowed"
    echo "PASS: guard allows git push while on a feature branch (exit 0)"
}

test_red_worktree_push_is_not_blocked_by_main_workspace_branch() {
    local main_repo worktree_path feature_branch="feat/worktree-example"
    main_repo="$(make_repo main)"
    worktree_path="$(mktemp -d "$TMP_ROOT/worktree.XXXXXX")"
    rmdir "$worktree_path"
    git -C "$main_repo" worktree add -q -b "$feature_branch" "$worktree_path"

    local payload
    payload="$(payload_with_cwd "git push" "$worktree_path")"

    # Today's bug (issue #471): the hook process is spawned from the main
    # workspace's own cwd (main branch), even though the payload says the
    # push actually runs inside the linked worktree (feature branch). A
    # worktree-aware hook must honor the payload's cwd, not its own process
    # cwd, and therefore must NOT block this push.
    run_hook "$main_repo" "$payload"
    assert_exit_code 0 "RED (issue #471): push from a feature-branch worktree must not be blocked just because the main workspace sits on main"
    echo "PASS: push from a feature-branch worktree is allowed (exit 0)"
}

test_guard_blocks_explicit_push_to_main_from_feature_branch() {
    local repo
    repo="$(make_repo feat/example)"
    local payload
    payload="$(payload_with_cwd "git push origin main" "$repo")"

    run_hook "$repo" "$payload"
    assert_exit_code 2 "guard: 'git push origin main' must always be blocked, even from a feature branch"
    echo "PASS: guard blocks explicit push to main refspec from a feature branch (exit 2)"
}

test_fallback_blocks_push_when_cwd_field_missing() {
    local repo
    repo="$(make_repo main)"
    local payload
    payload="$(payload_without_cwd "git push")"

    run_hook "$repo" "$payload"
    assert_exit_code 2 "fallback: a payload with no 'cwd' field at all must degrade to today's protective blocking, never to 'allow'"
    echo "PASS: missing 'cwd' field falls back to protective blocking (exit 2)"
}

assert_file "$HOOK"

TESTS=(
    test_guard_blocks_push_on_main
    test_guard_allows_push_on_feature_branch
    test_red_worktree_push_is_not_blocked_by_main_workspace_branch
    test_guard_blocks_explicit_push_to_main_from_feature_branch
    test_fallback_blocks_push_when_cwd_field_missing
)

FAILED=0
for t in "${TESTS[@]}"; do
    if ! ( "$t" ); then
        FAILED=$((FAILED + 1))
    fi
done

if [[ "$FAILED" -gt 0 ]]; then
    echo "" >&2
    echo "$FAILED test(s) failed." >&2
    exit 1
fi

echo "pre-tool-use hook tests passed"
