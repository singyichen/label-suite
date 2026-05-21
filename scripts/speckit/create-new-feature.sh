#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

MODULE=""
SHORT_NAME=""
JSON_MODE=false
DESCRIPTION_PARTS=()

usage() {
    cat <<'EOF'
Usage: create-new-feature.sh --module MODULE [--short-name short-name] [--json] <feature description>

Creates feat/[module]/NNN-feature and specs/[module]/NNN-feature/spec.md.
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --module) MODULE="${2:-}"; shift 2 ;;
        --short-name) SHORT_NAME="${2:-}"; shift 2 ;;
        --json) JSON_MODE=true; shift ;;
        --help|-h) usage; exit 0 ;;
        *) DESCRIPTION_PARTS+=("$1"); shift ;;
    esac
done

DESCRIPTION="${DESCRIPTION_PARTS[*]}"
[[ -n "$MODULE" ]] || speckit_die "--module is required"
speckit_is_valid_module "$MODULE" || speckit_die "Invalid module: $MODULE"
[[ -n "$DESCRIPTION" ]] || speckit_die "Feature description is required"

if [[ -z "$SHORT_NAME" ]]; then
    SHORT_NAME="$(speckit_slugify "$DESCRIPTION" | tr '-' '\n' | grep -v '^$' | head -n 4 | tr '\n' '-' | sed 's/-$//')"
fi
SHORT_NAME="$(speckit_slugify "$SHORT_NAME")"
[[ -n "$SHORT_NAME" ]] || speckit_die "Could not derive short name"

REPO_ROOT="$(speckit_repo_root)"
FEATURE_NAME="$(speckit_next_feature_name "$MODULE" "$SHORT_NAME")"
FEATURE_NUM="${FEATURE_NAME%%-*}"
FEATURE_ID="$MODULE-$FEATURE_NUM"
FEATURE_BRANCH="feat/$MODULE/$FEATURE_NAME"
FEATURE_DIR="$REPO_ROOT/specs/$MODULE/$FEATURE_NAME"
SPEC_FILE="$FEATURE_DIR/spec.md"

mkdir -p "$FEATURE_DIR"
if [[ -f "$SPEC_FILE" ]]; then
    speckit_die "Spec already exists: $SPEC_FILE"
fi

if git -C "$REPO_ROOT" rev-parse --show-toplevel >/dev/null 2>&1; then
    if git -C "$REPO_ROOT" show-ref --verify --quiet "refs/heads/$FEATURE_BRANCH"; then
        speckit_die "Branch already exists: $FEATURE_BRANCH"
    fi
    if git -C "$REPO_ROOT" status --porcelain | grep -q .; then
        speckit_die "Uncommitted changes detected. Commit or stash before creating a new feature."
    fi
    git -C "$REPO_ROOT" checkout -b "$FEATURE_BRANCH" >/dev/null
fi

TEMPLATE="$REPO_ROOT/.specify/templates/spec-template.md"
if [[ -f "$TEMPLATE" ]]; then
    cp "$TEMPLATE" "$SPEC_FILE"
else
    touch "$SPEC_FILE"
fi

"$SCRIPT_DIR/update-status.sh" \
    --module "$MODULE" \
    --feature "$FEATURE_NAME" \
    --status spec-ready \
    --branch "$FEATURE_BRANCH" \
    --title "$DESCRIPTION" \
    --note "created by speckit script" >/dev/null

if $JSON_MODE; then
    printf '{"FEATURE_ID":"%s","FEATURE_MODULE":"%s","FEATURE_NAME":"%s","BRANCH":"%s","FEATURE_DIR":"%s","SPEC_FILE":"%s"}\n' \
        "$(speckit_json_escape "$FEATURE_ID")" \
        "$(speckit_json_escape "$MODULE")" \
        "$(speckit_json_escape "$FEATURE_NAME")" \
        "$(speckit_json_escape "$FEATURE_BRANCH")" \
        "$(speckit_json_escape "$FEATURE_DIR")" \
        "$(speckit_json_escape "$SPEC_FILE")"
else
    echo "FEATURE_ID: $FEATURE_ID"
    echo "FEATURE_MODULE: $MODULE"
    echo "FEATURE_NAME: $FEATURE_NAME"
    echo "BRANCH: $FEATURE_BRANCH"
    echo "FEATURE_DIR: $FEATURE_DIR"
    echo "SPEC_FILE: $SPEC_FILE"
fi
