import { test, expect } from '@playwright/test';
import {
  assertNoPageErrors,
  buildWorkspaceUrl,
  dismissGuidelineModal,
  skipGuidelineModal,
  trackPageErrors,
} from './_workspace-helpers';

/* Issue #192: AC-3.15 / AC-6.4 (spec 015) scope the "退回" (reject) ->
 * annotator-bucket-rolls-back-to-pending mechanism (FR-014I) to
 * `run_type = official_run` only. `dry_run` has no "退回個人重標" channel --
 * individual quality problems there are handled by the IAA gate and re-run,
 * never by flipping one annotator's sample back to `待標記`.
 *
 * The `ws-review-row-reject` button itself stays rendered identically for
 * both run types (spec 015 v4.0.0 AC-3.33 unifies the review card and
 * forbids any run_type-based presentation branch; see also
 * annotation-workspace-review-card.spec.ts's "converged across run types"
 * suite, which already exercises clicking it in dry_run). What must differ
 * is the SUBMIT-TIME EFFECT: clicking reject and submitting in dry_run must
 * never demote the sample back to `pending`, while official_run keeps doing
 * so (regression guard below).
 */

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

async function submitAsAnnotator(
  page: import('@playwright/test').Page,
  runType: 'dry_run' | 'official_run'
) {
  await page.goto(
    buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: runType })
  );
  await dismissGuidelineModal(page);
  await page.getByTestId('ws-single-label-chip-negative').click();
  await page.getByTestId('ws-submit-btn').click();
}

function readStatus(
  page: import('@playwright/test').Page,
  runType: 'dry_run' | 'official_run'
) {
  return page.evaluate(
    (rt) =>
      (window as any).LabelSuiteAnnotationWorkspaceData.getSampleStatus(
        'T001',
        'annotator',
        rt,
        'sent-001',
        {}
      ),
    runType
  );
}

test('dry_run: rejecting a row and submitting never moves the sample back to pending', async ({ page }) => {
  const errors = trackPageErrors(page);

  await submitAsAnnotator(page, 'dry_run');
  expect(await readStatus(page, 'dry_run')).toBe('submitted');

  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'dry_run' }));
  await dismissGuidelineModal(page);

  await page.getByTestId('ws-review-row-reject').click();
  await page.getByTestId('ws-review-submit-btn').click();
  await expect(page.locator('#toastMsg')).toHaveText('審查已提交');

  expect(await readStatus(page, 'dry_run')).toBe('submitted');
  assertNoPageErrors(errors);
});

test('official_run: rejecting a row and submitting still reopens the sample for re-annotation (regression guard)', async ({ page }) => {
  await submitAsAnnotator(page, 'official_run');
  expect(await readStatus(page, 'official_run')).toBe('submitted');

  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'official_run' }));
  await dismissGuidelineModal(page);

  await page.getByTestId('ws-review-row-reject').click();
  await page.getByTestId('ws-review-submit-btn').click();
  await expect(page.locator('#toastMsg')).toHaveText('審查已提交');

  expect(await readStatus(page, 'official_run')).toBe('pending');
});
