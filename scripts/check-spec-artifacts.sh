#!/usr/bin/env bash
# check-spec-artifacts.sh — Verify that spec, STATUS, and prototype test artifacts stay in sync.
#
# Usage:
#   ./scripts/check-spec-artifacts.sh
#   ./scripts/check-spec-artifacts.sh /path/to/label-suite
#
# IMPORTANT — when to use this script:
#   Use before opening a PR, after adding/removing/renaming feature specs, and
#   after adding prototype test folders for a module.
#   CI also runs this from the validate job to catch drift early.
#
# What it checks:
#   - Every specs/[module]/NNN-feature/spec.md has a matching STATUS.md row.
#   - Every STATUS.md feature row has a matching spec directory.
#   - STATUS.md module names match feature IDs and allowed project modules.
#   - Every design/prototype/tests/[module]/ folder maps to a module tracked in STATUS.md.
#
# This is intentionally a lightweight cross-artifact harness. It does not parse
# full spec contents or assert one-to-one acceptance-criteria coverage.

set -euo pipefail

ROOT="${1:-}"
if [[ -z "$ROOT" ]]; then
    ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
else
    ROOT="$(cd "$ROOT" && pwd)"
fi

STATUS_FILE="$ROOT/specs/STATUS.md"

die() {
    echo "ERROR: $*" >&2
    exit 1
}

trim() {
    printf '%s' "$1" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//'
}

is_valid_module() {
    case "$1" in
        account|dashboard|task-management|annotation|dataset|annotator-management|admin|shared|foundation)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

status_row_for() {
    local needle="$1"
    grep -F "| $needle |" "$STATUS_FILE" || true
}

[[ -f "$STATUS_FILE" ]] || die "STATUS.md not found: $STATUS_FILE"

errors=0
tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/label-suite-artifacts.XXXXXX")"
trap 'rm -rf "$tmp_dir"' EXIT

status_ids="$tmp_dir/status-ids.txt"
spec_ids="$tmp_dir/spec-ids.txt"
test_modules="$tmp_dir/test-modules.txt"
: >"$status_ids"
: >"$spec_ids"
: >"$test_modules"

while IFS= read -r line; do
    case "$line" in
        "| "*)
            IFS='|' read -r _ raw_id raw_feature raw_module raw_status raw_branch _rest <<EOF
$line
EOF
            id="$(trim "$raw_id")"
            module="$(trim "$raw_module")"
            status="$(trim "$raw_status")"
            branch="$(trim "$raw_branch")"

            if [[ "$id" =~ ^[a-z-]+-[0-9][0-9][0-9]$ ]]; then
                number="${id##*-}"
                expected_prefix="${id%-*}"
                if [[ "$module" != "$expected_prefix" ]]; then
                    echo "ERROR: STATUS.md module mismatch for $id: expected $expected_prefix, got $module" >&2
                    errors=$((errors + 1))
                fi
                if ! is_valid_module "$module"; then
                    echo "ERROR: STATUS.md uses invalid module for $id: $module" >&2
                    errors=$((errors + 1))
                fi
                printf '%s|%s|%s|%s\n' "$module" "$number" "$status" "$branch" >>"$status_ids"
            fi
            ;;
    esac
done <"$STATUS_FILE"

if [[ ! -s "$status_ids" ]]; then
    echo "ERROR: No feature rows found in specs/STATUS.md" >&2
    errors=$((errors + 1))
fi

duplicates="$(cut -d'|' -f1,2 "$status_ids" | sort | uniq -d)"
if [[ -n "$duplicates" ]]; then
    echo "ERROR: Duplicate STATUS.md feature IDs:" >&2
    echo "$duplicates" >&2
    errors=$((errors + 1))
fi

while IFS= read -r spec_file; do
    spec_dir="$(dirname "$spec_file")"
    feature_name="$(basename "$spec_dir")"
    module="$(basename "$(dirname "$spec_dir")")"
    number="${feature_name%%-*}"
    id="$module-$number"

    if ! is_valid_module "$module"; then
        echo "ERROR: Spec lives under invalid module: $module/$feature_name" >&2
        errors=$((errors + 1))
        continue
    fi

    printf '%s|%s\n' "$module" "$number" >>"$spec_ids"

    row="$(status_row_for "$id")"
    if [[ -z "$row" ]]; then
        echo "ERROR: Missing STATUS.md row for spec: $module/$feature_name" >&2
        errors=$((errors + 1))
    fi
done < <(find "$ROOT/specs" -mindepth 3 -maxdepth 3 -path '*/[0-9][0-9][0-9]-*/spec.md' -print | sort)

while IFS='|' read -r module number _status _branch; do
    [[ -n "$module" ]] || continue
    if ! grep -Fq "$module|$number" "$spec_ids"; then
        echo "ERROR: STATUS.md row has no matching spec directory: $module-$number" >&2
        errors=$((errors + 1))
    fi
done <"$status_ids"

tests_root="$ROOT/design/prototype/tests"
if [[ -d "$tests_root" ]]; then
    find "$tests_root" -mindepth 1 -maxdepth 1 -type d -print | while IFS= read -r module_dir; do
        module="$(basename "$module_dir")"
        printf '%s\n' "$module" >>"$test_modules"
    done

    while IFS= read -r module; do
        [[ -n "$module" ]] || continue
        if ! is_valid_module "$module"; then
            echo "ERROR: Prototype tests live under invalid module: $module" >&2
            errors=$((errors + 1))
            continue
        fi
        if ! grep -Fq "$module|" "$status_ids"; then
            echo "ERROR: Prototype test module has no STATUS.md feature rows: $module" >&2
            errors=$((errors + 1))
        fi
    done <"$test_modules"
fi

if (( errors > 0 )); then
    exit 1
fi

echo "Spec artifact check passed"
