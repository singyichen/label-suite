import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/* Issue #815 (OpenSpec change retire-stale-review-demo-fixtures) task 3.1,
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
 *      (多數決 / majority), and even-tie wording (平手 / tie). All three
 *      still describe `min_reviewers=N` counts and review-flow-official-multi
 *      still says 多數決 today, so this requirement is red for every file
 *      read, not just the tie fixture.
 *
 * Expected failure today (before Green): both existence checks fail (the
 * tie fixtures still exist), and all three typical_tasks checks fail (every
 * surviving config's string still matches at least one retired-vocabulary
 * pattern). Read via Node fs directly -- no page needed, this pins doc
 * fixture content, not rendered prototype behavior.
 *
 * Traceability: openspec/changes/retire-stale-review-demo-fixtures/tasks.md
 *   3.1; specs/annotation/015-annotation-workspace/spec.md FR-093
 */

const REPO_ROOT = resolve(__dirname, '../../../../');
const EXAMPLE_DATA_DIR = resolve(REPO_ROOT, 'docs/product/example-data');
const TASK_CONFIGS_DIR = resolve(REPO_ROOT, 'docs/product/task-configs');

const RETIRED_VOCAB: Array<{ label: string; pattern: RegExp }> = [
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

test.describe('docs/product review configs match the single-owner relay model (issue #815)', () => {
  test('docs/product/example-data no longer has the even-tie fixture', () => {
    const tiePath = resolve(EXAMPLE_DATA_DIR, 'review-flow-official-tie.json');
    expect(existsSync(tiePath), tiePath).toBe(false);
  });

  test('docs/product/task-configs no longer has the even-tie fixture', () => {
    const tiePath = resolve(TASK_CONFIGS_DIR, 'review-flow-official-tie.json');
    expect(existsSync(tiePath), tiePath).toBe(false);
  });

  for (const fileName of SURVIVING_CONFIGS) {
    test(`${fileName} typical_tasks carries no retired-vocabulary wording`, () => {
      const configPath = resolve(TASK_CONFIGS_DIR, fileName);
      const config = JSON.parse(readFileSync(configPath, 'utf8')) as { typical_tasks: string[] };
      const joined = config.typical_tasks.join('\n');
      for (const { label, pattern } of RETIRED_VOCAB) {
        expect(joined, `${fileName} matched retired vocabulary: ${label}`).not.toMatch(pattern);
      }
    });
  }
});
