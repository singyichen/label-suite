#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

usage() {
    cat <<'EOF'
Usage: update-status.sh --module MODULE --feature NNN-feature --status STATUS [--branch BRANCH] [--title TITLE] [--note NOTE]

Updates specs/STATUS.md for a Label Suite module-based spec entry.
EOF
}

MODULE=""
FEATURE=""
STATUS=""
BRANCH=""
TITLE=""
NOTE=""
JSON_MODE=false
TITLE_PROVIDED=false
NOTE_PROVIDED=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --module) MODULE="${2:-}"; shift 2 ;;
        --feature) FEATURE="${2:-}"; shift 2 ;;
        --status) STATUS="${2:-}"; shift 2 ;;
        --branch) BRANCH="${2:-}"; shift 2 ;;
        --title) TITLE="${2:-}"; TITLE_PROVIDED=true; shift 2 ;;
        --note) NOTE="${2:-}"; NOTE_PROVIDED=true; shift 2 ;;
        --json) JSON_MODE=true; shift ;;
        --help|-h) usage; exit 0 ;;
        *) speckit_die "Unknown argument: $1" ;;
    esac
done

[[ -n "$MODULE" ]] || speckit_die "--module is required"
[[ -n "$FEATURE" ]] || speckit_die "--feature is required"
[[ -n "$STATUS" ]] || speckit_die "--status is required"
speckit_is_valid_module "$MODULE" || speckit_die "Invalid module: $MODULE"
[[ "$FEATURE" =~ ^[0-9]{3}-.+ ]] || speckit_die "--feature must look like NNN-feature"

case "$STATUS" in
    spec-ready|plan-ready|tasks-ready|in-progress|review|done|archived|deferred)
        ;;
    *)
        speckit_die "Invalid status: $STATUS"
        ;;
esac

REPO_ROOT="$(speckit_repo_root)"
STATUS_FILE="$REPO_ROOT/specs/STATUS.md"
[[ -f "$STATUS_FILE" ]] || speckit_die "Missing specs/STATUS.md"

if [[ -z "$BRANCH" ]]; then
    BRANCH="feat/$MODULE/$FEATURE"
fi

FEATURE_NUM="${FEATURE%%-*}"
ID="$MODULE-$FEATURE_NUM"
DEFAULT_TITLE="$(printf '%s' "${FEATURE#*-}" | sed 's/-/ /g; s/.*/\u&/')"
[[ -n "$TITLE" ]] || TITLE="$DEFAULT_TITLE"

speckit_trim() {
    local value="$1"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    printf '%s' "$value"
}

speckit_status_row() {
    local title="$1"
    local note="$2"
    printf '| %s | %s | %s | `%s` | `%s` | %s |\n' "$ID" "$title" "$MODULE" "$STATUS" "$BRANCH" "$note"
}

NEW_ROW="$(speckit_status_row "$TITLE" "$NOTE")"
TODAY="$(date +%Y-%m-%d)"
CHANGE_NOTE="Update $ID status to \`$STATUS\`."

tmp_file="$(mktemp "${TMPDIR:-/tmp}/status.XXXXXX")"
found=false
inserted=false
in_feature_table=false
feature_separator_seen=false
changelog_inserted=false
in_changelog=false

while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" == "## 功能流程（已存在 Spec 檔案）" ]]; then
        in_feature_table=true
        feature_separator_seen=false
        printf '%s\n' "$line" >> "$tmp_file"
        continue
    fi

    if [[ "$line" == "| ID | 功能 | 模組 | 狀態 | 分支 | 備註 |" ]]; then
        in_feature_table=true
        feature_separator_seen=false
        printf '%s\n' "$line" >> "$tmp_file"
        continue
    fi

    if $in_feature_table && [[ "$line" == "---" ]]; then
        if ! $found && ! $inserted; then
            printf '%s\n' "$NEW_ROW" >> "$tmp_file"
            inserted=true
        fi
        in_feature_table=false
        printf '%s\n' "$line" >> "$tmp_file"
        continue
    fi

    if $in_feature_table && [[ "$line" == "## "* ]]; then
        if ! $found && ! $inserted; then
            printf '%s\n' "$NEW_ROW" >> "$tmp_file"
            inserted=true
        fi
        in_feature_table=false
        if [[ "$line" == "## 變更紀錄" ]]; then
            in_changelog=true
        fi
        printf '%s\n' "$line" >> "$tmp_file"
        continue
    fi

    if $in_feature_table && [[ "$line" == "| --- | --- | --- | --- | --- | --- |" ]]; then
        feature_separator_seen=true
        printf '%s\n' "$line" >> "$tmp_file"
        continue
    fi

    if $in_feature_table && $feature_separator_seen && [[ "$line" == "| $ID |"* ]]; then
        existing_title="$(speckit_trim "$(printf '%s' "$line" | cut -d'|' -f3)")"
        existing_note="$(speckit_trim "$(printf '%s' "$line" | cut -d'|' -f7)")"
        if ! $TITLE_PROVIDED && [[ -n "$existing_title" ]]; then
            TITLE="$existing_title"
        fi
        if ! $NOTE_PROVIDED; then
            NOTE="$existing_note"
        fi
        NEW_ROW="$(speckit_status_row "$TITLE" "$NOTE")"
        printf '%s' "$NEW_ROW" >> "$tmp_file"
        found=true
        continue
    fi

    if [[ "$line" == "## 變更紀錄" ]]; then
        in_changelog=true
        printf '%s\n' "$line" >> "$tmp_file"
        continue
    fi

    if $in_changelog && [[ "$line" == "|------|----------|" ]]; then
        printf '%s\n' "$line" >> "$tmp_file"
        printf '| %s | %s |\n' "$TODAY" "$CHANGE_NOTE" >> "$tmp_file"
        changelog_inserted=true
        in_changelog=false
        continue
    fi

    printf '%s\n' "$line" >> "$tmp_file"
done < "$STATUS_FILE"

if ! $found && ! $inserted; then
    speckit_die "Could not find feature table insertion point in specs/STATUS.md"
fi

if ! $changelog_inserted; then
    {
        printf '\n## 變更紀錄\n\n'
        printf '| 日期 | 更新內容 |\n'
        printf '|------|----------|\n'
        printf '| %s | %s |\n' "$TODAY" "$CHANGE_NOTE"
    } >> "$tmp_file"
fi

mv "$tmp_file" "$STATUS_FILE"

if $JSON_MODE; then
    printf '{"ID":"%s","MODULE":"%s","FEATURE":"%s","STATUS":"%s","BRANCH":"%s","STATUS_FILE":"%s"}\n' \
        "$(speckit_json_escape "$ID")" \
        "$(speckit_json_escape "$MODULE")" \
        "$(speckit_json_escape "$FEATURE")" \
        "$(speckit_json_escape "$STATUS")" \
        "$(speckit_json_escape "$BRANCH")" \
        "$(speckit_json_escape "$STATUS_FILE")"
else
    echo "Updated $ID to $STATUS in $STATUS_FILE"
fi
