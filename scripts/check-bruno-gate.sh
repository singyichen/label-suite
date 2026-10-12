#!/usr/bin/env bash
# check-bruno-gate.sh — Enforce the FR-131 route-to-Bruno update contract.

set -euo pipefail
trap 'trap - ERR; exit 1' ERR

repo_root="$(git rev-parse --show-toplevel)"

if [[ "$#" -eq 0 ]]; then
    changed_files="$({
        git diff --cached --name-only
        git diff --name-only
    } | LC_ALL=C sort -u)"
    exemption_log_args=(-1)
elif [[ "$#" -eq 2 && "$1" == "--base" ]]; then
    changed_files="$(git diff --name-only "$2"...HEAD)"
    exemption_log_args=(--no-merges "$2..HEAD")
else
    echo "FR-131 gate: usage: scripts/check-bruno-gate.sh [--base <ref>]" >&2
    exit 1
fi

bru_files="$(printf '%s\n' "$changed_files" | grep '\.bru$' | grep -v '^backend/bruno/environments/' || true)"
route_files="$(printf '%s\n' "$changed_files" | grep -E '^backend/app/modules/[^/]+/router(\.py|/.*\.py)$' || true)"

# FR-131: route changes must include a matching Bruno update for the same module.
if [[ -n "$route_files" && -z "$bru_files" ]]; then
    if git log "${exemption_log_args[@]}" --pretty=%B 2>/dev/null | grep -qF "FR-131-exempt: skeleton-only route"; then
        echo "FR-131 gate: Route changes detected without Bruno updates, but exemption marker found in commit message. Bypassing."
    else
        echo "FR-131 gate: route files changed without backend/bruno/ update. Add .bru update or include 'FR-131-exempt: skeleton-only route' in the commit message"
        exit 1
    fi
fi

# Split routers require a Bruno update in the matching feature directory.
if [[ -n "$route_files" && -n "$bru_files" ]]; then
    while IFS= read -r route_file; do
        module="$(printf '%s\n' "$route_file" | sed -n 's|^backend/app/modules/\([^/]*\)/.*|\1|p')"
        feature="$(printf '%s\n' "$route_file" | sed -n 's|^backend/app/modules/[^/]*/router/\([^.]*\)[.]py$|\1|p')"
        matching_bru=0

        while IFS= read -r bru_file; do
            if [[ -n "$feature" && "$bru_file" == "backend/bruno/$module/$feature/"* ]]; then
                matching_bru=1
                break
            fi
            if [[ -z "$feature" && "$bru_file" == "backend/bruno/$module/"* ]]; then
                matching_bru=1
                break
            fi
        done <<< "$bru_files"

        if [[ "$matching_bru" -eq 0 && -n "$feature" ]]; then
            echo "FR-131 gate: route changed in module '$module/$feature' but no matching backend/bruno/$module/$feature/ update found"
            exit 1
        fi
        if [[ "$matching_bru" -eq 0 ]]; then
            echo "FR-131 gate: route changed in module '$module' but no matching backend/bruno/$module/ update found"
            exit 1
        fi
    done < <(printf '%s\n' "$route_files")
fi

# Validate each touched endpoint .bru file that still exists.
if [[ -n "$bru_files" ]]; then
    while IFS= read -r bru_file; do
        absolute_path="$repo_root/$bru_file"
        if [[ -f "$absolute_path" ]]; then
            if [[ ! "$bru_file" =~ ^backend/bruno/[^/]+/[^/]+/[^/]+[.]bru$ ]]; then
                echo "Bruno path error: $bru_file must be backend/bruno/<module>/<feature>/<api>.bru"
                exit 1
            fi
            if ! grep -q 'meta {' "$absolute_path" || ! grep -qE '^[[:space:]]*(get|post|put|patch|delete|head)[[:space:]]*\{' "$absolute_path"; then
                echo "Bruno structure error: $bru_file missing meta or method block"
                exit 1
            fi
        fi
    done < <(printf '%s\n' "$bru_files")
    echo "Bruno .bru structure check passed"
fi
