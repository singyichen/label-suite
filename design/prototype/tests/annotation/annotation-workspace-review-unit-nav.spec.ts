import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* Reviewer navigation walks review units (spec 015 v4.3.0, FR-056).
 *
 * v4.2.0 flattened annotation-list to one row per review unit
 * (sample × annotator), but the workspace stayed sample-shaped: the left
 * column iterated datasetRecords with no role branch, the progress
 * denominator was datasetRecords.length, and `annotator_id` was resolved
 * once at boot and never touched again. Entering on sent-001 × kioleemg12
 * therefore left the reviewer with no way to reach sent-001 × 113450022 --
 * 下一筆 jumped straight to sent-002, still as kioleemg12 -- so the
 * "同意 → 下一筆" fast path could only ever cover one annotator per pass.
 *
 * The roster comes from the same getReviewerMockRows() the list flattens,
 * so the two pages' counts cannot drift.
 *
 * Annotators are unaffected by construction: their own submission IS the
 * unit, exactly one per record.
 */

/* T001 ships 5 dataset records × 3 annotators. sent-001's answers are
 * kioleemg12 positive / 113450022 negative / tony0950127 positive, which is
 * what makes the seeded chip a usable probe for "which annotator am I on". */
const T001_UNITS = 15;
const RUN_TYPES = ['dry_run', 'official_run'] as const;

/* Same guard the task-new and dashboard specs carry: the prototype's static
 * server intermittently drops a keep-alive socket under parallel load, and a
 * dropped annotation-workspace.config.js leaves an unrendered page whose
 * symptoms (0 entries, nav buttons stuck at their static markup state) look
 * exactly like a navigation bug. Confirmed here from a failure trace:
 * net::ERR_SOCKET_NOT_CONNECTED on annotation-workspace.config.js. */
test.describe.configure({ mode: 'serial', retries: 2 });

test.describe('The reviewer left column lists review units', () => {
  for (const runType of RUN_TYPES) {
    test(`${runType}: 5 samples × 3 annotators renders ${T001_UNITS} entries`, async ({ page }) => {
      await skipGuidelineModal(page);
      await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: runType }));

      await expect(page.getByTestId('ws-sample-item')).toHaveCount(T001_UNITS);
    });

    test(`${runType}: consecutive entries repeat the sample and advance the annotator`, async ({ page }) => {
      await skipGuidelineModal(page);
      await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: runType }));

      const annotators = page.getByTestId('ws-sample-annotator');
      await expect(annotators.nth(0)).toHaveText('kioleemg12');
      await expect(annotators.nth(1)).toHaveText('113450022');
      await expect(annotators.nth(2)).toHaveText('tony0950127');
      await expect(annotators.nth(3)).toHaveText('kioleemg12');
    });

    test(`${runType}: the progress denominator counts review units`, async ({ page }) => {
      await skipGuidelineModal(page);
      await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: runType }));

      await expect(page.getByTestId('ws-progress-text')).toHaveText(`0 / ${T001_UNITS} 已提交`);
    });
  }
});

test.describe('Prev / next move between annotators of the same sample', () => {
  test('下一筆 reaches the second annotator of sent-001, not sent-002', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'dry_run' }));

    // kioleemg12 answered positive.
    await expect(page.getByTestId('ws-single-label-chip-positive')).toHaveAttribute('aria-pressed', 'true');

    await page.getByTestId('ws-next-btn').click();

    const active = page.locator('.sample-item.active');
    await expect(active.getByTestId('ws-sample-annotator')).toHaveText('113450022');
    // 113450022 answered negative -- the panel must re-seed to their answer.
    await expect(page.getByTestId('ws-single-label-chip-negative')).toHaveAttribute('aria-pressed', 'true');
  });

  test('上一筆 walks back into the previous sample last annotator', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-002', role: 'reviewer', run_type: 'dry_run' }));

    await page.getByTestId('ws-prev-btn').click();

    const active = page.locator('.sample-item.active');
    await expect(active.getByTestId('ws-sample-annotator')).toHaveText('tony0950127');
    await expect(active).toContainText('sent-001');
  });

  test('下一筆 stays enabled on the last sample until its last annotator', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(
      buildWorkspaceUrl({
        task_id: 'T001',
        sample_id: 'sent-005',
        role: 'reviewer',
        run_type: 'dry_run',
        annotator_id: 'kioleemg12',
      })
    );

    // Sample-shaped nav disabled this at sent-005; two units still follow.
    await expect(page.getByTestId('ws-next-btn')).toBeEnabled();

    await page.getByTestId('ws-next-btn').click();
    await page.getByTestId('ws-next-btn').click();

    await expect(page.locator('.sample-item.active').getByTestId('ws-sample-annotator')).toHaveText('tony0950127');
    await expect(page.getByTestId('ws-next-btn')).toBeDisabled();
  });

  test('上一筆 is disabled on the very first review unit', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(
      buildWorkspaceUrl({
        task_id: 'T001',
        sample_id: 'sent-001',
        role: 'reviewer',
        run_type: 'dry_run',
        annotator_id: 'kioleemg12',
      })
    );

    await expect(page.getByTestId('ws-prev-btn')).toBeDisabled();
  });
});

test.describe('Selecting an entry switches the reviewed annotator', () => {
  test('clicking the third entry seeds that annotator answer', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'dry_run' }));

    await page.getByTestId('ws-sample-item').nth(2).click();

    await expect(page.locator('.sample-item.active').getByTestId('ws-sample-annotator')).toHaveText('tony0950127');
    await expect(page.getByTestId('ws-single-label-chip-positive')).toHaveAttribute('aria-pressed', 'true');
  });

  /* sampleAnswers was keyed by sample_id alone, so an edit made while
     reviewing one annotator resurfaced on the next annotator of the SAME
     sample -- the reviewer would see their own correction attributed to
     someone who never gave it. */
  test('an edit on one annotator does not leak onto the next', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'dry_run' }));

    // Correct kioleemg12 (positive) to neutral, then move to 113450022.
    await page.getByTestId('ws-single-label-chip-neutral').click();
    await expect(page.getByTestId('ws-single-label-chip-neutral')).toHaveAttribute('aria-pressed', 'true');

    await page.getByTestId('ws-next-btn').click();

    await expect(page.getByTestId('ws-single-label-chip-negative')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('ws-single-label-chip-neutral')).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('The annotator view keeps its sample-shaped navigation', () => {
  test('one entry per dataset record, no annotator line, sample denominator', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'dry_run' }));

    await expect(page.getByTestId('ws-sample-item')).toHaveCount(5);
    await expect(page.getByTestId('ws-sample-annotator')).toHaveCount(0);
    await expect(page.getByTestId('ws-progress-text')).toHaveText('0 / 5 已提交');
  });
});
