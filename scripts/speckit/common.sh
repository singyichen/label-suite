#!/usr/bin/env bash
# common.sh - Shared shell helpers for Label Suite speckit scripts.
#
# Usage:
#   source ./scripts/speckit/common.sh
#
# IMPORTANT - when to use this script:
#   Source this file from other scripts/speckit/*.sh files instead of running it
#   directly. It centralizes repository discovery, feature branch parsing,
#   module validation, JSON escaping, slug generation, and STATUS.md paths.
#
# How it works:
#   Helpers derive the repository root, parse feat/[module]/NNN-feature or
#   SPECIFY_FEATURE references, validate known modules, and export common path
#   variables used by create-new-feature.sh, setup-plan.sh,
#   check-prerequisites.sh, and update-status.sh.

set -euo pipefail

speckit_die() {
    echo "ERROR: $*" >&2
    exit 1
}

speckit_script_dir() {
    cd "$(dirname "${BASH_SOURCE[0]}")" && pwd
}

speckit_repo_root() {
    local script_dir
    script_dir="$(speckit_script_dir)"
    local candidate
    candidate="$(cd "$script_dir/../.." && pwd)"

    if [[ -d "$candidate/.specify" ]]; then
        echo "$candidate"
        return 0
    fi

    if git rev-parse --show-toplevel >/dev/null 2>&1; then
        git rev-parse --show-toplevel
        return 0
    fi

    speckit_die "Could not determine repository root"
}

speckit_is_valid_module() {
    case "$1" in
        account|dashboard|task-management|annotation|dataset|admin|shared|foundation)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

speckit_json_escape() {
    local value="$1"
    value="${value//\\/\\\\}"
    value="${value//\"/\\\"}"
    value="${value//$'\n'/\\n}"
    printf '%s' "$value"
}

speckit_current_ref() {
    if [[ -n "${SPECIFY_FEATURE:-}" ]]; then
        echo "$SPECIFY_FEATURE"
        return 0
    fi

    local repo_root
    repo_root="$(speckit_repo_root)"
    if git -C "$repo_root" symbolic-ref --short HEAD >/dev/null 2>&1; then
        git -C "$repo_root" symbolic-ref --short HEAD
        return 0
    fi

    speckit_die "Could not determine current feature. Set SPECIFY_FEATURE=module/NNN-feature"
}

speckit_parse_feature_ref() {
    local ref="$1"
    FEATURE_MODULE=""
    FEATURE_NAME=""

    if [[ "$ref" =~ ^feat/([^/]+)/([0-9]{3}-.+)$ ]]; then
        FEATURE_MODULE="${BASH_REMATCH[1]}"
        FEATURE_NAME="${BASH_REMATCH[2]}"
    elif [[ "$ref" =~ ^([^/]+)/([0-9]{3}-.+)$ ]]; then
        FEATURE_MODULE="${BASH_REMATCH[1]}"
        FEATURE_NAME="${BASH_REMATCH[2]}"
    else
        speckit_die "Expected feature ref 'feat/[module]/NNN-feature' or '[module]/NNN-feature', got: $ref"
    fi

    if ! speckit_is_valid_module "$FEATURE_MODULE"; then
        speckit_die "Invalid feature module '$FEATURE_MODULE'"
    fi

    FEATURE_ID="${FEATURE_MODULE}-${FEATURE_NAME%%-*}"
    FEATURE_BRANCH="feat/${FEATURE_MODULE}/${FEATURE_NAME}"
}

speckit_load_current_feature() {
    REPO_ROOT="$(speckit_repo_root)"
    CURRENT_REF="$(speckit_current_ref)"
    speckit_parse_feature_ref "$CURRENT_REF"

    FEATURE_DIR="$REPO_ROOT/specs/$FEATURE_MODULE/$FEATURE_NAME"
    FEATURE_SPEC="$FEATURE_DIR/spec.md"
    IMPL_PLAN="$FEATURE_DIR/plan.md"
    TASKS="$FEATURE_DIR/tasks.md"
    RESEARCH="$FEATURE_DIR/research.md"
    DATA_MODEL="$FEATURE_DIR/data-model.md"
    QUICKSTART="$FEATURE_DIR/quickstart.md"
    CONTRACTS_DIR="$FEATURE_DIR/contracts"
    STATUS_FILE="$REPO_ROOT/specs/STATUS.md"
}

speckit_next_feature_name() {
    local module="$1"
    local short_name="$2"
    local repo_root
    repo_root="$(speckit_repo_root)"

    local highest=0
    local dir base number
    if [[ -d "$repo_root/specs/$module" ]]; then
        for dir in "$repo_root/specs/$module"/[0-9][0-9][0-9]-*; do
            [[ -d "$dir" ]] || continue
            base="$(basename "$dir")"
            number="${base%%-*}"
            [[ "$number" =~ ^[0-9]+$ ]] || continue
            number=$((10#$number))
            if (( number > highest )); then
                highest="$number"
            fi
        done
    fi

    printf '%03d-%s' "$((highest + 1))" "$short_name"
}

speckit_slugify() {
    local value="$1"
    value="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')"
    value="$(printf '%s' "$value" | sed 's/[^a-z0-9][^a-z0-9]*/-/g; s/^-//; s/-$//')"
    printf '%s' "$value"
}
