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
INVENTORY="$ROOT/design/system/inventory.md"
GATE_STRAY="$ROOT/design/prototype/pages/shared/zz-inventory-test-stray.js"
GATE_MANIFEST_BAK=""
GATE_INV_BAK=""
cleanup() {
    [[ -f "$GATE_STRAY" ]] && rm -f "$GATE_STRAY"
    [[ -n "$GATE_MANIFEST_BAK" && -f "$GATE_MANIFEST_BAK" ]] && cp "$GATE_MANIFEST_BAK" "$MANIFEST"
    [[ -n "$GATE_INV_BAK" && -f "$GATE_INV_BAK" ]] && cp "$GATE_INV_BAK" "$INVENTORY"
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

# 8. issue #1188 — class-scan gate and inventory heading parity. Every case
# mutates a real file temporarily; gate_restore() (and the EXIT trap) put the
# manifest / inventory.md back and remove the stray scan file. Each failing
# expectation asserts BOTH a non-zero exit AND a specific stderr marker, so a
# generator that dies for an unrelated reason cannot satisfy the case.
GATE_MANIFEST_BAK="$TMP_ROOT/manifest.gate.json"
GATE_INV_BAK="$TMP_ROOT/inventory.gate.md"
cp "$MANIFEST" "$GATE_MANIFEST_BAK"
cp "$INVENTORY" "$GATE_INV_BAK"

gate_restore() {
    cp "$GATE_MANIFEST_BAK" "$MANIFEST"
    cp "$GATE_INV_BAK" "$INVENTORY"
    rm -f "$GATE_STRAY"
}

# Prints a manifest value (JS expression over `m`). Exits the harness when the
# field is absent — a missing field must never degrade into an empty value that
# lets a "must fail" case pass vacuously.
manifest_value() {
    local expr="$1" rc=0 out
    out="$(node -e '
const fs=require("fs");const m=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
let v;try{v=eval(process.argv[2]);}catch(e){v=undefined;}
if(v===undefined||v===null||v===""){console.error("precondition: manifest field missing: "+process.argv[2]);process.exit(3);}
process.stdout.write(String(v));' "$MANIFEST" "$expr")" || rc=$?
    [[ $rc -eq 0 ]] || fail "precondition: manifest field missing or empty: $expr"
    printf '%s' "$out"
}

# Applies a JS mutation body to the manifest (object `m`; need(cond,msg) exits 3
# on a missing precondition) and writes the result back to the real manifest.
patch_manifest() {
    local body="$1" rc=0 out
    out="$(node -e '
const fs=require("fs");const m=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
function need(c,msg){if(!c){console.error("precondition: "+msg);process.exit(3);}}
'"$body"'
process.stdout.write(JSON.stringify(m,null,2)+"\n");' "$MANIFEST")" || rc=$?
    [[ $rc -eq 0 ]] || fail "precondition: manifest patch could not be applied (field absent): $body"
    printf '%s' "$out" > "$MANIFEST"
}

write_stray() { printf '%s\n' "$1" > "$GATE_STRAY"; }

expect_gate_failure() {
    local name="$1" marker="$2" rc=0 err="$TMP_ROOT/err.txt"
    node "$GEN" --check >/dev/null 2>"$err" || rc=$?
    if [[ $rc -eq 0 ]]; then
        gate_restore
        fail "$name — --check exited 0 (gate missing)"
    fi
    if ! /usr/bin/grep -qF -- "$marker" "$err"; then
        local seen; seen="$(head -c 600 "$err")"
        gate_restore
        fail "$name — exit $rc but stderr lacks marker '$marker'; stderr: $seen"
    fi
    gate_restore
    pass "$name"
}

expect_gate_success() {
    local name="$1" rc=0 err="$TMP_ROOT/err.txt"
    # --stdout runs the full validation (scan + headings) but skips the stale
    # comparison: a stray page file legitimately changes the prototype content
    # hash (issue #943), which would make --check report "stale" regardless.
    node "$GEN" --stdout >/dev/null 2>"$err" || rc=$?
    if [[ $rc -ne 0 ]]; then
        local seen; seen="$(head -c 600 "$err")"
        gate_restore
        fail "$name — --stdout exit $rc; stderr: $seen"
    fi
    if /usr/bin/grep -qF -- "unregistered" "$err"; then
        local seen; seen="$(head -c 600 "$err")"
        gate_restore
        fail "$name — stderr reports an unregistered class: $seen"
    fi
    gate_restore
    pass "$name"
}

# 8a. A class used by a prototype page but registered nowhere fails the scan.
write_stray "const x = '<div class=\"zzstray-widget\"></div>';"
expect_gate_failure "unregistered class in a class attribute is rejected (issue #1188)" "zzstray-widget"
write_stray "document.body.classList.add('zzstray-other');"
expect_gate_failure "unregistered class in classList.add is rejected (issue #1188)" "zzstray-other"

# 8b. Classes under a registered / transitional / page-local prefix still pass.
BTN_PREFIX="$(manifest_value 'm.classScan.componentClasses.button[0]')"
# The real manifest may carry no transitional entries (issue #1189 empties it),
# so the transitional cases seed their own entry instead of reading [0].
TRANS_PREFIX="zztrans"
PAGE_PREFIX="$(manifest_value 'm.classScan.pageLocalClasses.classes[0]')"
write_stray "const x = '<div class=\"${BTN_PREFIX}-zz\"></div>';"
expect_gate_success "class under a componentClasses prefix passes (issue #1188)"
patch_manifest '
need(Array.isArray(m.classScan&&m.classScan.transitionalClasses),"classScan.transitionalClasses");
m.classScan.transitionalClasses.push({component:"empty-state",classes:["zztrans"],reason:"Seeded transitional entry for the gate test (#1189)."});'
write_stray "const x = '<div class=\"${TRANS_PREFIX}-zz\"></div>';"
expect_gate_success "class under a transitionalClasses prefix passes (issue #1188)"
write_stray "const x = '<div class=\"${PAGE_PREFIX}-zz\"></div>';"
expect_gate_success "class under a pageLocalClasses prefix passes (issue #1188)"

# 8c. A registry key with no class coverage fails; a new key with no heading fails.
patch_manifest '
need(m.classScan&&m.classScan.componentClasses&&m.classScan.componentClasses.button,"classScan.componentClasses.button");
need(m.classScan.transitionalClasses&&m.classScan.classlessComponents,"classScan.transitionalClasses/classlessComponents");
delete m.classScan.componentClasses.button;
delete m.classScan.classlessComponents.button;
m.classScan.transitionalClasses=m.classScan.transitionalClasses.filter(t=>t.component!=="button");'
expect_gate_failure "registry key without class coverage is rejected (issue #1188)" "registry key has no class coverage"
patch_manifest '
need(m.inventoryHeadings,"inventoryHeadings");
m.componentRegistry["zz-new-component"]="Zz New Component";'
expect_gate_failure "registry key without inventory heading is rejected (issue #1188)" "zz-new-component"

# 8d. Exceptions must carry a reason; transitional ones must point at #1189.
patch_manifest '
need(m.classScan&&m.classScan.classlessComponents,"classScan.classlessComponents");
const k=Object.keys(m.classScan.classlessComponents)[0];
need(k,"classScan.classlessComponents has an entry");
m.classScan.classlessComponents[k]="";'
CLASSLESS_KEY="$(manifest_value 'Object.keys(m.classScan.classlessComponents)[0]')"
expect_gate_failure "classlessComponents entry with empty reason is rejected (issue #1188)" "$CLASSLESS_KEY"
patch_manifest '
need(Array.isArray(m.classScan&&m.classScan.transitionalClasses),"classScan.transitionalClasses");
m.classScan.transitionalClasses.push({component:"empty-state",classes:["zztrans"],reason:"no pointer"});'
expect_gate_failure "transitional reason without #1189 is rejected (issue #1188)" "#1189"

# 8e. inventory.md headings must be 1:1 with the registry via inventoryHeadings.
node -e '
const fs=require("fs");const p=process.argv[1];
const t=fs.readFileSync(p,"utf8");
if(!t.includes("### ✅ Button\n")){console.error("precondition: heading ### ✅ Button not found");process.exit(3);}
fs.writeFileSync(p,t.replace("### ✅ Button\n","### ✅ Buttonn\n"));' "$INVENTORY" || fail "precondition: inventory.md has no '### ✅ Button' heading"
expect_gate_failure "renamed inventory heading is rejected (issue #1188)" "Buttonn"
node -e '
const fs=require("fs");const p=process.argv[1];
const t=fs.readFileSync(p,"utf8");
if(!/^### ✅ Skeleton\n/m.test(t)){console.error("precondition: heading ### ✅ Skeleton not found");process.exit(3);}
fs.writeFileSync(p,t.replace(/^### ✅ Skeleton\n/m,""));' "$INVENTORY" || fail "precondition: inventory.md has no '### ✅ Skeleton' heading"
expect_gate_failure "deleted inventory heading is rejected (issue #1188)" "Skeleton"
printf '\n### ✅ Zz Extra Component\n' >> "$INVENTORY"
expect_gate_failure "extra inventory heading is rejected (issue #1188)" "Zz Extra Component"
patch_manifest '
need(m.inventoryHeadings&&m.inventoryHeadings.Button,"inventoryHeadings.Button");
m.inventoryHeadings.Button="no-such-registry-key";'
expect_gate_failure "inventoryHeadings entry with unknown registry key is rejected (issue #1188)" "no-such-registry-key"

# 8f. The unmodified repo passing --check is covered by step 1.

echo
echo "All inventory generator tests passed."
