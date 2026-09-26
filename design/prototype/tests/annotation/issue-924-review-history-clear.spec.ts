import { test, expect, type Page } from '@playwright/test';
import {
  dismissGuidelineModal,
  patchDataFile,
  skipGuidelineModal,
} from './_workspace-helpers';

/* issue #924: appendReviewHistoryEntry() (annotation-workspace.config.js:5303)
 * only ever APPENDS to `#wsReviewHistory` (`ws-review-history`) and removes
 * its `hidden` class -- nothing in the file ever clears it or re-hides it
 * again. handleReviewSubmit() (annotation-workspace.config.js:5371-5446) is
 * the sole caller, invoked once per submit to show the reviewer an
 * immediate on-screen confirmation of the decision(s) they just submitted
 * for the CURRENT sample. Every path that then moves the workspace to a
 * DIFFERENT review unit -- auto-advance via advanceToNextActionableReviewUnit()
 * -> selectSample() (FR-099, called from the tail of handleReviewSubmit()
 * itself), or a manual switch via the prev/next nav
 * (setupSampleNav()'s step() -> selectSample()) -- funnels through
 * selectSample() (annotation-workspace.config.js:2177), which never touches
 * `#wsReviewHistory` at all. The confirmation card from the PREVIOUS
 * sample's submitted decision therefore stays visible, and its stale text
 * sits underneath the newly selected sample's own content.
 *
 * Both cases below reproduce the leak from a real reviewer submit, then
 * assert the two-part correct state on the sample the workspace lands on
 * next: `ws-review-history` must be BOTH hidden (the `hidden` class the
 * element starts with, HTML:1228) AND empty -- not just "no leftover text"
 * as a weaker proxy.
 */

async function submitAsAnnotator(page: Page, taskId: string, sampleId: string, answer: () => Promise<void>) {
  await page.goto(`/pages/annotation/annotation-workspace.html?task_id=${taskId}&sample_id=${sampleId}&role=annotator&run_type=official_run`);
  await dismissGuidelineModal(page);
  await answer();
  await page.getByTestId('ws-submit-btn').click();
}

function reviewerUrl(taskId: string, sampleId: string, reviewerId: string): string {
  return `/pages/annotation/annotation-workspace.html?task_id=${taskId}&sample_id=${sampleId}&role=reviewer&run_type=official_run&reviewer_id=${reviewerId}`;
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #924: #wsReviewHistory leaks the previous sample\'s confirmation across a sample switch', () => {
  /* T015 (official_run) seeds exactly one open review unit for
   * reviewer_wang -- ofs-04-pending-review -- with every other seeded
   * record already finalized (annotation-review-flow-demo-workspace.spec.ts
   * confirms ofs-01/02/03 read 已定稿, and ofs-05-not-submitted carries no
   * annotator submission at all, so it is not a review unit -- confirmed
   * live via findNextActionableReviewUnit()). Reproducing the auto-advance
   * leak therefore needs a SECOND open unit also assigned to reviewer_wang,
   * which does not exist in the 15 illustrative seeds. Rather than
   * hand-deriving FR-093's positional round-robin math to land a brand-new
   * record on reviewer_wang, this narrows T015's roster to reviewer_wang
   * alone via patchDataFile() (task-detail.data.js, WITHOUT touching any
   * file under pages/) -- with a single-reviewer roster, every non-sticky
   * unit deals to reviewer_wang, so the pre-existing sticky assignments on
   * ofs-01/02/03 (already reviewed by wang/li/lin) are untouched while the
   * new pending record and ofs-04 both land on reviewer_wang.
   */
  test('auto-advance after a review submit leaves the previous sample\'s history visible on the sample the reviewer auto-advances to', async ({ page }) => {
    await patchDataFile(page, 'task-detail.data.js', `
      var profiles = window.LabelSuiteTaskDetailData && window.LabelSuiteTaskDetailData.profiles;
      if (profiles && profiles.T015) {
        profiles.T015.reviewerIds = ['reviewer_wang'];
        profiles.T015.datasetRecords.push({
          id: 'ofs-06-pending-review-2',
          text: 'issue 924 probe: 第二筆待審樣本',
          gold_label: 'positive'
        });
      }
    `);

    // Seed the second pending review unit with an annotator submission so
    // it actually exists as a review unit for reviewer_wang to land on.
    await submitAsAnnotator(page, 'T015', 'ofs-06-pending-review-2', async () => {
      await page.getByTestId('ws-single-label-chip-negative').click();
    });

    await page.goto(reviewerUrl('T015', 'ofs-04-pending-review', 'reviewer_wang'));
    await dismissGuidelineModal(page);

    const row = page.getByTestId('ws-review-row').first();
    await row.getByTestId('ws-review-row-bypass').click();
    await row.getByTestId('ws-review-reason').fill('issue 924：無法裁決（測試理由）');
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');

    // Confirm the confirmation card actually populated on ofs-04 first --
    // otherwise the assertions below on the NEXT sample would pass
    // vacuously (nothing to leak in the first place).
    const history = page.getByTestId('ws-review-history');
    await expect(history).toBeVisible();
    await expect(history).toContainText('bypass');

    // Auto-advance (FR-099) must actually have moved the workspace to a
    // DIFFERENT review unit -- assert on the URL so this test cannot pass
    // by the page silently staying put.
    await expect(page).toHaveURL(/sample_id=ofs-06-pending-review-2/);
    await expect(page).not.toHaveURL(/sample_id=ofs-04-pending-review/);

    // Bug #924: the confirmation card from ofs-04's submit is still
    // showing, unhidden and populated with ofs-04's stale text, underneath
    // ofs-06-pending-review-2's own (still-pending, not-yet-reviewed)
    // content.
    await expect(page.getByTestId('ws-review-history')).toBeHidden();
    await expect(page.getByTestId('ws-review-history')).toBeEmpty();
  });

  /* Independent of auto-advance: reproduces the same leak when the reviewer
   * manually steps to a different sample via the prev/next nav
   * (setupSampleNav()'s wsPrevBtn/wsNextBtn -> selectSample(), the exact
   * same function auto-advance calls). No patchDataFile() needed here --
   * an `approve` decision on ofs-04-pending-review agrees with the
   * annotator's own answer and finalizes the unit in place (FR-099 §7:
   * a submit that finalizes the CURRENT unit stays put rather than
   * auto-advancing), so the confirmation card populates and the page does
   * NOT navigate away on its own. The reviewer then manually clicks
   * ws-prev-btn to reach ofs-03-arbitrated-gold -- a wholly different,
   * already-finalized review unit -- and the leak is reproduced there
   * without any auto-advance involved.
   */
  test('manually switching sample via prev/next nav leaves the previous sample\'s history visible on the manually selected sample', async ({ page }) => {
    await page.goto(reviewerUrl('T015', 'ofs-04-pending-review', 'reviewer_wang'));
    await dismissGuidelineModal(page);

    const row = page.getByTestId('ws-review-row').first();
    await row.getByTestId('ws-review-row-approve').click();
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');

    // The finalizing submit must NOT have auto-advanced -- confirm the
    // workspace is still on ofs-04-pending-review before the manual switch.
    await expect(page).toHaveURL(/sample_id=ofs-04-pending-review/);

    const history = page.getByTestId('ws-review-history');
    await expect(history).toBeVisible();
    await expect(history).toContainText('approve');

    await page.getByTestId('ws-prev-btn').click();

    // The manual nav must actually have moved the workspace to a
    // DIFFERENT review unit -- assert on the URL so this test cannot pass
    // by the page silently staying put.
    await expect(page).toHaveURL(/sample_id=ofs-03-arbitrated-gold/);
    await expect(page).not.toHaveURL(/sample_id=ofs-04-pending-review/);

    // Bug #924: the confirmation card from ofs-04's approve submit is
    // still showing, unhidden and populated with ofs-04's stale text,
    // underneath ofs-03-arbitrated-gold's own (long since finalized)
    // content.
    await expect(page.getByTestId('ws-review-history')).toBeHidden();
    await expect(page.getByTestId('ws-review-history')).toBeEmpty();
  });
});
