/* Static gate over the docs-side demo fixtures and task configs (migrated by
 * issue #1059 group 2 out of three Playwright specs: the destination of every
 * move-out row whose subject lives under docs/product/, not under
 * design/prototype/).
 *
 * Grouped by that subject rather than by originating spec file, because the
 * artifact a mutation has to touch to prove each guard works is a file in
 * docs/product/ for all eight cases.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../../');
const EXAMPLE_DATA_DIR = resolve(REPO_ROOT, 'docs/product/example-data');
const TASK_CONFIGS_DIR = resolve(REPO_ROOT, 'docs/product/task-configs');

/* ------------------------------------------------------------------ *
 * From tests/annotation/issue-815-docs-review-configs-current-model.spec.ts
 *
 * Issue #815 (OpenSpec change retire-stale-review-demo-fixtures) task 3.1,
 * PR-815-C. tasks.md 3.1 pins two things about the docs/product review-flow
 * demo copies now that spec 015 FR-093 fixes the review model to a single-
 * owner relay -- each review unit has exactly one assigned reviewer, so
 * there is never more than one reviewer to disagree with:
 *
 *   1. the "even tie between 2 reviewers" demo (min_reviewers=2, structurally
 *      impossible under single-owner relay -- there is no second reviewer to
 *      tie with) no longer has a same-named fixture under either
 *      docs/product/example-data or docs/product/task-configs, paired with
 *      group 2's prototype-side removal of the same demo task (T017).
 *   2. the three surviving review-flow task configs' `typical_tasks` strings
 *      no longer teach a reader vocabulary the model can't produce:
 *      `min_reviewers=` finalization-threshold numbers, majority-vote wording
 *      (多數決 / majority), and even-tie wording (平手 / tie).
 *
 * Reads docs fixtures via node:fs directly -- no page needed, this pins doc
 * fixture content, not rendered prototype behavior.
 *
 * Traceability: openspec/changes/retire-stale-review-demo-fixtures/tasks.md
 *   3.1; specs/annotation/015-annotation-workspace/spec.md FR-093
 * ------------------------------------------------------------------ */

const RETIRED_VOCAB = [
  { label: 'min_reviewers= threshold', pattern: /min_reviewers\s*=/ },
  { label: '多數決 (majority, Chinese)', pattern: /多數決/ },
  { label: '平手 (tie, Chinese)', pattern: /平手/ },
  { label: 'majority (English)', pattern: /\bmajority\b/i },
  { label: 'tie (English)', pattern: /\btie\b/i },
];

const SURVIVING_CONFIGS = [
  'review-flow-dry-run.json',
  'review-flow-official-single.json',
  'review-flow-official-multi.json',
];

describe('docs/product review configs match the single-owner relay model (issue #815)', () => {
  it('docs/product/example-data no longer has the even-tie fixture', () => {
    const tiePath = resolve(EXAMPLE_DATA_DIR, 'review-flow-official-tie.json');
    assert.strictEqual(
      existsSync(tiePath),
      false,
      `the retired even-tie fixture must not exist: ${tiePath}`,
    );
  });

  it('docs/product/task-configs no longer has the even-tie fixture', () => {
    const tiePath = resolve(TASK_CONFIGS_DIR, 'review-flow-official-tie.json');
    assert.strictEqual(
      existsSync(tiePath),
      false,
      `the retired even-tie fixture must not exist: ${tiePath}`,
    );
  });

  for (const fileName of SURVIVING_CONFIGS) {
    it(`${fileName} typical_tasks carries no retired-vocabulary wording`, () => {
      const configPath = resolve(TASK_CONFIGS_DIR, fileName);
      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      const joined = config.typical_tasks.join('\n');
      for (const { label, pattern } of RETIRED_VOCAB) {
        assert.doesNotMatch(
          joined,
          pattern,
          `${fileName} matched retired vocabulary: ${label}`,
        );
      }
    });
  }
});

/* ------------------------------------------------------------------ *
 * From tests/annotation/issue-627-demo-sample-id-vocabulary.spec.ts
 *
 * Issue #627 item 3 (OpenSpec change rename-misleading-review-sample-ids).
 *
 * T016's review units are string-coupled across three consumers: the
 * workspace answer seed (map key) plus its review seed row, task-detail's
 * REVIEW_FLOW_UNITS copy, and the docs/product/example-data fixture. Two ids
 * still encode interim states that v5.0.0 removed from REVIEW_UNIT_STATUS
 * (`approved`, `modified`). This case is the docs-fixture third of that
 * three-consumer pin; the two rendered consumers stay in the Playwright spec.
 *
 * RETIRED_STATE_WORD / RENAMED are restated here rather than shared: the
 * surviving rendered cases live in a .spec.ts the Node gate cannot import.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md FR-044,
 *   AC-4.31, AC-4.36; openspec/changes/rename-misleading-review-sample-ids
 * ------------------------------------------------------------------ */

const RETIRED_STATE_WORD = /approved|modified/;
const RENAMED = {
  'ofm-02-reviewer-accepts-a': '已定稿 · 已鎖定',
  'ofm-03-awaiting-arbitration': '爭議中 · 未定稿',
};

describe('T016 demo sample ids carry no retired review-state word (issue #627 item 3)', () => {
  it('docs example-data fixture uses the same renamed ids', () => {
    const fixturePath = resolve(EXAMPLE_DATA_DIR, 'review-flow-official-multi.json');
    const ids = JSON.parse(readFileSync(fixturePath, 'utf8')).map((row) => row.id);
    for (const id of ids) {
      assert.doesNotMatch(
        id,
        RETIRED_STATE_WORD,
        `fixture record id "${id}" still names a retired review state (approved/modified)`,
      );
    }
    for (const sampleId of Object.keys(RENAMED)) {
      assert.ok(
        ids.includes(sampleId),
        `fixture must carry the renamed id "${sampleId}"; got ${JSON.stringify(ids)}`,
      );
    }
  });
});

/* ------------------------------------------------------------------ *
 * From tests/task-management/task-new-output-type-preview.spec.ts
 *
 * The two output-type preview fixtures the task-new dataset preview feeds on
 * must keep the shape and offset convention their output type declares:
 * entity_recognition offsets are INCLUSIVE of `end`, sequence_tagging spans
 * are half-open and non-overlapping. Neither case opens task-new.html -- both
 * are pure fs reads of docs/product/example-data.
 *
 * Traceability: specs/task-management/013-task-new/spec.md FR-003g-2
 * ------------------------------------------------------------------ */

describe('docs/product/example-data output-type fixtures (spec 013 FR-003g-2)', () => {
  it('Entity Recognition fixture uses current fields and valid inclusive offsets', () => {
    const records = JSON.parse(
      readFileSync(join(EXAMPLE_DATA_DIR, 'entity-recognition.json'), 'utf8'),
    );

    for (const record of records) {
      assert.match(
        record.id,
        /^entity-recognition-\d{3}$/,
        `record id "${record.id}" must match entity-recognition-NNN`,
      );
      assert.ok(
        Array.isArray(record.gold_entities),
        `${record.id}: gold_entities must be an array`,
      );
      for (const entity of record.gold_entities) {
        assert.strictEqual(
          record.text.substring(entity.start, entity.end + 1),
          entity.text,
          `${record.id}: inclusive offsets [${entity.start},${entity.end}] must slice out "${entity.text}"`,
        );
      }
    }
  });

  it('Sequence Tagging default fixture uses half-open character-offset spans', () => {
    const records = JSON.parse(
      readFileSync(join(EXAMPLE_DATA_DIR, 'sequence-tagging.json'), 'utf8'),
    );

    assert.ok(
      records.length >= 4,
      `the sequence-tagging fixture must keep at least 4 records, got ${records.length}`,
    );
    for (const record of records) {
      assert.match(
        record.id,
        /^sequence-tagging-\d{3}$/,
        `record id "${record.id}" must match sequence-tagging-NNN`,
      );
      assert.ok(Array.isArray(record.spans), `${record.id}: spans must be an array`);
      assert.ok(record.spans.length > 0, `${record.id}: spans must not be empty`);
      /* sequence_tagging spans are flat and half-open, so each one must start at
         or after the previous one ends. */
      let previousEnd = 0;
      for (const span of record.spans) {
        assert.match(span.label, /^[A-Z]+$/, `${record.id}: span label "${span.label}" must be UPPERCASE`);
        assert.ok(
          span.start >= previousEnd,
          `${record.id}: span start ${span.start} overlaps the previous span ending at ${previousEnd}`,
        );
        assert.ok(
          span.end > span.start,
          `${record.id}: span [${span.start},${span.end}) must be non-empty and half-open`,
        );
        assert.ok(
          span.end <= record.text.length,
          `${record.id}: span end ${span.end} exceeds text length ${record.text.length}`,
        );
        previousEnd = span.end;
      }
    }

    const englishRecord = records.find((record) => !/\p{Script=Han}/u.test(record.text));
    assert.ok(
      englishRecord !== undefined,
      'the sequence-tagging fixture must keep one non-Han record so word-level offsets are exercised',
    );
    assert.deepStrictEqual(
      englishRecord.spans.map((span) => englishRecord.text.slice(span.start, span.end)),
      ['TSMC', 'Taipei', 'today'],
      'the non-Han record\'s half-open spans must slice out exactly TSMC / Taipei / today',
    );
  });
});
