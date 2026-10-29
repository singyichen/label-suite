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

# Sentinel stubs: every command the fixtures name is shadowed on PATH by a
# stub that logs the call and fails. The hook only greps the command string,
# so the log must stay empty -- if it ever fills, a fixture was executed
# instead of inspected, and the run fails before anything real could fire.
SENTINEL_BIN="$TMP_ROOT/sentinel-bin"
SENTINEL_LOG="$TMP_ROOT/sentinel-executed.log"
mkdir -p "$SENTINEL_BIN"
for name in pip npm uv python python3.12 psql terraform dd mkfs.ext4 find chmod ssh sudo timeout nohup nice xargs docker docker-compose; do
    printf '#!/bin/sh\necho "%s $*" >> "%s"\nexit 99\n' "$name" "$SENTINEL_LOG" > "$SENTINEL_BIN/$name"
    chmod +x "$SENTINEL_BIN/$name"
done
export PATH="$SENTINEL_BIN:$PATH"

# Self-check: prove the stubs actually shadow the real binaries.
if docker version >/dev/null 2>&1 || [[ ! -s "$SENTINEL_LOG" ]]; then
    echo "FAIL: sentinel stubs are not shadowing PATH" >&2
    exit 1
fi
rm -f "$SENTINEL_LOG"

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

test_fallback_blocks_push_when_cwd_resolves_to_no_branch() {
    local non_repo_dir main_repo
    non_repo_dir="$(mktemp -d "$TMP_ROOT/non-repo.XXXXXX")"
    main_repo="$(make_repo main)"
    local payload
    payload="$(payload_with_cwd "git push" "$non_repo_dir")"

    # Regression: a payload "cwd" that is present but resolves to no git
    # branch (not a repo, a nonexistent path, or a detached HEAD) makes
    # `git -C "$CWD" branch --show-current` yield an empty string. If the
    # hook trusts that empty BRANCH as "not main/master", the push is
    # wrongly ALLOWED — even though the hook process itself is spawned from
    # inside a repo checked out on main. This is strictly weaker than the
    # pre-fix behavior, which fell back to the hook's own process cwd and
    # correctly blocked.
    run_hook "$main_repo" "$payload"
    assert_exit_code 2 "fallback: a payload 'cwd' that exists but resolves to no git branch must degrade to protective blocking, never to 'allow'"
    echo "PASS: unresolvable 'cwd' branch falls back to protective blocking (exit 2)"
}

test_red_git_dash_c_push_from_main_is_blocked() {
    local main_repo feature_repo
    main_repo="$(make_repo main)"
    feature_repo="$(make_repo feat/example)"
    local payload
    payload="$(payload_with_cwd "git -C $main_repo push -u origin HEAD" "$feature_repo")"

    # The guard anchors on the literal token pair `git push`, so any git
    # global option placed between them (-C, -c, --git-dir, --no-pager)
    # slips past it entirely. Here the payload cwd sits on a feature branch
    # -- so cwd-based detection says "allow" -- while -C aims the push at a
    # repo checked out on main. The directory the push actually acts on is
    # the one named by -C, so that is the branch the guard must read.
    run_hook "$feature_repo" "$payload"
    assert_exit_code 2 "guard: 'git -C <main-repo> push' must be blocked even when the payload cwd sits on a feature branch"
    echo "PASS: guard blocks push aimed at a main-branch repo via -C (exit 2)"
}

test_red_git_dash_c_explicit_main_refspec_is_blocked() {
    local repo
    repo="$(make_repo feat/example)"
    local payload
    payload="$(payload_with_cwd "git -C $repo push origin main" "$repo")"

    # Same anchor defect in the refspec check: the bare form is blocked,
    # the same push behind a global option is not.
    run_hook "$repo" "$payload"
    assert_exit_code 2 "guard: an explicit main refspec must be blocked regardless of git global options before the subcommand"
    echo "PASS: guard blocks explicit main refspec behind a global option (exit 2)"
}

test_red_git_dash_c_force_push_is_blocked() {
    local repo
    repo="$(make_repo feat/example)"
    local payload
    payload="$(payload_with_cwd "git -C $repo push --force origin HEAD" "$repo")"

    # Same anchor defect in the force-push check.
    run_hook "$repo" "$payload"
    assert_exit_code 2 "guard: force push must be blocked regardless of git global options before the subcommand"
    echo "PASS: guard blocks force push behind a global option (exit 2)"
}

test_red_cd_into_feature_worktree_then_push_is_allowed() {
    local main_repo worktree_path feature_branch="feat/cd-example"
    main_repo="$(make_repo main)"
    worktree_path="$(mktemp -d "$TMP_ROOT/cd-worktree.XXXXXX")"
    rmdir "$worktree_path"
    git -C "$main_repo" worktree add -q -b "$feature_branch" "$worktree_path"

    local payload
    payload="$(payload_with_cwd "cd $worktree_path && git push -u origin HEAD" "$main_repo")"

    # The false positive that motivates the bypass: a subagent's payload cwd
    # is pinned to the repo root (main) no matter where it cd's, so a
    # legitimate push from a feature-branch worktree is blocked. When the
    # command cd's into a directory before pushing, that directory -- not
    # the payload cwd -- is where the push runs.
    run_hook "$main_repo" "$payload"
    assert_exit_code 0 "guard: cd into a feature-branch worktree before pushing must not be blocked just because the payload cwd sits on main"
    echo "PASS: push after cd into a feature-branch worktree is allowed (exit 0)"
}

test_force_with_lease_is_allowed() {
    local repo
    repo="$(make_repo feat/example)"
    local payload
    payload="$(payload_with_cwd "git push --force-with-lease origin HEAD" "$repo")"

    # Characterization: --force-with-lease is the sanctioned way to rewrite a
    # pushed feature branch and must stay allowed. The force check excludes
    # it by requiring whitespace or end-of-string right after --force, so this
    # locks in the boundary the check's own regex draws.
    run_hook "$repo" "$payload"
    assert_exit_code 0 "guard: --force-with-lease is the safe form and must stay allowed"
    echo "PASS: --force-with-lease push is allowed (exit 0)"
}

test_prose_mentioning_a_push_is_not_a_push() {
    local repo
    repo="$(make_repo main)"
    local payload
    payload="$(payload_with_cwd "echo 'run git push --force if stuck'" "$repo")"

    # Regression: text that merely names a push -- a commit message, a PR
    # reply, this file's own fixtures -- is not a push. The unanchored force
    # check read any string containing both words as a force push, and
    # blocked the very commit that added these fixtures. Verified failing
    # (exit 2) against the pre-fix hook.
    run_hook "$repo" "$payload"
    assert_exit_code 0 "guard: prose that merely mentions a push must not be read as one"
    echo "PASS: prose mentioning a push is not blocked (exit 0)"
}

test_other_git_subcommands_are_not_pushes() {
    local repo
    repo="$(make_repo main)"
    local payload
    payload="$(payload_with_cwd "git log --grep push --oneline" "$repo")"

    # Characterization: the guard matches `git <global opts>* push` with the
    # options whitelisted, not `git <anything> push`. The permissive form
    # would fire here, on a read-only command run from main.
    run_hook "$repo" "$payload"
    assert_exit_code 0 "guard: a non-push git subcommand whose arguments contain the word push must be allowed"
    echo "PASS: 'git log --grep push' is not treated as a push (exit 0)"
}

# Runs the hook from a throwaway feature-branch repo so only the non-push
# checks can decide the outcome. $1 = command, $2 = expected exit, $3 = desc.
expect_command() {
    local repo
    repo="$(make_repo feat/example)"
    run_hook "$repo" "$(payload_with_cwd "$1" "$repo")"
    assert_exit_code "$2" "$3"
    echo "PASS: $3 (exit $2)"
}

test_package_manager_install_is_still_blocked() {
    # Characterization: anchoring must not loosen the real cases, including
    # the wrapped forms that hand the install to another program.
    expect_command "pip install requests" 2 "a bare pip install is blocked"
    expect_command "cd frontend && npm install" 2 "npm install after a separator is blocked"
    expect_command "uv pip install requests" 2 "uv pip install is blocked"
    expect_command "python -m pip install requests" 2 "python -m pip install is blocked"
    expect_command "sudo pip install requests" 2 "sudo pip install is blocked"
    expect_command "ssh lab-host 'npm install'" 2 "npm install quoted for ssh is blocked"
}

test_red_wrapped_package_manager_install_is_blocked() {
    # Security review on #1492: the first anchored version dropped every
    # wrapper the old \b match caught. Anchoring may only narrow prose,
    # never a real invocation.
    expect_command "env PIP_INDEX_URL=x pip install requests" 2 "pip install behind env is blocked"
    expect_command "CI=1 npm install" 2 "npm install behind an env assignment is blocked"
    expect_command "time npm install" 2 "npm install behind time is blocked"
    expect_command "nohup npm install" 2 "npm install behind nohup is blocked"
    expect_command "timeout 60 pip install requests" 2 "pip install behind timeout is blocked"
    expect_command "sudo -E pip install requests" 2 "pip install behind sudo with a flag is blocked"
    expect_command "/usr/bin/pip install requests" 2 "pip install by absolute path is blocked"
    expect_command "python3.12 -m pip install requests" 2 "pip install via python3.12 -m is blocked"
    expect_command "( cd frontend && npm install )" 2 "npm install inside a subshell is blocked"
    expect_command "if true; then pip install requests; fi" 2 "pip install after then is blocked"
}

test_red_prose_mentioning_package_manager_install_is_allowed() {
    # Issue #1487: the unanchored check blocked any command whose text named
    # the wrong package managers -- including the gh call that opened #1487.
    expect_command "git commit -m \\\"docs: explain why pip install is blocked\\\"" 0 "a commit message naming pip install is allowed"
    expect_command "gh issue comment 1 --body \\\"Never run npm install here\\\"" 0 "an issue comment naming npm install is allowed"
}

test_destructive_commands_are_still_blocked() {
    # Characterization: SQL and remote commands sit inside quotes, so an
    # opening quote must keep counting as command position.
    expect_command "psql -c \\\"DROP TABLE users\\\"" 2 "DROP TABLE quoted for psql is blocked"
    expect_command "psql -c \\\"BEGIN; drop database app\\\"" 2 "drop database after a SQL separator is blocked"
    expect_command "ssh lab-host 'terraform destroy'" 2 "terraform destroy quoted for ssh is blocked"
    expect_command "sudo dd if=disk.img of=/dev/sda" 2 "dd writing to a device is blocked"
    expect_command "sudo mkfs.ext4 /dev/sdb1" 2 "mkfs is blocked"
    expect_command "find . -name '*.pyc' -delete" 2 "find -delete is blocked"
    expect_command "chmod -R 777 /" 2 "chmod -R 777 / is blocked"
}

test_red_wrapped_destructive_commands_are_blocked() {
    # Security review on #1492: same wrapper gap in EXTRA_PATTERNS.
    expect_command "terraform -chdir=infra destroy" 2 "terraform destroy behind a global option is blocked"
    expect_command "TF_LOG=1 terraform destroy" 2 "terraform destroy behind an env assignment is blocked"
    expect_command "timeout 600 terraform destroy -auto-approve" 2 "terraform destroy behind timeout is blocked"
    expect_command "sudo -n dd if=disk.img of=/dev/sda" 2 "dd behind sudo with a flag is blocked"
    expect_command "/sbin/mkfs.ext4 /dev/sdb1" 2 "mkfs by absolute path is blocked"
    expect_command "{ find /data -delete; }" 2 "find -delete inside a brace group is blocked"
}

test_red_prose_mentioning_destructive_commands_is_allowed() {
    # Issue #1487: EXTRA_PATTERNS matched anywhere in the command string.
    expect_command "git commit -m \\\"docs: never run terraform destroy from CI\\\"" 0 "a commit message naming terraform destroy is allowed"
    expect_command "gh pr comment 1 --body \\\"The hook blocks DROP TABLE and mkfs.ext4\\\"" 0 "a PR comment naming DROP TABLE and mkfs is allowed"
    expect_command "echo 'avoid find with -delete here'" 0 "prose naming find -delete is allowed"
}

assert_file "$HOOK"

TESTS=(
    test_guard_blocks_push_on_main
    test_guard_allows_push_on_feature_branch
    test_red_worktree_push_is_not_blocked_by_main_workspace_branch
    test_guard_blocks_explicit_push_to_main_from_feature_branch
    test_fallback_blocks_push_when_cwd_field_missing
    test_fallback_blocks_push_when_cwd_resolves_to_no_branch
    test_red_git_dash_c_push_from_main_is_blocked
    test_red_git_dash_c_explicit_main_refspec_is_blocked
    test_red_git_dash_c_force_push_is_blocked
    test_red_cd_into_feature_worktree_then_push_is_allowed
    test_force_with_lease_is_allowed
    test_prose_mentioning_a_push_is_not_a_push
    test_other_git_subcommands_are_not_pushes
    test_package_manager_install_is_still_blocked
    test_red_wrapped_package_manager_install_is_blocked
    test_red_prose_mentioning_package_manager_install_is_allowed
    test_destructive_commands_are_still_blocked
    test_red_wrapped_destructive_commands_are_blocked
    test_red_prose_mentioning_destructive_commands_is_allowed
)

FAILED=0
for t in "${TESTS[@]}"; do
    if ! ( "$t" ); then
        FAILED=$((FAILED + 1))
    fi
done

if [[ -s "$SENTINEL_LOG" ]]; then
    echo "FAIL: a fixture command was executed instead of inspected:" >&2
    cat "$SENTINEL_LOG" >&2
    FAILED=$((FAILED + 1))
fi

if [[ "$FAILED" -gt 0 ]]; then
    echo "" >&2
    echo "$FAILED test(s) failed." >&2
    exit 1
fi

echo "pre-tool-use hook tests passed"
