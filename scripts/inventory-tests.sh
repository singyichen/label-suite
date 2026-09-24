#!/usr/bin/env bash
# inventory-tests.sh — Regression tests for the screen inventory generator.
#
# Usage:
#   ./scripts/inventory-tests.sh
#   bash scripts/inventory-tests.sh
#
# IMPORTANT — when to use this script:
#   Use after changing scripts/gen-screen-inventory.mjs,
#   design/system/inventory-manifest.json, or any design/prototype/pages/**
#   screen file. It is the local gate that keeps design/system/screen-inventory.md
#   provably regenerable from the manifest.
#
# What it checks:
#   - The generator runs clean against the real repo (exit 0).
#   - `--check` passes, i.e. the committed screen-inventory.md is byte-identical
#     to a fresh render (this doubles as the prototype-vs-inventory stale check).
#   - The generator is deterministic (two runs produce identical output).
#   - Manifest/disk coverage drift is detected: an unlisted screen file fails,
#     and a manifest entry pointing at a missing file fails.
#   - Broken manifest references (spec dir, page design doc, test glob) fail.
#
# This harness deliberately exercises the real manifest instead of fixtures so a
# drifting prototype is caught by the same command reviewers run.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GEN="$ROOT/scripts/gen-screen-inventory.mjs"
MANIFEST="$ROOT/design/system/inventory-manifest.json"
OUT="$ROOT/design/system/screen-inventory.md"
TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/label-suite-inventory.XXXXXX")"
TMP_ROOT="$(cd "$TMP_ROOT" && pwd)"

STRAY=""
PERTURB_FILE=""
PERTURB_BACKUP=""
cleanup() {
    [[ -n "$STRAY" && -f "$STRAY" ]] && rm -f "$STRAY"
    [[ -n "$PERTURB_FILE" && -n "$PERTURB_BACKUP" && -f "$PERTURB_BACKUP" ]] && cp "$PERTURB_BACKUP" "$PERTURB_FILE"
    rm -rf "$TMP_ROOT"
}
trap cleanup EXIT

pass() { echo "PASS: $1"; }

fail() {
    echo "FAIL: $1" >&2
    exit 1
}

# Runs the generator with a temporarily patched manifest and asserts it exits non-zero.
expect_manifest_failure() {
    local name="$1"
    local patched="$2"
    local backup="$TMP_ROOT/manifest.backup.json"

    cp "$MANIFEST" "$backup"
    printf '%s' "$patched" > "$MANIFEST"
    if node "$GEN" --check >/dev/null 2>&1; then
        cp "$backup" "$MANIFEST"
        fail "$name — generator accepted an invalid manifest"
    fi
    cp "$backup" "$MANIFEST"
    pass "$name"
}

[[ -f "$GEN" ]] || fail "generator not found: scripts/gen-screen-inventory.mjs"
[[ -f "$MANIFEST" ]] || fail "manifest not found: design/system/inventory-manifest.json"

# 1. Committed output is up to date with the manifest and the prototype.
if ! node "$GEN" --check >/dev/null 2>&1; then
    fail "screen-inventory.md is stale — run: node scripts/gen-screen-inventory.mjs"
fi
pass "--check passes against the committed screen-inventory.md"

# 2. Rendering is deterministic.
node "$GEN" --stdout > "$TMP_ROOT/run1.md"
node "$GEN" --stdout > "$TMP_ROOT/run2.md"
if ! diff -q "$TMP_ROOT/run1.md" "$TMP_ROOT/run2.md" >/dev/null; then
    fail "generator output is not deterministic"
fi
pass "generator output is deterministic"

# 3. The rendered output matches the file on disk.
if ! diff -q "$TMP_ROOT/run1.md" "$OUT" >/dev/null; then
    fail "--stdout output differs from design/system/screen-inventory.md"
fi
pass "--stdout matches the committed file"

# 4. An unlisted screen file must fail the coverage check.
STRAY="$ROOT/design/prototype/pages/account/zz-inventory-test-stray.html"
printf '<!doctype html><title>stray</title>\n' > "$STRAY"
if node "$GEN" --check >/dev/null 2>&1; then
    rm -f "$STRAY"; STRAY=""
    fail "coverage check did not detect an unlisted screen file"
fi
rm -f "$STRAY"; STRAY=""
pass "coverage check detects an unlisted screen file"

# 6. issue #943 regression — a git history that merely advances (a commit that
# touches a PROTOTYPE_SOURCES path but nets out to the same bytes, e.g. a
# rebase replaying an identical diff under a new SHA) must not turn the gate
# red. Exercised in a disposable local clone so the real working tree and its
# history are never touched.
CLONE_DIR="$TMP_ROOT/history-advance-clone"
git clone --quiet --local "$ROOT" "$CLONE_DIR"
git -C "$CLONE_DIR" config user.email "inventory-tests@label-suite.invalid"
git -C "$CLONE_DIR" config user.name "inventory-tests"
CLONE_INDEX="$CLONE_DIR/design/prototype/index.html"
CLONE_GEN="$CLONE_DIR/scripts/gen-screen-inventory.mjs"
if ! node "$CLONE_GEN" --check >/dev/null 2>&1; then
    fail "clone setup is not at a fresh baseline — cannot exercise the regression"
fi
printf '\n<!-- inventory-tests: transient perturbation -->\n' >> "$CLONE_INDEX"
git -C "$CLONE_DIR" commit -aqm 'test: perturb prototype content'
git -C "$CLONE_DIR" checkout -q HEAD~1 -- design/prototype/index.html
git -C "$CLONE_DIR" commit -aqm 'test: revert prototype content'
# Content is now byte-identical to the fresh baseline again, but two new
# commits touch design/prototype/index.html — HEAD advanced without a net
# content change.
if ! node "$CLONE_GEN" --check >/dev/null 2>&1; then
    fail "a commit that advances history without changing prototype content wrongly marks the inventory stale (issue #943)"
fi
pass "a commit touching prototype content with no net byte change does not go stale (issue #943)"

# 7. issue #943 regression, complementary direction — a real content change
# that is never regenerated must still be caught, so the switch to content
# hashing does not also make the gate blind to genuine drift.
PERTURB_FILE="$ROOT/design/prototype/index.html"
PERTURB_BACKUP="$TMP_ROOT/index.html.orig"
cp "$PERTURB_FILE" "$PERTURB_BACKUP"
printf '\n<!-- inventory-tests: unregenerated content change -->\n' >> "$PERTURB_FILE"
if node "$GEN" --check >/dev/null 2>&1; then
    cp "$PERTURB_BACKUP" "$PERTURB_FILE"
    fail "a real prototype content change without regenerating the inventory is not caught (issue #943)"
fi
cp "$PERTURB_BACKUP" "$PERTURB_FILE"
pass "a real prototype content change without regeneration is still caught (issue #943)"

# 5. Broken manifest references must fail.
expect_manifest_failure "missing page file is rejected" \
    "$(node -e '
const fs=require("fs");const m=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
m.screens[0].page="pages/account/does-not-exist.html";
process.stdout.write(JSON.stringify(m,null,2)+"\n");' "$MANIFEST")"

expect_manifest_failure "missing spec directory is rejected" \
    "$(node -e '
const fs=require("fs");const m=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
m.screens[0].specs=["specs/account/999-not-a-spec"];
process.stdout.write(JSON.stringify(m,null,2)+"\n");' "$MANIFEST")"

expect_manifest_failure "missing page design doc is rejected" \
    "$(node -e '
const fs=require("fs");const m=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
m.screens[0].design="design/system/pages/does-not-exist.md";
process.stdout.write(JSON.stringify(m,null,2)+"\n");' "$MANIFEST")"

expect_manifest_failure "test glob matching nothing is rejected" \
    "$(node -e '
const fs=require("fs");const m=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
m.screens[0].tests=["design/prototype/tests/account/no-such-*.spec.ts"];
process.stdout.write(JSON.stringify(m,null,2)+"\n");' "$MANIFEST")"

expect_manifest_failure "unknown component key is rejected" \
    "$(node -e '
const fs=require("fs");const m=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
m.screens[0].components.push("no-such-component");
process.stdout.write(JSON.stringify(m,null,2)+"\n");' "$MANIFEST")"

echo
echo "All inventory generator tests passed."
