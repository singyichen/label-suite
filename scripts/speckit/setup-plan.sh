#!/usr/bin/env bash
# setup-plan.sh - Create or refresh plan.md for the active Label Suite feature.
#
# Usage:
#   ./scripts/speckit/setup-plan.sh
#   ./scripts/speckit/setup-plan.sh --json
#   ./scripts/speckit/setup-plan.sh --force
#
# IMPORTANT - when to use this script:
#   Use after a feature spec is ready and the current branch or SPECIFY_FEATURE
#   points at feat/[module]/NNN-feature. It creates the implementation plan from
#   .specify/templates/plan-template.md and moves the feature to plan-ready in
#   specs/STATUS.md.
#
# How it works:
#   The script resolves the active feature through common.sh, verifies the spec
#   prerequisites, writes plan.md unless it already exists, and updates
#   specs/STATUS.md through update-status.sh.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

JSON_MODE=false
FORCE=false

usage() {
    cat <<'EOF'
Usage: setup-plan.sh [--json] [--force]

Creates specs/[module]/NNN-feature/plan.md for the current feature branch.
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --json) JSON_MODE=true; shift ;;
        --force) FORCE=true; shift ;;
        --help|-h) usage; exit 0 ;;
        *) speckit_die "Unknown argument: $1" ;;
    esac
done

speckit_load_current_feature

[[ -d "$FEATURE_DIR" ]] || speckit_die "Feature directory not found: $FEATURE_DIR"
[[ -f "$FEATURE_SPEC" ]] || speckit_die "spec.md not found: $FEATURE_SPEC"

TEMPLATE="$REPO_ROOT/.specify/templates/plan-template.md"
if [[ ! -f "$IMPL_PLAN" || "$FORCE" == true ]]; then
    if [[ -f "$TEMPLATE" ]]; then
        cp "$TEMPLATE" "$IMPL_PLAN"
    else
        touch "$IMPL_PLAN"
    fi
fi

"$SCRIPT_DIR/update-status.sh" \
    --module "$FEATURE_MODULE" \
    --feature "$FEATURE_NAME" \
    --status plan-ready \
    --branch "$FEATURE_BRANCH" >/dev/null

if $JSON_MODE; then
    printf '{"FEATURE_MODULE":"%s","FEATURE_NAME":"%s","FEATURE_SPEC":"%s","IMPL_PLAN":"%s","FEATURE_DIR":"%s","BRANCH":"%s"}\n' \
        "$(speckit_json_escape "$FEATURE_MODULE")" \
        "$(speckit_json_escape "$FEATURE_NAME")" \
        "$(speckit_json_escape "$FEATURE_SPEC")" \
        "$(speckit_json_escape "$IMPL_PLAN")" \
        "$(speckit_json_escape "$FEATURE_DIR")" \
        "$(speckit_json_escape "$FEATURE_BRANCH")"
else
    echo "FEATURE_MODULE: $FEATURE_MODULE"
    echo "FEATURE_NAME: $FEATURE_NAME"
    echo "FEATURE_SPEC: $FEATURE_SPEC"
    echo "IMPL_PLAN: $IMPL_PLAN"
    echo "FEATURE_DIR: $FEATURE_DIR"
    echo "BRANCH: $FEATURE_BRANCH"
fi
