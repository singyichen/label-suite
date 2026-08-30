import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* Empty review unit gate (issue #307, spec 015 FR-053 gate sentence).
 *
 * A review unit is "truly empty" when the reviewed annotator has NO stored
 * submission AND the roster has no REVIEWER_MOCK_ROWS stand-in for the
 * group -- the exact determination that makes the FR-064 context banner
 * show 尚無標記提交. T015's ofs-05-not-submitted is the one seeded demo
 * point: before this fix the reviewer still got ✕/✓-less but SUBMITTABLE
 * chrome (getReviewerRows() returns [], so handleReviewSubmit's
 * all-decided loop passed vacuously) and could file an empty review
 * against nothing.
 *
 * The gate must NOT fire when either source exists: every other T015
 * sample (stored seed submissions) and every pre-T014 task (mock-row
 * fallback, FR-044a) keeps the full review card. And it must release
 * live: once the annotator actually submits ofs-05, the reviewer's next
 * load gets the full card and can finalize the unit.
 */

function reviewerUrl(sampleId: string): string {
  return buildWorkspaceUrl({
    task_id: 'T015', sample_id: sampleId, role: 'reviewer',
    run_type: 'official_run', reviewer_id: 'reviewer_chen',
  });
}

async function expectFullReviewCard(page: Page) {
  await expect(page.getByTestId('ws-review-row-approve')).toHaveCount(1);
  await expect(page.getByTestId('ws-review-row-reject')).toHaveCount(1);
  await expect(page.getByTestId('ws-review-correct-single_label')).toHaveCount(1);
  await expect(page.getByTestId('ws-review-submit-btn')).toBeVisible();
  await expect(page.getByTestId('ws-review-empty-unit')).toHaveCount(0);
}

test.describe('issue #307 -- truly empty review unit renders no review controls', () => {
  test('T015 ofs-05: empty state instead of decision/correction/submit controls', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(reviewerUrl('ofs-05-not-submitted'));

    // Banner still frames the unit (FR-064) ...
    await expect(page.locator('[data-testid="ws-review-unit-context"] .rv-unit-state'))
      .toHaveText('尚無標記提交');
    // ... but the card area is an explicit empty state, not review chrome.
    await expect(page.getByTestId('ws-review-empty-unit')).toBeVisible();
    await expect(page.getByTestId('ws-review-row-approve')).toHaveCount(0);
    await expect(page.getByTestId('ws-review-row-reject')).toHaveCount(0);
    await expect(page.getByTestId('ws-review-correct-single_label')).toHaveCount(0);
    await expect(page.getByTestId('ws-review-submit-btn')).toBeHidden();

    // FR-058 shortcut path is blocked by the same hidden class.
    await page.keyboard.press('ControlOrMeta+Enter');
    await expect(page.locator('#toastMsg')).not.toHaveText('審核已送出');
  });

  test('T015 ofs-04: seeded submission keeps the full review card (gate must not overfire)', async ({ page }) => {
    /* ofs-04 is the seeded PENDING unit. The original overfire probe used
       ofs-01, but that unit is seeded finalized and issue #308 now renders
       it as the read-only locked card -- a different (correct) suppression
       than the empty gate under test here. */
    await skipGuidelineModal(page);
    await page.goto(reviewerUrl('ofs-04-pending-review'));
    await expectFullReviewCard(page);
  });

  test('mock-row fallback tasks (FR-044a) keep the full review card', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({
      task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'official_run',
    }));
    await expect(page.getByTestId('ws-review-row-approve')).toHaveCount(1);
    await expect(page.getByTestId('ws-review-submit-btn')).toBeVisible();
    await expect(page.getByTestId('ws-review-empty-unit')).toHaveCount(0);
  });

  test('live path: after the annotator submits ofs-05, the reviewer can review and finalize', async ({ page }) => {
    await skipGuidelineModal(page);

    // Annotator (default identity kioleemg12) submits the sample for real.
    // The annotator-side gold prefill (013 FR-003g-5) already selects the
    // answer, so clicking the chip again would toggle it off.
    await page.goto(buildWorkspaceUrl({
      task_id: 'T015', sample_id: 'ofs-05-not-submitted', role: 'annotator', run_type: 'official_run',
    }));
    await expect(page.getByTestId('ws-single-label-chip-positive')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('ws-submit-btn').click();
    /* issue #514: ofs-05 is this annotator's last pending T015 sample, so
       the submit now returns to annotation-list (FR-022C) rather than
       leaving the toast on the workspace. The row's 已提交 badge carries
       the same "the submission really landed" evidence the toast did. */
    await expect(page).toHaveURL(/annotation-list\.html\?/);
    await expect(
      page.getByTestId('ws-sample-item').filter({ hasText: 'ofs-05-not-submitted' }).locator('.status-badge')
    ).toHaveText('已提交');

    // Reviewer reload: the gate releases and the unit derives 待審.
    await page.goto(reviewerUrl('ofs-05-not-submitted'));
    await expect(page.getByTestId('ws-review-empty-unit')).toHaveCount(0);
    await expectFullReviewCard(page);
    await expect(page.locator('[data-testid="ws-review-unit-context"] .rv-unit-state'))
      .toHaveText('待審');

    // And the unit can be finalized (min_reviewers = 1).
    await page.getByTestId('ws-review-row-approve').click();
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');
    await page.reload();
    await expect(page.locator('[data-testid="ws-review-unit-context"] .rv-unit-state'))
      .toHaveText('已定稿 · 已鎖定');
  });
});
