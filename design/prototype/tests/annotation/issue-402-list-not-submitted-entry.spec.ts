import { test, expect } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

/* Unreconciled sample count / missing entry for not-submitted units
 * (issue #402, RV-07). T015's ofs-05-not-submitted sample deliberately
 * ships no mock row (see annotation-workspace.data.js), so
 * buildReviewUnitRows() renders zero rows for it -- the reviewer list's
 * context banner still counts it in "共 5 筆資料" (dataset sample count)
 * while the table/pagination only ever show the 4 samples that produced a
 * review unit, and there was no way to reach ofs-05 from the list at all.
 *
 * Fix keeps the existing "共 N 筆資料" dataset-sample-count convention
 * (unchanged for every other task, including multi-annotator tasks like
 * T001/T014 whose table naturally has MORE rows than the banner count) and
 * instead makes the gap explicit: an additional note explains how many
 * samples are excluded because nobody submitted, with a direct entry into
 * each such sample's (already-correct, per issue #307) workspace empty
 * state.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md FR-064
 */

test.describe('issue #402 -- not-submitted samples get an explanation and an entry', () => {
  test('T015 reviewer banner explains the excluded sample and links to it', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T015', role: 'reviewer', run_type: 'official_run' }));

    /* issue #596 FR-093: the table now carries only the units assigned to
       this reviewer (T015's 4 units spread 1-for-1 over the 4-strong roster,
       so reviewer_wang holds exactly one). The note below is deliberately
       NOT reviewer-scoped -- "nobody submitted" is a property of the sample,
       not of an assignment -- so it must still read 1, from all 5 dataset
       records against all 4 review units in the task. */
    await expect(page.getByTestId('ws-sample-item')).toHaveCount(1);

    const note = page.getByTestId('list-not-submitted-note');
    await expect(note).toBeVisible();
    await expect(note).toContainText('其中 1 筆尚未提交，不計入審核清單');

    const entry = page.getByTestId('list-not-submitted-entry');
    await expect(entry).toHaveCount(1);
    await expect(entry).toContainText('ofs-05-not-submitted');

    await entry.click();
    await expect(page).toHaveURL(/task_id=T015/);
    await expect(page).toHaveURL(/sample_id=ofs-05-not-submitted/);
    await expect(page).toHaveURL(/role=reviewer/);
    await expect(page).toHaveURL(/run_type=official_run/);

    // The workspace side of this was already correct (issue #307) -- the
    // entry must land on that exact empty state.
    await expect(page.getByTestId('ws-review-empty-unit')).toBeVisible();
  });

  test('the note stays hidden for tasks where every sample has a review unit', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'official_run' }));

    await expect(page.getByTestId('list-not-submitted-note')).toBeHidden();
    await expect(page.getByTestId('list-not-submitted-entry')).toHaveCount(0);
  });

  test('the note is annotator-role-agnostic: never renders for the annotator view', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T015', role: 'annotator', run_type: 'official_run' }));

    await expect(page.getByTestId('list-not-submitted-note')).toBeHidden();
  });

  test('switching to English localizes the note and entry label', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T015', role: 'reviewer', run_type: 'official_run' }));

    await page.locator('#langToggle').click();
    await expect(page.getByTestId('list-not-submitted-note')).toContainText(
      '1 sample(s) not yet submitted, excluded from this review list'
    );
    await expect(page.getByTestId('list-not-submitted-entry')).toContainText('ofs-05-not-submitted');
  });
});
