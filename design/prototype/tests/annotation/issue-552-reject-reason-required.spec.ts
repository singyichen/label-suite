import { test, expect, type Page } from '@playwright/test';
import {
  assertNoPageErrors,
  buildWorkspaceUrl,
  dismissGuidelineModal,
  skipGuidelineModal,
  trackPageErrors,
  type RunType,
} from './_workspace-helpers';

/* Issue #552: a reject used to carry no reason at all -- FR-016A's mandatory
 * audit reason only covered corrections/deletions, and the free-text note
 * field was removed by FR-075 because it never persisted. In official_run a
 * reject rolls the sample back to the annotator (FR-014I) who then sees one
 * red `rejected` badge in the history panel and nothing else.
 *
 * This spec pins the replacement (spec 015 v4.58.0):
 *   - pressing 退回 on an outKey expands a REQUIRED reason field
 *     `ws-review-reject-reason[data-outkey]` under that row; 通過 hides it
 *     (FR-016A, AC-3.48) -- for BOTH run types (FR-053: no run_type branch
 *     inside the review card).
 *   - submit validation becomes "one decision per outKey AND every reject
 *     carries a reason"; a missing reason blocks submit with a toast naming
 *     the outKeys, derived from the same source the FR-083 toast already
 *     uses (AC-3.47).
 *   - the official_run `ws-review-note` bubble says the reason is shown to
 *     the annotator (FR-070 point 6, AC-3.40); dry_run does not.
 *   - the reason persists with the reviewer submission and is rendered to
 *     the official_run annotator as a `ws-rework-reasons` banner on the
 *     rework todo (FR-085, AC-2.14); dry_run never renders it.
 */

const ANNOTATOR = 'kioleemg12';
const REASON = '情緒判讀有誤，請重看第二句';

const REASON_VISIBILITY_ZH = '退回理由會顯示給標記員';

async function submitAsAnnotator(page: Page, runType: RunType) {
  await page.goto(
    buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: runType, annotator_id: ANNOTATOR })
  );
  await dismissGuidelineModal(page);
  await page.getByTestId('ws-single-label-chip-negative').click();
  await page.getByTestId('ws-submit-btn').click();
  await expect(page.locator('#toastMsg')).toHaveText('已提交');
}

async function openReviewer(page: Page, runType: RunType) {
  await page.goto(
    buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: runType, annotator_id: ANNOTATOR })
  );
  await dismissGuidelineModal(page);
}

async function openAnnotator(page: Page, runType: RunType) {
  await page.goto(
    buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: runType, annotator_id: ANNOTATOR })
  );
  await dismissGuidelineModal(page);
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('reject expands a required reason field on the row (FR-016A / AC-3.48)', () => {
  for (const runType of ['dry_run', 'official_run'] as RunType[]) {
    test(`${runType}: the field appears on reject, hides on approve, and hides again when reject is cancelled`, async ({
      page,
    }) => {
      const errors = trackPageErrors(page);
      await openReviewer(page, runType);

      const reason = page.getByTestId('ws-review-reject-reason');
      await expect(reason).toHaveCount(0);

      await page.getByTestId('ws-review-row-reject').click();
      await expect(reason).toHaveCount(1);
      await expect(reason).toBeVisible();
      await expect(reason).toHaveAttribute('data-outkey', 'single_label');
      await expect(reason).toHaveAttribute('required', '');
      // The field lives inside the row it judges.
      await expect(page.getByTestId('ws-review-row').getByTestId('ws-review-reject-reason')).toHaveCount(1);

      await page.getByTestId('ws-review-row-approve').click();
      await expect(reason).toBeHidden();

      await page.getByTestId('ws-review-row-reject').click();
      await expect(reason).toBeVisible();
      await page.getByTestId('ws-review-row-reject').click(); // cancel back to undecided
      await expect(reason).toBeHidden();

      assertNoPageErrors(errors);
    });
  }

  test('a multi-output task renders one reason field per rejected outKey', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T013', sample_id: 'absa-001', role: 'reviewer', run_type: 'official_run' }));
    await dismissGuidelineModal(page);

    const rejects = page.getByTestId('ws-review-row-reject');
    await expect(rejects).toHaveCount(3);
    await rejects.nth(0).click();
    await rejects.nth(2).click();

    const reasons = page.locator('[data-testid="ws-review-reject-reason"]:visible');
    await expect(reasons).toHaveCount(2);
    const outKeys = await reasons.evaluateAll((els) => els.map((el) => el.getAttribute('data-outkey')));
    expect(new Set(outKeys).size).toBe(2);
  });

  test('the typed reason survives a reload together with its reject decision (FR-014S)', async ({ page }) => {
    await openReviewer(page, 'official_run');
    await page.getByTestId('ws-review-row-reject').click();
    await page.getByTestId('ws-review-reject-reason').fill(REASON);

    await page.reload();
    await dismissGuidelineModal(page);
    await expect(page.getByTestId('ws-review-row-reject')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('ws-review-reject-reason')).toHaveValue(REASON);
  });
});

test.describe('submit requires a reason on every reject and the toast names the outKeys (FR-083 / AC-3.47)', () => {
  test('a reject with an empty reason blocks submit and marks the button as blocked', async ({ page }) => {
    await submitAsAnnotator(page, 'official_run');
    await openReviewer(page, 'official_run');

    const submit = page.getByTestId('ws-review-submit-btn');
    await page.getByTestId('ws-review-row-reject').click();
    // Not `disabled` / `aria-disabled`: the click must still reach the
    // FR-083 toast so it can name the outKeys.
    await expect(submit).toHaveAttribute('data-submit-blocked', 'reason');
    await expect(submit).toBeEnabled();

    await submit.click();
    await expect(page.locator('#toastMsg')).toHaveText('請填寫以下輸出類型的退回理由：single_label');

    await page.getByTestId('ws-review-reject-reason').fill(REASON);
    await expect(submit).not.toHaveAttribute('data-submit-blocked', 'reason');
    await submit.click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');
  });

  test('whitespace-only is not a reason', async ({ page }) => {
    await openReviewer(page, 'dry_run');
    await page.getByTestId('ws-review-row-reject').click();
    await page.getByTestId('ws-review-reject-reason').fill('   ');
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('請填寫以下輸出類型的退回理由：single_label');
  });

  test('undecided and reason-less outKeys share one blocking list (T013)', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T013', sample_id: 'absa-001', role: 'reviewer', run_type: 'official_run' }));
    await dismissGuidelineModal(page);

    const rejects = page.getByTestId('ws-review-row-reject');
    const approves = page.getByTestId('ws-review-row-approve');
    await rejects.nth(0).click(); // rejected, no reason
    await approves.nth(1).click(); // decided
    // nth(2) left undecided

    await page.getByTestId('ws-review-submit-btn').click();
    const toast = page.locator('#toastMsg');
    // Both blockers are named, and the list is the FR-083 one (undecided present).
    await expect(toast).toContainText('請完成以下輸出類型的審核決策：');
    const text = await toast.textContent();
    const listed = (text ?? '').split('：')[1].split('、');
    expect(listed).toHaveLength(2);

    // Fill the reason -> only the undecided one remains in the list.
    await page.locator('[data-testid="ws-review-reject-reason"]:visible').fill(REASON);
    await page.getByTestId('ws-review-submit-btn').click();
    const after = await toast.textContent();
    expect((after ?? '').split('：')[1].split('、')).toHaveLength(1);
  });
});

test.describe('the official_run tooltip says the reason is shown to the annotator (FR-070 point 6 / AC-3.40)', () => {
  test('official_run zh copy contains the sentence, dry_run does not', async ({ page }) => {
    await openReviewer(page, 'official_run');
    await expect(page.getByTestId('ws-review-note-bubble')).toContainText(REASON_VISIBILITY_ZH);

    await openReviewer(page, 'dry_run');
    await expect(page.getByTestId('ws-review-note-bubble')).not.toContainText(REASON_VISIBILITY_ZH);
  });

  test('en copy carries the same sentence for official_run only', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
    });
    await openReviewer(page, 'official_run');
    await expect(page.getByTestId('ws-review-note-bubble')).toContainText('The reject reason is shown to the annotator.');
    await openReviewer(page, 'dry_run');
    await expect(page.getByTestId('ws-review-note-bubble')).not.toContainText('reject reason is shown');
  });
});

test.describe('the annotator sees the reject reasons on the rework todo (FR-085 / AC-2.14)', () => {
  test('official_run: reason, reviewer and time per outKey, rejected panel marked', async ({ page }) => {
    const errors = trackPageErrors(page);
    await submitAsAnnotator(page, 'official_run');

    await openReviewer(page, 'official_run');
    await page.getByTestId('ws-review-row-reject').click();
    await page.getByTestId('ws-review-reject-reason').fill(REASON);
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');

    // The persisted reviewer submission carries the reason.
    const persisted = await page.evaluate(() => {
      const data = (window as any).LabelSuiteAnnotationWorkspaceData;
      return data.readReviewerSubmissions('T001', 'official_run', 'sent-001', { annotatorId: 'kioleemg12' });
    });
    expect(persisted).toHaveLength(1);
    expect(persisted[0].answers.reasons).toEqual({ single_label: REASON });

    await openAnnotator(page, 'official_run');
    const banner = page.getByTestId('ws-rework-reasons');
    await expect(banner).toHaveCount(1);
    const row = banner.getByTestId('ws-rework-reason-row');
    await expect(row).toHaveCount(1);
    await expect(row).toHaveAttribute('data-outkey', 'single_label');
    await expect(row).toContainText(REASON);
    await expect(row).toContainText('reviewer_wang');
    await expect(row).toContainText(/\d{2}\/\d{2} \d{2}:\d{2}/);
    // The banner sits at the top of the workspace, before the question card.
    const firstChildTestid = await page.locator('#annotationPreview > *').first().getAttribute('data-testid');
    expect(firstChildTestid).toBe('ws-rework-reasons');
    await expect(page.getByTestId('ws-output-panel-single_label')).toHaveAttribute('data-rework-rejected', 'true');

    // The history panel keeps its existing red badge, unchanged.
    await page.getByTestId('ws-guideline-tab-history').click();
    await expect(page.locator('.history-action-badge.rejected')).toHaveCount(1);

    assertNoPageErrors(errors);
  });

  test('dry_run: a reject with a reason never renders the banner', async ({ page }) => {
    await submitAsAnnotator(page, 'dry_run');
    await openReviewer(page, 'dry_run');
    await page.getByTestId('ws-review-row-reject').click();
    await page.getByTestId('ws-review-reject-reason').fill(REASON);
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');

    await openAnnotator(page, 'dry_run');
    await expect(page.getByTestId('ws-annotation-card')).toBeVisible();
    await expect(page.getByTestId('ws-rework-reasons')).toHaveCount(0);
  });

  test('a sample with no rework todo renders no banner', async ({ page }) => {
    await openAnnotator(page, 'official_run');
    await expect(page.getByTestId('ws-annotation-card')).toBeVisible();
    await expect(page.getByTestId('ws-rework-reasons')).toHaveCount(0);
  });

  test('the seeded T017 rework backlog (oft-05) ships with a reason', async ({ page }) => {
    await page.goto(
      buildWorkspaceUrl({ task_id: 'T017', sample_id: 'oft-05-pending-review', role: 'annotator', run_type: 'official_run', annotator_id: ANNOTATOR })
    );
    await dismissGuidelineModal(page);
    const row = page.getByTestId('ws-rework-reasons').getByTestId('ws-rework-reason-row');
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('reviewer_wang');
  });
});
