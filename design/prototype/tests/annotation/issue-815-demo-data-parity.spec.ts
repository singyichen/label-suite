import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, cpSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

/* Issue #815 (OpenSpec change retire-stale-review-demo-fixtures) task 4.1,
 * PR-815-D. The review-flow demo dataset exists as two independently
 * hand-written copies -- the prototype seed
 * (design/prototype/pages/task-management/task-detail.data.js, profiles
 * T014-T016's datasetFileName/datasetRecords) and the docs copy
 * (docs/product/example-data/review-flow-*.json) -- with no gate comparing
 * them, so drift between the two is silent (see proposal.md's "Why": 2 of
 * 20 rows had already drifted). This spec pins the behavior of the check
 * itself, `scripts/check-demo-data-parity.sh [<root>]`, which task 4.2 has
 * not created yet:
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
 * Expected failure today (before Green): the script does not exist, so
 * every `bash <missing-script>` invocation exits 127. Test 1 (which expects
 * exit 0) fails on that mismatch. Tests 2-5 pin their own failing-exit
 * assertion first (127 is a non-zero number, so that assertion alone
 * would pass even pre-Green) but then assert the output names the specific
 * file/record; bash's own "No such file or directory" message contains
 * none of those strings, so all five tests fail today for the right
 * reason. Mutation cases work on a throwaway mkdtempSync() copy of only
 * the two needed subtrees -- the real tree is never mutated.
 *
 * Traceability: openspec/changes/retire-stale-review-demo-fixtures/tasks.md
 *   4.1; proposal.md "第二個獨立缺陷：示範資料有兩份副本且已漂移"
 */

const REPO_ROOT = resolve(__dirname, '../../../../');
const SCRIPT_PATH = resolve(REPO_ROOT, 'scripts/check-demo-data-parity.sh');
const PROTOTYPE_DATA_REL = 'design/prototype/pages/task-management/task-detail.data.js';
const EXAMPLE_DATA_DIR_REL = 'docs/product/example-data';

interface DemoRecord {
  id: string;
  text: string;
  gold_label: string;
}

interface CheckResult {
  status: number | null;
  output: string;
}

function runCheck(root: string): CheckResult {
  const result = spawnSync('bash', [SCRIPT_PATH, root], { encoding: 'utf8' });
  return {
    status: result.status,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

/* Copies only the two subtrees the check reads -- never the whole repo --
 * into a fresh temp root that a test can freely mutate. */
function makeMutableRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'issue-815-demo-data-parity-'));

  const prototypeDataDest = join(root, PROTOTYPE_DATA_REL);
  mkdirSync(dirname(prototypeDataDest), { recursive: true });
  cpSync(resolve(REPO_ROOT, PROTOTYPE_DATA_REL), prototypeDataDest);

  cpSync(resolve(REPO_ROOT, EXAMPLE_DATA_DIR_REL), join(root, EXAMPLE_DATA_DIR_REL), {
    recursive: true,
  });

  return root;
}

function cleanupRoot(root: string): void {
  rmSync(root, { recursive: true, force: true });
}

function readRecords(path: string): DemoRecord[] {
  return JSON.parse(readFileSync(path, 'utf8')) as DemoRecord[];
}

function writeRecords(path: string, records: DemoRecord[]): void {
  writeFileSync(path, `${JSON.stringify(records, null, 2)}\n`);
}

function expectFailingExit(status: number | null, context: string): void {
  expect(typeof status, `${context}: exit status must be a number, got ${String(status)}`).toBe(
    'number'
  );
  expect(status, `${context}: exit status must not be 0`).not.toBe(0);
}

test.describe('scripts/check-demo-data-parity.sh (issue #815)', () => {
  test('current tree has full prototype/docs parity and exits 0', () => {
    const { status, output } = runCheck(REPO_ROOT);
    expect(status, output).toBe(0);
  });

  test('a drifted record text in review-flow-official-multi.json fails and names the file and record id', () => {
    const root = makeMutableRoot();
    try {
      const targetPath = join(root, EXAMPLE_DATA_DIR_REL, 'review-flow-official-multi.json');
      const records = readRecords(targetPath);
      const record = records.find((r) => r.id === 'ofm-03-awaiting-arbitration');
      expect(record, 'fixture record ofm-03-awaiting-arbitration must exist before mutation').toBeTruthy();
      record!.text = `${record!.text}（drifted for issue #815 red contract）`;
      writeRecords(targetPath, records);

      const { status, output } = runCheck(root);
      expectFailingExit(status, output);
      expect(output).toContain('review-flow-official-multi.json');
      expect(output).toContain('ofm-03-awaiting-arbitration');
    } finally {
      cleanupRoot(root);
    }
  });

  test('a renamed record id in review-flow-dry-run.json fails and names the file', () => {
    const root = makeMutableRoot();
    try {
      const targetPath = join(root, EXAMPLE_DATA_DIR_REL, 'review-flow-dry-run.json');
      const records = readRecords(targetPath);
      expect(records.length, 'fixture must have at least one record').toBeGreaterThan(0);
      records[0].id = 'drifted-id';
      writeRecords(targetPath, records);

      const { status, output } = runCheck(root);
      expectFailingExit(status, output);
      expect(output).toContain('review-flow-dry-run.json');
    } finally {
      cleanupRoot(root);
    }
  });

  test('an orphan example-data file with no matching prototype profile fails and names the orphan file', () => {
    const root = makeMutableRoot();
    try {
      const orphanPath = join(root, EXAMPLE_DATA_DIR_REL, 'review-flow-orphan.json');
      writeFileSync(orphanPath, '[]\n');

      const { status, output } = runCheck(root);
      expectFailingExit(status, output);
      expect(output).toContain('review-flow-orphan.json');
    } finally {
      cleanupRoot(root);
    }
  });

  test('a drifted gold_label in review-flow-official-single.json fails and names the record id', () => {
    const root = makeMutableRoot();
    try {
      const targetPath = join(root, EXAMPLE_DATA_DIR_REL, 'review-flow-official-single.json');
      const records = readRecords(targetPath);
      expect(records.length, 'fixture must have at least one record').toBeGreaterThan(0);
      const record = records[0];
      record.gold_label = record.gold_label === 'positive' ? 'negative' : 'positive';
      writeRecords(targetPath, records);

      const { status, output } = runCheck(root);
      expectFailingExit(status, output);
      expect(output).toContain(record.id);
    } finally {
      cleanupRoot(root);
    }
  });
});
