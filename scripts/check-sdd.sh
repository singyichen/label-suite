#!/usr/bin/env bash
set -u
readonly inventory_sentinel='design/system/screen-inventory.md is stale — run: node scripts/gen-screen-inventory.mjs'
strict=0
root_arg=''
config_failed=0
governance_failed=0
tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/label-suite-sdd.XXXXXX")" || exit 2
trap 'rm -rf "$tmp_dir"' EXIT
diagnostics="$tmp_dir/diagnostics.tsv"
status_rows="$tmp_dir/status.tsv"
active_specs="$tmp_dir/active-specs.txt"
eligible="$tmp_dir/eligible.tsv"
: >"$diagnostics"
: >"$active_specs"
: >"$eligible"
add_record() { printf '%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" >>"$diagnostics"; }
add_error() { governance_failed=1; add_record ERROR "$1" "$2" "$3"; }
add_config_error() { config_failed=1; add_record ERROR "$1" "$2" "$3"; }
add_warning() { add_record WARNING "$1" "$2" "$3"; }
finish() {
    local sorted="$tmp_dir/diagnostics.sorted" errors warnings
    LC_ALL=C sort "$diagnostics" >"$sorted"
    awk -F '\t' '{ printf "%s [%s] %s: %s\n", $1, $2, $3, $4 }' "$sorted"
    errors="$(awk -F '\t' '$1 == "ERROR" { count++ } END { print count + 0 }' "$sorted")"
    warnings="$(awk -F '\t' '$1 == "WARNING" { count++ } END { print count + 0 }' "$sorted")"
    printf 'Project SDD lint: %s error(s), %s warning(s)\n' "$errors" "$warnings"
    [ "$config_failed" -eq 0 ] || exit 2
    [ "$governance_failed" -eq 0 ] || exit 1
    exit 0
}
for arg in "$@"; do
    case "$arg" in
        --strict)
            [ "$strict" -eq 0 ] || add_config_error CLI_USAGE . 'duplicate --strict flag'
            strict=1
            ;;
        -*) add_config_error CLI_USAGE . "unknown option: $arg" ;;
        *)
            [ -z "$root_arg" ] || add_config_error CLI_USAGE . 'only one repository root may be provided'
            [ -n "$root_arg" ] || root_arg="$arg"
            ;;
    esac
done
if [ "$config_failed" -ne 0 ]; then finish; fi
if [ -z "$root_arg" ]; then
    repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." 2>/dev/null && pwd)"
else
    repo_root="$(cd "$root_arg" 2>/dev/null && pwd)"
fi
if [ -z "${repo_root:-}" ] || [ ! -d "$repo_root" ]; then add_config_error SCANNER_CONFIG . 'repository root is invalid or unreadable'; finish; fi
for required in specs/STATUS.md scripts/sdd-lint-baseline.txt openspec/changes .claude/agents; do
    [ -r "$repo_root/$required" ] || add_config_error SCANNER_CONFIG "$required" 'required scanner input is missing or unreadable'
done
if [ "$config_failed" -ne 0 ]; then finish; fi
awk -F '|' '
function trim(value) {
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
    gsub(/`/, "", value)
    return value
}
{
    id = trim($2)
    if (id ~ /^[a-z-]+-[0-9][0-9][0-9]$/) {
        print id "\t" trim($4) "\t" trim($5) "\t" trim($6)
    }
}' "$repo_root/specs/STATUS.md" >"$status_rows"
while IFS= read -r spec_file; do
    relative="${spec_file#"$repo_root"/}"
    spec_dir="$(basename "$(dirname "$spec_file")")"
    module="$(basename "$(dirname "$(dirname "$spec_file")")")"
    number="${spec_dir%%-*}"
    id="$module-$number"
    count="$(awk -F '\t' -v id="$id" '$1 == id { count++ } END { print count + 0 }' "$status_rows")"
    [ "$count" -eq 1 ] || add_error STATUS_ARTIFACT_SYNC "$relative" "expected exactly one STATUS row for $id"
done < <(find "$repo_root/specs" -mindepth 3 -maxdepth 3 -path '*/[0-9][0-9][0-9]-*/spec.md' -print | LC_ALL=C sort)
while IFS="$(printf '\t')" read -r id module status branch; do
    [ -n "$id" ] || continue
    number="${id##*-}"
    count="$(find "$repo_root/specs/$module" -mindepth 2 -maxdepth 2 -path "*/$number-*/spec.md" -print 2>/dev/null | wc -l | tr -d ' ')"
    [ "$count" -eq 1 ] || add_error STATUS_ARTIFACT_SYNC specs/STATUS.md "STATUS row $id does not resolve to exactly one canonical spec"
    case "$status" in
        spec-ready|change-open|in-progress|review|done|archived|deferred) ;;
        *) add_error STATUS_ARTIFACT_SYNC specs/STATUS.md "STATUS row $id uses an unsupported state" ;;
    esac
    [ "$status" != review ] || add_warning STATUS_EXTERNAL_STATE specs/STATUS.md "external PR state for $id requires maintainer review"
done <"$status_rows"
section_is_valid() {
    awk -v heading="$2" '
    substr($0, 1, length(heading)) == heading { found++; inside = 1; next }
    inside && /^##[[:space:]]/ { inside = 0 }
    inside && $0 !~ /^[[:space:]]*$/ && $0 !~ /^[[:space:]]*<!--/ { content = 1 }
    END { exit !(found == 1 && content == 1) }
    ' "$1"
}
requires_page_traceability() {
    [ "$1" != foundation ] && grep -Eq 'Prototype|design/prototype|產品 UI|頁面' "$2"
}
verify_citations() {
    local artifact="$1" canonical="$2" citation
    [ -r "$artifact" ] || return
    grep -Eo 'FR-[0-9][0-9][0-9]|SC-[0-9][0-9][0-9]|AC-[0-9]+[.][0-9]+' "$artifact" | LC_ALL=C sort -u >"$tmp_dir/citations" || true
    while IFS= read -r citation; do
        [ -z "$citation" ] || grep -Fq "$citation" "$canonical" || add_error SOURCE_VERIFY_ID "${artifact#"$repo_root"/}" "canonical spec does not define $citation"
    done <"$tmp_dir/citations"
}
for change_dir in "$repo_root"/openspec/changes/*; do
    [ -d "$change_dir" ] || continue
    [ "$(basename "$change_dir")" != archive ] || continue
    proposal="$change_dir/proposal.md"
    relative_proposal="${proposal#"$repo_root"/}"
    if [ ! -r "$proposal" ]; then add_error ACTIVE_CHANGE_SPEC "${change_dir#"$repo_root"/}" 'active change is missing a readable proposal.md'; continue; fi
    refs="$tmp_dir/refs.$(basename "$change_dir")"
    grep -Eo 'specs/[[:alnum:]-]+/[0-9][0-9][0-9]-[[:alnum:]_.-]+/spec\.md' "$proposal" | LC_ALL=C sort -u >"$refs" || true
    ref_count="$(wc -l <"$refs" | tr -d ' ')"
    if [ "$ref_count" -ne 1 ]; then add_error ACTIVE_CHANGE_SPEC "$relative_proposal" 'proposal must reference exactly one canonical spec'; continue; fi
    canonical_relative="$(sed -n '1p' "$refs")"
    canonical="$repo_root/$canonical_relative"
    if [ ! -r "$canonical" ]; then add_error ACTIVE_CHANGE_SPEC "$relative_proposal" "canonical spec is missing: $canonical_relative"; continue; fi
    printf '%s\n' "$canonical_relative" >>"$active_specs"
    module="$(printf '%s\n' "$canonical_relative" | cut -d/ -f2)"
    feature="$(printf '%s\n' "$canonical_relative" | cut -d/ -f3)"
    id="$module-${feature%%-*}"
    status_count="$(awk -F '\t' -v id="$id" '$1 == id { count++ } END { print count + 0 }' "$status_rows")"
    status="$(awk -F '\t' -v id="$id" '$1 == id { print $3; exit }' "$status_rows")"
    status_branch="$(awk -F '\t' -v id="$id" '$1 == id { print $4; exit }' "$status_rows")"
    if [ "$status_count" -ne 1 ]; then
        add_error ACTIVE_CHANGE_SPEC "$relative_proposal" "canonical spec $id has no unique STATUS row"
    else
        case "$status" in
            spec-ready|done|archived|deferred)
                add_error ACTIVE_CHANGE_STAGE specs/STATUS.md "active change $id is incompatible with STATUS $status"
                ;;
        esac
        spec_branch="$(sed -n 's/^功能分支:[[:space:]]*//p' "$canonical" | sed 's/`//g' | sed -n '1p')"
        if [ -n "$spec_branch" ] && [ "$spec_branch" != "$status_branch" ]; then add_error ACTIVE_CHANGE_STAGE specs/STATUS.md "branch for $id contradicts canonical frontmatter"; fi
    fi
    for heading in '## 功能目標' '## 規格相依性'; do
        section_is_valid "$canonical" "$heading" || add_error SPEC_REQUIRED_HEADING "$canonical_relative" "required heading is missing, duplicated, or empty: $heading"
    done
    missing_ids=''
    grep -Eq 'FR-[0-9][0-9][0-9]' "$canonical" || missing_ids="$missing_ids FR"
    grep -Eq 'SC-[0-9][0-9][0-9]' "$canonical" || missing_ids="$missing_ids SC"
    grep -Eq 'AC-[0-9]+[.][0-9]+' "$canonical" || missing_ids="$missing_ids AC"
    [ -z "$missing_ids" ] || add_error SPEC_REQUIRED_IDS "$canonical_relative" "canonical spec is missing required identifiers:$missing_ids"
    if requires_page_traceability "$module" "$canonical" && ! grep -Eq '^## Prototype Traceability|Frontend Ready Gate.*不適用|prototype.*不適用' "$canonical"; then add_error SPEC_REQUIRED_IDS "$canonical_relative" 'page traceability or an explicit non-page exception is required'; fi
    for artifact in "$proposal" "$change_dir/design.md" "$change_dir/tasks.md"; do
        verify_citations "$artifact" "$canonical"
    done
    while IFS= read -r artifact; do
        verify_citations "$artifact" "$canonical"
    done < <(find "$change_dir/specs" -type f -name spec.md -print 2>/dev/null | LC_ALL=C sort)
    tasks="$change_dir/tasks.md"
    if [ -r "$tasks" ]; then
        task_relative="${tasks#"$repo_root"/}"
        missing_goal="$(awk '
            function close_phase() { if (phase && !goal) print start }
            /^## [0-9]+[.]/ { close_phase(); phase = 1; goal = 0; start = NR; next }
            phase && /^\*\*故事目標\*\*/ { goal = 1 }
            END { close_phase() }
        ' "$tasks")"
        [ -z "$missing_goal" ] || add_error TASK_STORY_GOAL "$task_relative" 'each numbered phase requires a story goal'
        grep '^\*\*故事目標\*\*' "$tasks" >"$tmp_dir/goals" || true
        while IFS= read -r goal; do
            goal_ids="$(printf '%s\n' "$goal" | grep -Eo 'SC-[0-9][0-9][0-9]' || true)"
            if [ -z "$goal_ids" ]; then
                add_error TASK_STORY_GOAL "$task_relative" 'story goal must cite a canonical SC ID'
            else
                while IFS= read -r goal_id; do
                    grep -Fq "$goal_id" "$canonical" || add_error TASK_STORY_GOAL "$task_relative" "story goal cites unknown $goal_id"
                done <<EOF
$goal_ids
EOF
            fi
        done <"$tmp_dir/goals"
        grep -E '^- \[[ xX]\]' "$tasks" >"$tmp_dir/task-lines" || true
        seen_red_groups=' '
        while IFS= read -r task_line; do
            first_path="$(printf '%s\n' "$task_line" | grep -o '`[^`]*`' | sed -n '1p' | sed 's/^`//; s/`$//')"
            task_group="$(printf '%s\n' "$task_line" | sed -n 's/^- \[[ xX]\] \([0-9][0-9]*\)[.].*/\1/p')"
            assignee_count="$(printf '%s\n' "$task_line" | grep -o '\[@[^]]*\]' | wc -l | tr -d ' ')"
            terminal="$(printf '%s\n' "$task_line" | sed -n 's/.*\(\[@[^]]*\]\)[[:space:]]*$/\1/p')"
            assignee="$(printf '%s\n' "$terminal" | sed 's/^\[@//; s/\]$//')"
            if [ "$assignee_count" -ne 1 ] || [ -z "$terminal" ]; then
                add_error TASK_ASSIGNEE "$task_relative" 'task must end with exactly one assignee'
                continue
            fi
            if [ "$assignee" != main ] && [ ! -r "$repo_root/.claude/agents/$assignee.md" ]; then add_error TASK_ASSIGNEE "$task_relative" "task references unknown assignee: $assignee"; fi
            exception=''
            if printf '%s\n' "$task_line" | grep -Fq 'Exception:'; then
                exception="$(printf '%s\n' "$task_line" | sed -n 's/.*Exception:[[:space:]]*\([^;[:space:]]*\).*/\1/p')"
                case "$exception" in package-manager|scaffold|governance-propagation) ;; *) exception=invalid ;; esac
                exception_fields="$(printf '%s\n' "$task_line" | grep -Eo 'Exception:|Files:|Reason:' | wc -l | tr -d ' ')"
                if [ "$exception" = invalid ] || [ "$exception_fields" -ne 3 ] || printf '%s\n' "$task_line" | grep -Eq 'Files:[[:space:]]*;|Reason:[[:space:]]*(;|\[@)'; then add_error TASK_EXCEPTION "$task_relative" 'exception record is incomplete or uses a disallowed identifier'; fi
            fi
            if [ "$exception" != governance-propagation ] && printf '%s\n' "$first_path" | grep -Eq '^scripts/.*-tests[.]sh$' && printf '%s\n' "$task_line" | grep -Eq '(^|[^[:alnum:]_])[Rr]ed([^[:alnum:]_]|$)'; then
                [ "$assignee" = senior-qa ] || add_error TASK_RED_OWNER "$task_relative" 'Red task must be owned by senior-qa'
                add_warning TASK_RED_EVIDENCE_REVIEW "$task_relative" 'committed Red failure evidence requires runtime review'
                seen_red_groups="$seen_red_groups$task_group "
            fi
            if printf '%s\n' "$task_line" | grep -Eq '(^|[^[:alnum:]_])Green([^[:alnum:]_]|$)'; then
                case "$seen_red_groups" in
                    *" $task_group "*) ;;
                    *) add_error TASK_RED_OWNER "$task_relative" 'paired Green task must follow its Red task' ;;
                esac
            fi
            if [ "$exception" != governance-propagation ] && ! printf '%s\n' "$task_line" | grep -Eq '^- \[[ xX]\] [0-9.]+ 執行'; then
                if printf '%s\n' "$first_path" | grep -Eq '^scripts/.*-tests[.]sh$' && [ "$assignee" != senior-qa ]; then add_error TASK_FILE_OWNER "$task_relative" 'scripts/*-tests.sh is owned by senior-qa'; fi
                if printf '%s\n' "$first_path" | grep -Eq '^scripts/' && ! printf '%s\n' "$first_path" | grep -Eq -- '-tests[.]sh$' && [ "$assignee" != senior-devops ]; then add_error TASK_FILE_OWNER "$task_relative" 'production scripts are owned by senior-devops'; fi
            fi
        done <"$tmp_dir/task-lines"
    fi
    add_warning GOAL_SEMANTIC_REVIEW "$relative_proposal" 'goal semantics require human review'
    if grep -Eq 'ADR-034|frontend/tests/|root `e2e/' "$change_dir/design.md" 2>/dev/null; then add_warning E2E_PATH_DECISION "${change_dir#"$repo_root"/}/design.md" 'ADR-034 E2E path decision remains deferred'; fi
done
LC_ALL=C sort -u "$active_specs" -o "$active_specs"
while IFS= read -r spec_file; do
    relative="${spec_file#"$repo_root"/}"
    grep -Fqx "$relative" "$active_specs" && continue
    module="$(basename "$(dirname "$(dirname "$spec_file")")")"
    grep -Eq '^## 功能目標([[:space:]]|$)' "$spec_file" || printf 'LEGACY_SPEC_HEADING\t%s\tmissing:## 功能目標\n' "$relative" >>"$eligible"
    grep -Eq '^## 規格相依性([[:space:]]|$)' "$spec_file" || printf 'LEGACY_SPEC_HEADING\t%s\tmissing:## 規格相依性\n' "$relative" >>"$eligible"
    if requires_page_traceability "$module" "$spec_file" && ! grep -Fqx '## Prototype Traceability' "$spec_file"; then printf 'LEGACY_SPEC_HEADING\t%s\tmissing:## Prototype Traceability\n' "$relative" >>"$eligible"; fi
done < <(find "$repo_root/specs" -mindepth 3 -maxdepth 3 -path '*/[0-9][0-9][0-9]-*/spec.md' -print | LC_ALL=C sort)
LC_ALL=C sort -u "$eligible" -o "$eligible"
baseline="$repo_root/scripts/sdd-lint-baseline.txt"
baseline_sorted="$tmp_dir/baseline.sorted"
baseline_valid=1
LC_ALL=C sort "$baseline" >"$baseline_sorted"
cmp -s "$baseline" "$baseline_sorted" || baseline_valid=0
if [ -n "$(LC_ALL=C sort "$baseline" | uniq -d)" ]; then baseline_valid=0; fi
while IFS="$(printf '\t')" read -r rule path detail extra; do
    [ -n "$rule$path$detail$extra" ] || continue
    case "$rule" in LEGACY_SPEC_HEADING|LEGACY_STATUS_DRIFT) ;; *) baseline_valid=0 ;; esac
    if [ -z "$path" ] || [ -z "$detail" ] || [ -n "${extra:-}" ] || printf '%s' "$path" | grep -Eq '(^/|(^|/)\.\.(/|$)|[*?[])' || [ ! -e "$repo_root/$path" ]; then baseline_valid=0; fi
done <"$baseline"
if [ "$baseline_valid" -ne 1 ]; then
    add_config_error BASELINE_FORMAT scripts/sdd-lint-baseline.txt 'baseline must be sorted, unique, valid three-column TSV'
else
    comm -23 "$eligible" "$baseline" >"$tmp_dir/new"
    comm -13 "$eligible" "$baseline" >"$tmp_dir/stale"
    comm -12 "$eligible" "$baseline" >"$tmp_dir/known"
    while IFS="$(printf '\t')" read -r rule path detail; do
        [ -n "$rule" ] || continue
        add_error "$rule" "$path" "new legacy debt: $detail"
    done <"$tmp_dir/new"
    while IFS="$(printf '\t')" read -r rule path detail; do
        [ -n "$rule" ] || continue
        add_error BASELINE_STALE scripts/sdd-lint-baseline.txt "stale entry: $rule $path $detail"
    done <"$tmp_dir/stale"
    while IFS="$(printf '\t')" read -r rule path detail; do
        [ -n "$rule" ] || continue
        if [ "$strict" -eq 1 ]; then add_error "$rule" "$path" "known legacy debt: $detail"
        else add_warning "$rule" "$path" "known legacy debt: $detail"
        fi
    done <"$tmp_dir/known"
fi
consumer_files="$tmp_dir/consumers"
: >"$consumer_files"
for relative in AGENTS.md CLAUDE.md docs/sdd-workflow.md; do
    [ -f "$repo_root/$relative" ] && printf '%s\n' "$repo_root/$relative" >>"$consumer_files"
done
for dir in .claude/skills/sdd-workflow .claude/commands .claude/agents openspec/changes; do
    [ -d "$repo_root/$dir" ] || continue
    find "$repo_root/$dir" -type f -not -path '*/archive/*' -print >>"$consumer_files"
done
LC_ALL=C sort -u "$consumer_files" -o "$consumer_files"
while IFS= read -r consumer; do
    case "$consumer" in */.claude/commands/speckit.analyze.md) continue ;; esac
    relative="${consumer#"$repo_root"/}"
    grep -En '(^|[^[:alnum:]_])npm[[:space:]]+(test|run)([[:space:]]|$)|/ui-ux-pro-max|/speckit[.]analyze' "$consumer" 2>/dev/null >"$tmp_dir/retired" || true
    while IFS= read -r match; do
        text="${match#*:}"
        if printf '%s\n' "$text" | grep -Eqi 'retired|deprecated|changelog|negative|non-historical|不得|禁止|阻擋|廢止|退役|歷史|取代|移除|例如'; then
            continue
        fi
        add_error RETIRED_COMMAND "$relative" 'active guidance contains a retired repository command or pipeline stage'
    done <"$tmp_dir/retired"
done <"$consumer_files"
generator="$repo_root/scripts/gen-screen-inventory.mjs"
if [ ! -f "$generator" ] || [ ! -r "$generator" ] || ! command -v node >/dev/null 2>&1; then
    add_config_error INVENTORY_CHECK_CONFIG scripts/gen-screen-inventory.mjs 'inventory checker is missing, unreadable, or unavailable'
else
    inventory_output=''
    if inventory_output="$(node "$generator" --check 2>&1)"; then
        inventory_status=0
    else
        inventory_status=$?
    fi
    if [ "$inventory_status" -eq 0 ]; then
        :
    elif [ "$inventory_status" -eq 1 ] && [ "$inventory_output" = "$inventory_sentinel" ]; then
        add_error INVENTORY_FRESHNESS design/system/screen-inventory.md 'generated screen inventory is stale; run the inventory generator'
    else
        add_config_error INVENTORY_CHECK_CONFIG scripts/gen-screen-inventory.mjs 'inventory checker returned an unexpected result'
    fi
fi
finish
