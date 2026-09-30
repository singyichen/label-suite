/* Script gate for scripts/check-demo-data-parity.sh (migrated by issue #1059
 * group 2 out of tests/annotation/issue-815-demo-data-parity.spec.ts).
 *
 * Issue #815 (OpenSpec change retire-stale-review-demo-fixtures) task 4.1,
 * PR-815-D. The review-flow demo dataset exists as two independently
 * hand-written copies -- the prototype seed
 * (design/prototype/pages/task-management/task-detail.data.js, profiles
 * T014-T016's datasetFileName/datasetRecords) and the docs copy
 * (docs/product/example-data/review-flow-*.json) -- with no gate comparing
 * them, so drift between the two is silent (see proposal.md's "Why": 2 of
 * 20 rows had already drifted). This file pins the behavior of the check
 * itself, `scripts/check-demo-data-parity.sh [<root>]`:
 *
 *   - full parity on the current tree exits 0
 *   - a drifted record `text` is reported: non-zero exit, output names both
 *     the offending file and the offending record id
 *   - a drifted record `id` is reported: non-zero exit, output names the
 *     offending file
 *   - an extra docs-side file with no matching prototype profile is
 *     reported: non-zero exit, output names the orphan file
 *   - a drifted `gold_label` is reported: non-zero exit, output names the
 *     offending record id
 *
 * Mutation cases work on a throwaway mkdtempSync() copy of only the two
 * needed subtrees -- the real tree is never mutated.
 *
 * Traceability: REGRESSION-RISK: the prototype seed (task-detail.data.js) and
 *   docs/product/example-data are two hand-written copies of the same demo
 *   data with no canonical FR behind them, so they drift silently. (Guard
 *   added by task 4.1 of the archived OpenSpec change
 *   `retire-stale-review-demo-fixtures`.)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, cpSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../../');
const SCRIPT_PATH = resolve(REPO_ROOT, 'scripts/check-demo-data-parity.sh');
const PROTOTYPE_DATA_REL = 'design/prototype/pages/task-management/task-detail.data.js';
const EXAMPLE_DATA_DIR_REL = 'docs/product/example-data';

function runCheck(root) {
  const result = spawnSync('bash', [SCRIPT_PATH, root], { encoding: 'utf8' });
  return {
    status: result.status,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

/* Copies only the two subtrees the check reads -- never the whole repo --
 * into a fresh temp root that a test can freely mutate. */
function makeMutableRoot() {
  const root = mkdtempSync(join(tmpdir(), 'issue-815-demo-data-parity-'));

  const prototypeDataDest = join(root, PROTOTYPE_DATA_REL);
  mkdirSync(dirname(prototypeDataDest), { recursive: true });
  cpSync(resolve(REPO_ROOT, PROTOTYPE_DATA_REL), prototypeDataDest);

  cpSync(resolve(REPO_ROOT, EXAMPLE_DATA_DIR_REL), join(root, EXAMPLE_DATA_DIR_REL), {
    recursive: true,
  });

  return root;
}

function cleanupRoot(root) {
  rmSync(root, { recursive: true, force: true });
}

function readRecords(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeRecords(path, records) {
  writeFileSync(path, `${JSON.stringify(records, null, 2)}\n`);
}

function assertFailingExit(status, output, context) {
  assert.strictEqual(
    typeof status,
    'number',
    `${context}: exit status must be a number, got ${String(status)}\n${output}`,
  );
  assert.notStrictEqual(
    status,
    0,
    `${context}: check-demo-data-parity.sh must exit non-zero on this drift, got 0. Output was:\n${output}`,
  );
}

function assertNames(output, needle, context) {
  assert.ok(
    output.includes(needle),
    `${context}: check output must name "${needle}", got:\n${output}`,
  );
}

describe('scripts/check-demo-data-parity.sh (issue #815)', () => {
  it('current tree has full prototype/docs parity and exits 0', () => {
    const { status, output } = runCheck(REPO_ROOT);
    assert.strictEqual(
      status,
      0,
      `check-demo-data-parity.sh must exit 0 on an undrifted tree, got ${String(status)}:\n${output}`,
    );
  });

  it('a drifted record text in review-flow-official-multi.json fails and names the file and record id', () => {
    const root = makeMutableRoot();
    try {
      const targetPath = join(root, EXAMPLE_DATA_DIR_REL, 'review-flow-official-multi.json');
      const records = readRecords(targetPath);
      const record = records.find((r) => r.id === 'ofm-03-awaiting-arbitration');
      assert.ok(record, 'fixture record ofm-03-awaiting-arbitration must exist before mutation');
      record.text = `${record.text}（drifted for issue #815 red contract）`;
      writeRecords(targetPath, records);

      const { status, output } = runCheck(root);
      assertFailingExit(status, output, 'a drifted record text');
      assertNames(output, 'review-flow-official-multi.json', 'a drifted record text');
      assertNames(output, 'ofm-03-awaiting-arbitration', 'a drifted record text');
    } finally {
      cleanupRoot(root);
    }
  });

  it('a renamed record id in review-flow-dry-run.json fails and names the file', () => {
    const root = makeMutableRoot();
    try {
      const targetPath = join(root, EXAMPLE_DATA_DIR_REL, 'review-flow-dry-run.json');
      const records = readRecords(targetPath);
      assert.ok(records.length > 0, 'fixture must have at least one record');
      records[0].id = 'drifted-id';
      writeRecords(targetPath, records);

      const { status, output } = runCheck(root);
      assertFailingExit(status, output, 'a renamed record id');
      assertNames(output, 'review-flow-dry-run.json', 'a renamed record id');
    } finally {
      cleanupRoot(root);
    }
  });

  it('an orphan example-data file with no matching prototype profile fails and names the orphan file', () => {
    const root = makeMutableRoot();
    try {
      const orphanPath = join(root, EXAMPLE_DATA_DIR_REL, 'review-flow-orphan.json');
      writeFileSync(orphanPath, '[]\n');

      const { status, output } = runCheck(root);
      assertFailingExit(status, output, 'an orphan example-data file');
      assertNames(output, 'review-flow-orphan.json', 'an orphan example-data file');
    } finally {
      cleanupRoot(root);
    }
  });

  it('a drifted gold_label in review-flow-official-single.json fails and names the record id', () => {
    const root = makeMutableRoot();
    try {
      const targetPath = join(root, EXAMPLE_DATA_DIR_REL, 'review-flow-official-single.json');
      const records = readRecords(targetPath);
      assert.ok(records.length > 0, 'fixture must have at least one record');
      const record = records[0];
      record.gold_label = record.gold_label === 'positive' ? 'negative' : 'positive';
      writeRecords(targetPath, records);

      const { status, output } = runCheck(root);
      assertFailingExit(status, output, 'a drifted gold_label');
      assertNames(output, record.id, 'a drifted gold_label');
    } finally {
      cleanupRoot(root);
    }
  });
});
