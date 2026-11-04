#!/usr/bin/env bash
# codex-companion.sh — Run the Codex plugin's companion script by a fixed repo path.
#
# Usage (from project root):
#   scripts/codex-companion.sh <companion args...>
#   scripts/codex-companion.sh setup --json
#   scripts/codex-companion.sh task --write --background --cwd <worktree> --prompt-file <file> --json
#
# IMPORTANT — why this wrapper exists:
#   The companion lives under a plugin-versioned cache path
#   (~/.claude/plugins/cache/openai-codex/codex/<version>/scripts/codex-companion.mjs),
#   so a permission rule naming it directly needs wildcards that also admit
#   `node -e ...` or any same-named script (issue #1314). .claude/settings.json
#   allow-lists only `Bash(scripts/codex-companion.sh *)`; every argument goes to
#   the companion, never to node itself.
#
# How it works:
#   Resolves installPath for codex@openai-codex from
#   ~/.claude/plugins/installed_plugins.json (most recently updated entry whose
#   companion file exists), then execs node on it with NODE_OPTIONS cleared so
#   the caller cannot inject --require/--eval through the environment.

set -euo pipefail

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js not found. Install Node 20+ and try again." >&2
  exit 1
fi

COMPANION="$(env -u NODE_OPTIONS node -e '
const fs = require("node:fs");
const path = require("node:path");
const registry = path.join(require("node:os").homedir(), ".claude/plugins/installed_plugins.json");
let entries = [];
try {
  entries = JSON.parse(fs.readFileSync(registry, "utf8")).plugins["codex@openai-codex"] ?? [];
} catch {}
const hit = entries
  .map((e) => ({ at: e.lastUpdated ?? "", file: path.join(e.installPath ?? "", "scripts/codex-companion.mjs") }))
  .filter((e) => fs.existsSync(e.file))
  .sort((a, b) => b.at.localeCompare(a.at))[0];
if (hit) process.stdout.write(hit.file);
')"

if [ -z "$COMPANION" ]; then
  echo "Error: Codex plugin (codex@openai-codex) not found in ~/.claude/plugins/installed_plugins.json." >&2
  echo "Install it with /plugin, then retry." >&2
  exit 1
fi

exec env -u NODE_OPTIONS node "$COMPANION" "$@"
