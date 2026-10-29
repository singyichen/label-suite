#!/usr/bin/env bash
# pre-tool-use.sh — Block dangerous Bash commands before Claude Code executes them.
#
# Trigger:
#   Registered as a PreToolUse hook in .claude/settings.json for the Bash tool.
#
# IMPORTANT — when this hook fires:
#   Automatically invoked by the Claude Code harness before every Bash tool call.
#   Never run manually.
#   Exit 2 = block the command and surface the error to Claude.
#   Exit 0 = allow the command to proceed.
#
# How it works:
#   Reads the JSON tool-call payload from stdin and extracts the command string.
#   Blocks: any push while checked out on main/master (branch-detected),
#   pushes explicitly naming main/master, force push, pip/npm install,
#   destructive rm -rf on root/home paths, other dangerous patterns
#   (DROP TABLE, terraform destroy, dd, mkfs, fork bombs, chmod 777 /), and
#   the shared-host Docker bans: any prune, and teardown of resources
#   without the label-suite prefix (constitution XXIII, issue #1487).
set -uo pipefail

INPUT=$(cat)

if command -v jq &>/dev/null; then
  COMMAND=$(printf '%s\n' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")
else
  COMMAND=$(printf '%s\n' "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")
fi

[ -z "$COMMAND" ] && exit 0

# Shared matchers for the three push checks below.
#
# A git global option (-C, -c, --git-dir, --no-pager, ...) may legally sit
# between `git` and its subcommand, so a check anchored on the literal token
# pair "git push" misses every one of those forms — `git -C <path> push origin
# main` slipped past all three checks. Options are whitelisted rather than
# accepted as "any token": a permissive `git [^ ]* push` would false-positive
# on prose like `git log --grep push`.
#
# AT_CMD anchors a match to command position (start of line, or after a
# shell separator) so quoted prose that merely mentions a push — commit
# messages, PR replies, test fixtures — is not mistaken for one.
GIT_OPT='(-C[[:space:]]+[^[:space:]]+|-c[[:space:]]+[^[:space:]]+|--git-dir[= ][^[:space:]]+|--work-tree[= ][^[:space:]]+|--namespace[= ][^[:space:]]+|--exec-path(=[^[:space:]]+)?|--no-pager|-P|--bare|--literal-pathspecs|--no-replace-objects|--no-optional-locks)'
GIT_PUSH="git([[:space:]]+${GIT_OPT})*[[:space:]]+push"
AT_CMD='(^|[;&|]|\$\()[[:space:]]*'

# CMD_START widens AT_CMD for the checks below, whose dangerous command often
# sits inside a quoted string handed to another program — ssh '<cmd>',
# bash -c '<cmd>', psql -c "<sql>" — so an opening quote, a backtick, `(`,
# `{` and find's -exec also start a command. It then skips whatever may
# legally precede the command name: env assignments, wrappers with their
# options (sudo -E, timeout 60, watch), shell keywords (then, if, eval, !),
# and a path (/usr/bin/pip). Prose that names a command mid-sentence still
# passes (issue #1487); prose that opens with one does not — over-blocking
# prose beats missing a real call.
CMD_ASSIGN='[A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*[[:space:]]+'
CMD_WRAPPER='(sudo|env|nohup|nice|time|command|exec|xargs|parallel|watch|timeout)([[:space:]]+-[^[:space:]]+([[:space:]]+[^-[:space:]][^[:space:]]*)?)*([[:space:]]+[0-9][^[:space:]]*)?[[:space:]]+'
CMD_KEYWORD='(then|do|else|if|elif|while|until|eval|!)[[:space:]]+'
# ssh <options> <host> <cmd> runs <cmd> remotely without quoting it.
CMD_REMOTE='ssh([[:space:]]+-[^[:space:]]+([[:space:]]+[^-[:space:]][^[:space:]]*)?)*[[:space:]]+[^-[:space:]][^[:space:]]*[[:space:]]+'
CMD_START="(^|[;&|({'\"\`]|\\\$\\(|[[:space:]]-(exec|execdir|ok|okdir))[[:space:]]*(${CMD_ASSIGN}|${CMD_WRAPPER}|${CMD_KEYWORD}|${CMD_REMOTE})*([^[:space:]'\"]*/)?"

# Block: any push while the branch it runs on is main/master (AGENTS.md Rule 2).
# Branch detection closes the 'git push origin HEAD' gap a pure regex misses.
if printf '%s\n' "$COMMAND" | grep -qE "${AT_CMD}${GIT_PUSH}([[:space:]]|$)"; then
  # Which branch is "current" depends on which directory the push runs in,
  # and three things can decide that. `git -C <path>` wins, because git
  # honors it over the process cwd. Otherwise a `cd <path>` the command
  # performs before pushing wins, because by then the shell has moved.
  # Only if neither is present does the payload's own "cwd" field decide.
  #
  # "cwd" cannot be trusted on its own: under a subagent it is pinned to the
  # repository root, so a legitimate push from a feature-branch worktree is
  # reported as a push from main and blocked. That false positive is what
  # taught agents to look for the -C bypass in the first place, so both
  # halves are one fix.
  if command -v jq &>/dev/null; then
    CWD=$(printf '%s\n' "$INPUT" | jq -r '.cwd // ""' 2>/dev/null || echo "")
  else
    CWD=$(printf '%s\n' "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('cwd',''))" 2>/dev/null || echo "")
  fi

  # Last occurrence wins for both, matching how git and the shell resolve
  # repeated -C / cd themselves. A path containing whitespace does not
  # survive this extraction; it then resolves to no branch and the next
  # candidate is tried, which is the safe direction.
  C_DIR=$(printf '%s\n' "$COMMAND" | grep -oE '(^|[[:space:]])-C[[:space:]]+[^[:space:]]+' | tail -1 | sed -E 's/.*-C[[:space:]]+//')
  CD_DIR=$(printf '%s\n' "$COMMAND" | grep -oE "${AT_CMD}cd[[:space:]]+[^[:space:]&|;]+" | tail -1 | sed -E 's/.*cd[[:space:]]+//')

  BRANCH=""
  for CAND in "$C_DIR" "$CD_DIR" "$CWD"; do
    [ -z "$CAND" ] && continue
    case "$CAND" in
      /*) ;;
      *) CAND="${CWD:-$PWD}/$CAND" ;;
    esac
    BRANCH=$(git -C "$CAND" branch --show-current 2>/dev/null || echo "")
    [ -n "$BRANCH" ] && break
  done
  # An exhausted chain (no candidate resolves to a branch: missing "cwd",
  # not a repo, detached HEAD) falls back to this process's own cwd — never
  # to allowing the push.
  if [ -z "$BRANCH" ]; then
    BRANCH=$(git branch --show-current 2>/dev/null || echo "")
  fi
  if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
    echo "❌ Blocked: current branch is '$BRANCH' — pushing from a protected branch is not allowed. Check out a feature branch first (AGENTS.md Rule 2)." >&2
    exit 2
  fi
fi

# Block: push that explicitly names main/master as a refspec, from any branch.
# Anchored to command position so quoted prose that merely mentions
# "git push ... main" (commit messages, PR replies) does not false-positive.
if printf '%s\n' "$COMMAND" | grep -qE "${AT_CMD}${GIT_PUSH}[^|&;]*[[:space:]:](main|master)([[:space:]]|$)"; then
  echo "❌ Blocked: direct push to main/master. Create a branch and open a PR instead (AGENTS.md Rule 2)." >&2
  exit 2
fi

# Block: force push (requires explicit user confirmation)
# --force-with-lease is allowed (safer: checks remote hasn't diverged), and is
# excluded by requiring whitespace or end-of-string right after --force.
# The whole match is anchored to one command segment ([^|&;]*) at command
# position, so a file or message that merely contains both words — this
# hook's own test fixtures, for one — is not read as a force push.
if printf '%s\n' "$COMMAND" | grep -qE "${AT_CMD}${GIT_PUSH}[^|&;]*[[:space:]](--force|-f)([[:space:]]|$)"; then
  echo "❌ Blocked: force push requires explicit user confirmation." >&2
  exit 2
fi

# Block: pip/npm install — wrong package managers (AGENTS.md Rule 3)
if echo "$COMMAND" | grep -qE "${CMD_START}((uv|python3?(\.[0-9]+)?[[:space:]]+-m)[[:space:]]+)?(pip|npm)[[:space:]]+install([^[:alnum:]]|$)"; then
  echo "❌ Blocked: use 'uv add' (backend) or 'pnpm add' (frontend) — not pip/npm install (AGENTS.md Rule 3)." >&2
  exit 2
fi

# Block: destructive rm on system/home root paths
if echo "$COMMAND" | grep -qE 'rm\s+(-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*|-[a-zA-Z]*f[a-zA-Z]*r[a-zA-Z]*)\s+(\/(\s|$|[*])|~(\/[*]?)?(\s|$)|(\$\{?HOME\}?|/home|/root)(\/[*]?)?(\s|$))'; then
  echo "❌ Blocked: destructive rm -rf on root/home paths." >&2
  exit 2
fi

# Block: additional destructive commands
NORMALIZED=$(echo "$COMMAND" | tr -s ' \t' ' ')
# Each entry is "label|regex"; the label is what the block message shows.
# The fork bomb stays unanchored: its shape never occurs in prose.
EXTRA_PATTERNS=(
  "DROP TABLE/DATABASE|${CMD_START}DROP (TABLE|DATABASE)"
  "terraform destroy|${CMD_START}terraform( -[^ ]+)* destroy"
  "dd of=/dev/|${CMD_START}dd [^;&|]*of=/dev/"
  "mkfs|${CMD_START}mkfs\."
  "fork bomb|:\(\)\{.*\};"
  "find -delete|${CMD_START}find [^;&|]*-delete"
  "chmod -R 777 /|${CMD_START}chmod -R 777 /"
)
for entry in "${EXTRA_PATTERNS[@]}"; do
  if echo "$NORMALIZED" | grep -qiE "${entry#*|}"; then
    echo "❌ Blocked: dangerous command detected — ${entry%%|*}" >&2
    exit 2
  fi
done

# Block: shared-host Docker bans (constitution XXIII, issue #1487).
# The deploy host also runs other labs' containers, so (1) no prune variant
# ever runs, on any host, and (2) every teardown target must be ours, named
# with the label-suite prefix. The hook sees the command string, not who owns
# a container, so (2) is a proxy: it catches a mistyped name or a compose call
# missing its project name. Any target it cannot read — a substitution, stdin,
# a container ID — is refused rather than guessed at.
block_docker() {
  echo "❌ Blocked: $1 — the deploy host is shared with other labs (constitution XXIII, issue #1487)." >&2
  exit 2
}

# Quotes, backslashes, brackets and separators glued to a token are syntax,
# not its value: the shell strips them before docker ever sees the word.
STRIP_CHARS="\\\\'\"\`(){};&|"
# Target values are held to a stricter shape: with only quoting removed, a
# target must be a plain label-suite name, so an expansion ($X, {a,b}, *)
# that the shell would turn into something else is refused.
QUOTE_CHARS="\\\\'\"\`"
OURS_RE='^label-suite[A-Za-z0-9_.-]*$'
# grep scans line by line, so rejoin backslash-newline continuations first.
BACKSLASH_NEWLINE=$'\\\n'
DOCKER_COMMAND="${COMMAND//"$BACKSLASH_NEWLINE"/ }"

# Checks every target from token $1 onward; $2 names the command for the message.
check_docker_targets() {
  local k="$1" r t count=0
  (( fed == 0 )) || block_docker "$2 under xargs, parallel or find -exec takes targets the hook cannot read"
  while (( k < n )); do
    r="${toks[k]}"
    t="${r//[$QUOTE_CHARS]/}"
    # Redirections and comments count only when unquoted, so match the raw token.
    case "$r" in
      [0-9]*'>'*|'>'*|'<'*) [[ "$r" == *[\<\>] ]] && k=$((k + 1)); k=$((k + 1)); continue ;;
      '#'*) break ;;
    esac
    case "$t" in
      -t|--time|-s|--signal|--timeout) k=$((k + 1)) ;;
      -*) ;;
      *) [[ "$t" =~ $OURS_RE ]] || block_docker "$2 target '$r' is not a plain label-suite name"
         count=$((count + 1)) ;;
    esac
    k=$((k + 1))
  done
  (( count > 0 )) || block_docker "$2 needs explicit label-suite targets, not stdin or a substitution"
}

# Prune and raw socket access are checked across the whole command with the
# quoting removed, not per invocation: quotes can split the words
# (do""cker, pr''une) and a variable can hold the command name (D=docker;
# $D system prune). Prose naming both words is refused too — the ban has no
# escape hatch, so write such text to a file and pass it with -F / --body-file.
DOCKER_PLAIN="${DOCKER_COMMAND//[$QUOTE_CHARS]/}"
if printf '%s\n' "$DOCKER_PLAIN" | grep -qE '(^|[^[:alnum:]_-])docker' \
  && printf '%s\n' "$DOCKER_PLAIN" | grep -qE '(^|[^[:alnum:]_-])prune([^[:alnum:]_-]|$)'; then
  block_docker "docker prune is banned on every host"
fi
if printf '%s\n' "$DOCKER_PLAIN" | grep -q 'docker\.sock' \
  && printf '%s\n' "$DOCKER_PLAIN" | grep -qE '(^|[^[:alnum:]_-])(curl|wget|socat|nc|ncat)([^[:alnum:]_-]|$)'; then
  block_docker "raw Docker socket access is banned; use the docker CLI so these checks apply"
fi

while IFS= read -r seg; do
  read -r -a toks <<< "$seg"
  n=${#toks[@]}
  names=()
  fed=0
  i=0
  # Skip the CMD_START prefix, keeping any COMPOSE_PROJECT_NAME it sets and
  # noting a feeder that would append targets the hook never sees.
  while (( i < n )); do
    t="${toks[i]//[$STRIP_CHARS]/}"
    case "$t" in
      COMPOSE_PROJECT_NAME=*) names+=("${toks[i]#*=}") ;;
      xargs|parallel|-exec|-execdir|-ok|-okdir|*/xargs|*/parallel) fed=1 ;;
    esac
    case "${t##*/}" in docker|docker-compose) break ;; esac
    i=$((i + 1))
  done
  (( i < n )) || continue
  word="${toks[i]//[$STRIP_CHARS]/}"
  word="${word##*/}"

  j=$((i + 1))
  sub=compose
  if [[ "$word" == docker ]]; then
    while (( j < n )); do
      case "${toks[j]//[$STRIP_CHARS]/}" in
        -H|--host|-c|--context|--config|-l|--log-level|--tlscacert|--tlscert|--tlskey) j=$((j + 2)) ;;
        -*) j=$((j + 1)) ;;
        *) break ;;
      esac
    done
    (( j < n )) || continue
    sub="${toks[j]//[$STRIP_CHARS]/}"
    next=""
    (( j + 1 < n )) && next="${toks[j + 1]//[$STRIP_CHARS]/}"
    case "$sub" in
      rm|stop|kill|restart|rmi) check_docker_targets $((j + 1)) "docker $sub" ;;
      container) case "$next" in rm|remove|stop|kill|restart) check_docker_targets $((j + 2)) "docker $sub $next" ;; esac ;;
      image|volume|network) case "$next" in rm|remove) check_docker_targets $((j + 2)) "docker $sub $next" ;; esac ;;
    esac
    [[ "$sub" == compose ]] && j=$((j + 1))
  fi
  [[ "$sub" == compose ]] || continue

  teardown=""
  while (( j < n )); do
    t="${toks[j]//[$STRIP_CHARS]/}"
    case "$t" in
      -p|--project-name)
        names+=("$( (( j + 1 < n )) && printf '%s' "${toks[j + 1]}")")
        j=$((j + 1)) ;;
      --project-name=*) names+=("${toks[j]#*=}") ;;
      -p?*) names+=("${toks[j]#*-p}") ;;
      down|stop|rm|kill|restart) teardown="$t" ;;
    esac
    j=$((j + 1))
  done
  [[ -n "$teardown" ]] || continue
  (( fed == 0 )) || block_docker "docker compose $teardown under xargs, parallel or find -exec is banned"
  (( ${#names[@]} > 0 )) || block_docker "docker compose $teardown must name a label-suite project with -p"
  for (( k = 0; k < ${#names[@]}; k++ )); do
    [[ "${names[k]//[$QUOTE_CHARS]/}" =~ $OURS_RE ]] || block_docker "docker compose $teardown project '${names[k]}' is not label-suite"
  done
done < <(printf '%s\n' "$DOCKER_COMMAND" | grep -oE "${CMD_START}['\"\\\\]*docker(-compose)?['\"]*([[:space:]][^;&|)]*)?")

exit 0
