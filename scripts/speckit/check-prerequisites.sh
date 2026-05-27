#!/usr/bin/env bash
# check-prerequisites.sh - Resolve the active Label Suite feature and required spec artifacts.
#
# Usage:
#   ./scripts/speckit/check-prerequisites.sh
#   ./scripts/speckit/check-prerequisites.sh --json --require-tasks --include-tasks
#   SPECIFY_FEATURE=task-management/013-task-new ./scripts/speckit/check-prerequisites.sh --paths-only
#
# IMPORTANT - when to use this script:
#   Use before implementation commands that need to know the current feature
#   module, feature directory, spec path, plan path, and task list path.
#   It supports both the current git branch format feat/[module]/NNN-feature
#   and explicit SPECIFY_FEATURE=[module]/NNN-feature overrides.
#
# How it works:
#   The script loads common speckit helpers, resolves the active feature, checks
#   that required files exist unless --paths-only is used, and prints either
#   human-readable paths or JSON for automation.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

JSON_MODE=false
REQUIRE_PLAN=true
REQUIRE_TASKS=false
INCLUDE_TASKS=false
PATHS_ONLY=false

usage() {
    cat <<'EOF'
Usage: check-prerequisites.sh [--json] [--paths-only] [--no-require-plan] [--require-tasks] [--include-tasks]

Resolves the current Label Suite feature from feat/[module]/NNN-feature or SPECIFY_FEATURE.
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --json) JSON_MODE=true; shift ;;
        --paths-only) PATHS_ONLY=true; shift ;;
        --no-require-plan) REQUIRE_PLAN=false; shift ;;
        --require-tasks) REQUIRE_TASKS=true; shift ;;
        --include-tasks) INCLUDE_TASKS=true; shift ;;
        --help|-h) usage; exit 0 ;;
        *) speckit_die "Unknown argument: $1" ;;
    esac
done

speckit_load_current_feature

if ! $PATHS_ONLY; then
    [[ -d "$FEATURE_DIR" ]] || speckit_die "Feature directory not found: $FEATURE_DIR"
    [[ -f "$FEATURE_SPEC" ]] || speckit_die "spec.md not found: $FEATURE_SPEC"
    if $REQUIRE_PLAN; then
        [[ -f "$IMPL_PLAN" ]] || speckit_die "plan.md not found: $IMPL_PLAN"
    fi
    if $REQUIRE_TASKS; then
        [[ -f "$TASKS" ]] || speckit_die "tasks.md not found: $TASKS"
    fi
fi

docs=()
[[ -f "$RESEARCH" ]] && docs+=("research.md")
[[ -f "$DATA_MODEL" ]] && docs+=("data-model.md")
if [[ -d "$CONTRACTS_DIR" ]] && [[ -n "$(ls -A "$CONTRACTS_DIR" 2>/dev/null)" ]]; then
    docs+=("contracts/")
fi
[[ -f "$QUICKSTART" ]] && docs+=("quickstart.md")
if $INCLUDE_TASKS && [[ -f "$TASKS" ]]; then
    docs+=("tasks.md")
fi

if $JSON_MODE; then
    json_docs="["
    for doc in "${docs[@]+"${docs[@]}"}"; do
        json_docs+="\"$(speckit_json_escape "$doc")\","
    done
    json_docs="${json_docs%,}]"
    [[ "$json_docs" == "[" ]] && json_docs="[]"

    printf '{"REPO_ROOT":"%s","FEATURE_MODULE":"%s","FEATURE_NAME":"%s","FEATURE_ID":"%s","BRANCH":"%s","FEATURE_DIR":"%s","FEATURE_SPEC":"%s","IMPL_PLAN":"%s","TASKS":"%s","AVAILABLE_DOCS":%s}\n' \
        "$(speckit_json_escape "$REPO_ROOT")" \
        "$(speckit_json_escape "$FEATURE_MODULE")" \
        "$(speckit_json_escape "$FEATURE_NAME")" \
        "$(speckit_json_escape "$FEATURE_ID")" \
        "$(speckit_json_escape "$FEATURE_BRANCH")" \
        "$(speckit_json_escape "$FEATURE_DIR")" \
        "$(speckit_json_escape "$FEATURE_SPEC")" \
        "$(speckit_json_escape "$IMPL_PLAN")" \
        "$(speckit_json_escape "$TASKS")" \
        "$json_docs"
else
    echo "REPO_ROOT: $REPO_ROOT"
    echo "FEATURE_MODULE: $FEATURE_MODULE"
    echo "FEATURE_NAME: $FEATURE_NAME"
    echo "FEATURE_ID: $FEATURE_ID"
    echo "BRANCH: $FEATURE_BRANCH"
    echo "FEATURE_DIR: $FEATURE_DIR"
    echo "FEATURE_SPEC: $FEATURE_SPEC"
    echo "IMPL_PLAN: $IMPL_PLAN"
    echo "TASKS: $TASKS"
    docs_text="${docs[*]+${docs[*]}}"
    echo "AVAILABLE_DOCS: $docs_text"
fi
