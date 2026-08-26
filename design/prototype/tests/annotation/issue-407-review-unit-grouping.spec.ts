import { test, expect } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

/* Review-unit visual grouping (issue #407, RV-08). T014 (dry_run, 3
 * annotators x 5 samples) flattens to 15 consecutive reviewer rows with no
 * visual signal marking where one sample's group of review units ends and
 * the next begins -- every row repeats the same sample ID text, so
 * scanning cost grows linearly with reviewer count / min_reviewers.
 *
 * Fix: mark the first row of each sample's review-unit group
 * (`data-group-start="true"`, drawn with a top border separating it from
 * the previous group) and de-emphasize the repeated sample-ID text on
 * continuation rows (`list-review-id-muted` -- a style-only change; the ID
 * text itself is unchanged so it doesn't disturb existing row lookups such
 * as annotation-review-flow-demo-rows.spec.ts's `toContainText('dry-01-all-agree')`
 * assertion on rows 0-2).
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md FR-055
 */

test.describe('issue #407 -- review-unit rows are visually grouped by sample', () => {
  test('T014 dry_run: group boundaries land exactly at each 3-annotator sample', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));

    const rows = page.getByTestId('ws-sample-item');
    await expect(rows).toHaveCount(15);

    const groupStartIndexes = [0, 3, 6, 9, 12];
    for (let i = 0; i < 15; i += 1) {
      await expect(rows.nth(i)).toHaveAttribute(
        'data-group-start',
        groupStartIndexes.includes(i) ? 'true' : 'false'
      );
    }
  });

  test('T014 dry_run: continuation rows de-emphasize the repeated sample ID, group-start rows do not', async ({
    page,
  }) => {
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));

    const rows = page.getByTestId('ws-sample-item');

    // Group-start row (index 0): full-emphasis ID cell.
    await expect(rows.nth(0).getByTestId('list-review-id')).not.toHaveClass(/list-review-id-muted/);
    // Continuation rows (indexes 1-2 of the same dry-01-all-agree group):
    // de-emphasized, but the sample ID text itself must still be present.
    await expect(rows.nth(1).getByTestId('list-review-id')).toHaveClass(/list-review-id-muted/);
    await expect(rows.nth(2).getByTestId('list-review-id')).toHaveClass(/list-review-id-muted/);
    await expect(rows.nth(1).getByTestId('list-review-id')).toHaveText('dry-01-all-agree');
    await expect(rows.nth(2).getByTestId('list-review-id')).toHaveText('dry-01-all-agree');

    // Next group's start row (index 3) goes back to full emphasis.
    await expect(rows.nth(3).getByTestId('list-review-id')).not.toHaveClass(/list-review-id-muted/);
  });

  test('T015 official_run: single-annotator-per-sample groups are all group-starts, never muted', async ({
    page,
  }) => {
    await page.goto(buildListUrl({ task_id: 'T015', role: 'reviewer', run_type: 'official_run' }));

    const rows = page.getByTestId('ws-sample-item');
    await expect(rows).toHaveCount(4);

    for (let i = 0; i < 4; i += 1) {
      await expect(rows.nth(i)).toHaveAttribute('data-group-start', 'true');
      await expect(rows.nth(i).getByTestId('list-review-id')).not.toHaveClass(/list-review-id-muted/);
    }
  });
});
