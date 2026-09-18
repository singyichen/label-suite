#!/usr/bin/env bash
# check-demo-data-parity.sh — Verify the prototype seed and the docs copy of
# the review-flow demo dataset stay in parity.
#
# Usage:
#   ./scripts/check-demo-data-parity.sh [<root>]
#   ./scripts/check-demo-data-parity.sh --help
#
# The review-flow demo dataset exists as two independently hand-written
# copies: the prototype seed
# (design/prototype/pages/task-management/task-detail.data.js, profiles
# T014-T016's datasetFileName/datasetRecords) and the docs copy
# (docs/product/example-data/review-flow-*.json). Nothing compared them,
# so drift between the two went silent (issue #815,
# openspec/changes/retire-stale-review-demo-fixtures).
#
# What it checks, using the prototype seed as the source of truth:
#   - the set of docs/product/example-data/review-flow-*.json files equals
#     the set of review-flow-*.json datasetFileNames among the prototype
#     profiles (missing/orphan files are reported by name)
#   - for every matched pair, the datasetRecords match row-by-row: record
#     count, id, text, and gold_label (differences name the file and, where
#     the id itself did not drift, the record id)
#
# Exit codes:
#   0  full parity
#   1  one or more differences (reported on stderr, each line prefixed
#      "DEMO_DATA_PARITY:")
#   2  usage or IO error (e.g. the prototype seed cannot be read)

set -euo pipefail

usage() {
    cat <<'EOF'
usage: scripts/check-demo-data-parity.sh [<root>] [--help]

Compares the review-flow-*.json demo dataset between the prototype seed
(design/prototype/pages/task-management/task-detail.data.js) and the docs
copy (docs/product/example-data/review-flow-*.json). <root> defaults to the
repository root.
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    usage
    exit 0
fi

if [[ $# -gt 1 ]]; then
    echo "ERROR: at most one <root> argument expected" >&2
    exit 2
fi

ROOT="${1:-}"
if [[ -z "$ROOT" ]]; then
    ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
else
    ROOT="$(cd "$ROOT" 2>/dev/null && pwd)" || { echo "ERROR: root not found: $1" >&2; exit 2; }
fi

PROTOTYPE_DATA="$ROOT/design/prototype/pages/task-management/task-detail.data.js"
EXAMPLE_DATA_DIR="$ROOT/docs/product/example-data"

node - "$PROTOTYPE_DATA" "$EXAMPLE_DATA_DIR" <<'NODE'
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const [, , prototypeDataPath, exampleDataDir] = process.argv;

function reportDiff(message) {
  console.error(`DEMO_DATA_PARITY: ${message}`);
}

let src;
try {
  src = fs.readFileSync(prototypeDataPath, 'utf8');
} catch (e) {
  console.error(`ERROR: cannot read prototype seed: ${prototypeDataPath} (${e.message})`);
  process.exit(2);
}

// The seed is an IIFE that does `(function (global) { ...
// global.LabelSuiteTaskDetailData = {...}; }(window));`, so the sandbox
// only needs to provide `window`.
const sandbox = { window: {} };
try {
  vm.runInNewContext(src, sandbox, { filename: prototypeDataPath });
} catch (e) {
  console.error(`ERROR: cannot evaluate prototype seed: ${prototypeDataPath} (${e.message})`);
  process.exit(2);
}

const profiles =
  sandbox.window &&
  sandbox.window.LabelSuiteTaskDetailData &&
  sandbox.window.LabelSuiteTaskDetailData.profiles;
if (!profiles) {
  console.error(
    `ERROR: prototype seed did not expose window.LabelSuiteTaskDetailData.profiles: ${prototypeDataPath}`
  );
  process.exit(2);
}

const REVIEW_FLOW_RE = /^review-flow-.*\.json$/;

const prototypeFilesToRecords = new Map();
for (const taskId of Object.keys(profiles)) {
  const profile = profiles[taskId];
  const fileName = profile && profile.datasetFileName;
  if (typeof fileName === 'string' && REVIEW_FLOW_RE.test(fileName)) {
    prototypeFilesToRecords.set(
      fileName,
      Array.isArray(profile.datasetRecords) ? profile.datasetRecords : []
    );
  }
}

let docsFiles;
try {
  docsFiles = fs.readdirSync(exampleDataDir).filter((name) => REVIEW_FLOW_RE.test(name));
} catch (e) {
  console.error(`ERROR: cannot read docs example-data directory: ${exampleDataDir} (${e.message})`);
  process.exit(2);
}

let hasDiff = false;

const prototypeFileSet = new Set(prototypeFilesToRecords.keys());
const docsFileSet = new Set(docsFiles);

for (const fileName of prototypeFileSet) {
  if (!docsFileSet.has(fileName)) {
    reportDiff(`missing docs copy for prototype dataset file ${fileName}`);
    hasDiff = true;
  }
}
for (const fileName of docsFileSet) {
  if (!prototypeFileSet.has(fileName)) {
    reportDiff(`orphan docs file with no matching prototype profile: ${fileName}`);
    hasDiff = true;
  }
}

for (const fileName of prototypeFileSet) {
  if (!docsFileSet.has(fileName)) continue;

  const prototypeRecords = prototypeFilesToRecords.get(fileName);
  const docsPath = path.join(exampleDataDir, fileName);
  let docsRecords;
  try {
    docsRecords = JSON.parse(fs.readFileSync(docsPath, 'utf8'));
  } catch (e) {
    console.error(`ERROR: cannot read/parse docs dataset file: ${docsPath} (${e.message})`);
    process.exit(2);
  }
  if (!Array.isArray(docsRecords)) {
    reportDiff(`${fileName}: docs copy is not a JSON array`);
    hasDiff = true;
    continue;
  }

  if (prototypeRecords.length !== docsRecords.length) {
    reportDiff(
      `${fileName}: record count differs (prototype ${prototypeRecords.length}, docs ${docsRecords.length})`
    );
    hasDiff = true;
  }

  const rowCount = Math.min(prototypeRecords.length, docsRecords.length);
  for (let i = 0; i < rowCount; i++) {
    const p = prototypeRecords[i] || {};
    const d = docsRecords[i] || {};
    if (p.id !== d.id) {
      reportDiff(`${fileName}: record id differs at position ${i} (prototype "${p.id}", docs "${d.id}")`);
      hasDiff = true;
      continue;
    }
    if (p.text !== d.text) {
      reportDiff(`${fileName}: record ${p.id} text differs`);
      hasDiff = true;
    }
    if (p.gold_label !== d.gold_label) {
      reportDiff(`${fileName}: record ${p.id} gold_label differs`);
      hasDiff = true;
    }
  }
}

if (hasDiff) {
  process.exit(1);
}

console.log(
  `OK: ${prototypeFileSet.size} review-flow dataset file(s) in parity between prototype seed and docs copy`
);
NODE
