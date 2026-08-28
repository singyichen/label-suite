import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, skipGuidelineModal } from './_workspace-helpers';

/* Pre-submit summary: interactability guard + default-collapsed disclosure
 * (issue #515 ②, spec 015 FR-077 / AC-3.42 / AC-3.44).
 *
 * ② -a (bug, existing contract): AC-3.42 already scopes the pre-submit
 * summary to an INTERACTIVE review unit (not empty, not finalized, not the
 * arbitration layout). renderReviewerWorkspace() honours that by hiding the
 * panel ahead of its three early returns -- but two other paths call
 * renderReviewSubmitSummary() directly and only ever checked currentRole:
 * the capture-phase input/change/click watcher on #annotationPreview, and
 * the a / r decision shortcut. So a single click anywhere in a read-only
 * unit resurrected the summary, which then nagged for a decision on a page
 * that has no submit button at all.
 *
 * ② -b (new): the summary is a wall of text that is only ever load-bearing
 * while some output type is still undecided. It now collapses by default
 * and force-expands exactly then, with the collapsed header carrying the
 * decision counts so the collapsed state is still a signal.
 *
 * The collapsed state is DERIVED from the decisions on every render and is
 * never persisted (AC-3.44), so it cannot become a second source of truth
 * next to the FR-014S / AC-6.10 draft-restore contract.
 */

const T001_OFFICIAL = buildWorkspaceUrl({
  task_id: 'T001',
  sample_id: 'sent-001',
  role: 'reviewer',
  run_type: 'official_run',
});

/* T013 (absa-001) ships three output types, so it is the case where some
 * rows are decided and others are not at the same time. */
const T013_OFFICIAL = buildWorkspaceUrl({
  task_id: 'T013',
  sample_id: 'absa-001',
  role: 'reviewer',
  run_type: 'official_run',
});

function t015ReviewerUrl(sampleId: string): string {
  return buildWorkspaceUrl({
    task_id: 'T015', sample_id: sampleId, role: 'reviewer',
    run_type: 'official_run', reviewer_id: 'reviewer_chen',
  });
}

/* watchReviewEdits() re-derives on a setTimeout(..., 0) queued by the click
 * itself. Queueing our own 0ms timer AFTER the click and awaiting it is
 * therefore deterministic (same-delay timers fire FIFO): once it resolves,
 * the buggy re-render has already had its turn. No arbitrary sleep. */
async function flushReviewEditWatcher(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
}

const panel = (page: Page) => page.getByTestId('ws-review-submit-summary');
const toggle = (page: Page) => page.getByTestId('ws-review-summary-toggle');
const summaryRow = (page: Page, outKey: string) =>
  page.locator(`[data-testid="ws-review-summary-row"][data-outkey="${outKey}"]`);

async function expectNoSummaryAtAll(page: Page): Promise<void> {
  await expect(panel(page)).toBeHidden();
  await expect(page.getByTestId('ws-review-summary-row')).toHaveCount(0);
  await expect(page.getByTestId('ws-review-summary-pending')).toHaveCount(0);
  await expect(page.getByTestId('ws-review-summary-effect')).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

/* ── ② -a: non-interactive units never grow a summary ─────────────────── */

test.describe('Non-interactive review units never render the pre-submit summary (issue #515)', () => {
  test('finalized unit: a click in the preview does not resurrect the summary', async ({ page }) => {
    await page.goto(t015ReviewerUrl('ofs-01-agree-gold'));
    await dismissGuidelineModal(page);

    // Precondition: this really is the read-only finalized layout.
    await expect(page.getByTestId('ws-review-finalized-card')).toBeVisible();
    await expect(page.getByTestId('ws-review-submit-btn')).toBeHidden();
    await expectNoSummaryAtAll(page);

    await page.getByTestId('ws-review-finalized-card').click();
    await flushReviewEditWatcher(page);

    await expectNoSummaryAtAll(page);
  });

  test('finalized unit: the a / r decision shortcuts do not resurrect the summary', async ({ page }) => {
    await page.goto(t015ReviewerUrl('ofs-01-agree-gold'));
    await dismissGuidelineModal(page);
    await expect(page.getByTestId('ws-review-finalized-card')).toBeVisible();

    await page.keyboard.press('a');
    await expectNoSummaryAtAll(page);
    await page.keyboard.press('r');
    await expectNoSummaryAtAll(page);
  });

  test('empty unit: neither a click nor the shortcuts resurrect the summary', async ({ page }) => {
    await page.goto(t015ReviewerUrl('ofs-05-not-submitted'));
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-review-empty-unit')).toBeVisible();
    await expectNoSummaryAtAll(page);

    await page.getByTestId('ws-review-empty-unit').click();
    await flushReviewEditWatcher(page);
    await expectNoSummaryAtAll(page);

    await page.keyboard.press('a');
    await expectNoSummaryAtAll(page);
  });

  test('arbitration layout: neither a click nor the shortcuts resurrect the summary', async ({ page }) => {
    const url = buildWorkspaceUrl({
      task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'official_run',
      annotator_id: 'kioleemg12', reviewer_id: 'reviewer_chen',
    });
    await page.goto(url);
    await dismissGuidelineModal(page);

    /* annotator says sad, reviewer_wang says fear -> DISPUTED under
     * min_reviewers = 1, and reviewer_chen (can_arbitrate, not a
     * participant) gets the arbitration layout. */
    await page.evaluate(() => {
      const data = (window as unknown as {
        LabelSuiteAnnotationWorkspaceData: {
          markSampleSubmitted: (
            taskId: string, role: string, runType: string, sampleId: string,
            payload: unknown, historySummary: string,
            identity: { annotatorId?: string; reviewerId?: string }
          ) => void;
        };
      }).LabelSuiteAnnotationWorkspaceData;
      data.markSampleSubmitted(
        'T001', 'annotator', 'official_run', 'sent-001',
        { previewState: { single_label: { selected: 'sad' } } }, '',
        { annotatorId: 'kioleemg12' }
      );
      data.markSampleSubmitted(
        'T001', 'reviewer', 'official_run', 'sent-001',
        { previewState: { single_label: { selected: 'fear' } } }, '',
        { annotatorId: 'kioleemg12', reviewerId: 'reviewer_wang' }
      );
    });
    await page.reload();
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-arbitration-card')).toBeVisible();
    await expectNoSummaryAtAll(page);

    await page.getByTestId('ws-arbitration-card').click();
    await flushReviewEditWatcher(page);
    await expectNoSummaryAtAll(page);

    await page.keyboard.press('a');
    await expectNoSummaryAtAll(page);
  });
});

/* ── ② -b: default-collapsed disclosure ───────────────────────────────── */

test.describe('The pre-submit summary is a disclosure derived from the decisions (issue #515)', () => {
  test('an undecided output type force-expands the summary', async ({ page }) => {
    await page.goto(T001_OFFICIAL);
    await dismissGuidelineModal(page);

    await expect(toggle(page)).toBeVisible();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
    // Forced open: collapsing away the only place naming the blocking rows
    // is not on offer while the submit gate is still closed.
    await expect(toggle(page)).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByTestId('ws-review-summary-pending')).toBeVisible();
    await expect(page.getByTestId('ws-review-summary-effect')).toBeVisible();
    await expect(summaryRow(page, 'single_label')).toBeVisible();
  });

  test('deciding every output type collapses the summary by default', async ({ page }) => {
    await page.goto(T001_OFFICIAL);
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-review-row-approve').click();

    await expect(toggle(page)).toBeVisible();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle(page)).not.toHaveAttribute('aria-disabled', 'true');
    // The panel itself stays on screen -- only its body is collapsed.
    await expect(panel(page)).toBeVisible();
    await expect(summaryRow(page, 'single_label')).toBeHidden();
    await expect(page.getByTestId('ws-review-summary-effect')).toBeHidden();
  });

  test('the collapsed header names both halves and carries the decision counts', async ({ page }) => {
    await page.goto(T013_OFFICIAL);
    await dismissGuidelineModal(page);

    const approve = page.getByTestId('ws-review-row-approve');
    const reject = page.getByTestId('ws-review-row-reject');
    await expect(approve).toHaveCount(3);

    await approve.nth(0).click();
    await reject.nth(1).click();

    // Both halves are named, so the collapsed header is not a blank title.
    await expect(toggle(page)).toContainText('送出前確認');
    await expect(toggle(page)).toContainText('送出後影響');
    // ...and the counts make the collapsed state itself a signal.
    await expect(toggle(page)).toContainText('3 個輸出類型');
    await expect(toggle(page)).toContainText('1 通過');
    await expect(toggle(page)).toContainText('1 退回');
    await expect(toggle(page)).toContainText('1 尚未決策');
    // One row still undecided -> still force-expanded.
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');

    await approve.nth(2).click();
    await expect(toggle(page)).toContainText('2 通過');
    await expect(toggle(page)).toContainText('1 退回');
    await expect(toggle(page)).not.toContainText('尚未決策');
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  });

  test('expanding a collapsed summary restores every existing field and data-* contract', async ({ page }) => {
    await page.goto(T001_OFFICIAL);
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-review-row-approve').click();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');

    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');

    const row = summaryRow(page, 'single_label');
    await expect(row).toHaveCount(1);
    await expect(row).toBeVisible();
    await expect(row).toHaveAttribute('data-decision', 'approve');
    await expect(row).toHaveAttribute('data-changed', 'false');
    await expect(row.getByTestId('ws-review-summary-original')).toBeVisible();
    await expect(row.getByTestId('ws-review-summary-original')).not.toHaveAttribute('data-answer', '');
    await expect(row.getByTestId('ws-review-summary-corrected')).toBeVisible();
    await expect(row.getByTestId('ws-review-summary-corrected')).not.toHaveAttribute('data-answer', '');
    await expect(row.getByTestId('ws-review-summary-note')).toBeVisible();
    await expect(row.getByTestId('ws-review-summary-note')).toHaveAttribute('data-kind', 'approve-unchanged');

    const pending = page.getByTestId('ws-review-summary-pending');
    await expect(pending).toBeVisible();
    await expect(pending).toHaveAttribute('data-count', '0');

    const effect = page.getByTestId('ws-review-summary-effect');
    await expect(effect).toBeVisible();
    await expect(effect).toHaveAttribute('data-run-type', 'official_run');
  });

  test('the collapsed state is derived, never persisted: a manual expand does not survive the next render', async ({ page }) => {
    await page.goto(T001_OFFICIAL);
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-review-row-approve').click();
    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');

    // Re-deciding (approve -> approve cancels it) re-renders the summary,
    // which re-derives the disclosure state from the decisions alone.
    await page.getByTestId('ws-review-row-approve').click();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
    await page.getByTestId('ws-review-row-approve').click();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');

    // ...and a reload starts from the derived state too, not a stored one.
    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
    await page.reload();
    await dismissGuidelineModal(page);
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  });
});
