import { test, expect } from '@playwright/test';
import { gotoReviewerWorkspace, skipGuidelineModal } from './_workspace-helpers';

/* Review unit status consistency on an "orphan" unit (issue #910).
 *
 * T001/sent-001/official_run for the default annotator identity
 * (kioleemg12, DEFAULT_ANNOTATOR_ID) has NO stored real annotator
 * submission, only a REVIEWER_MOCK_ROWS demo row (annotation-workspace.
 * data.js:734). FR-044a / FR-053 (spec 015) intentionally keep the full
 * review card interactive for this case -- neither is touched here. But
 * because getReviewUnitStatus() (annotation-workspace.data.js) requires a
 * REAL stored annotator submission to ever leave `null`, this unit's
 * derived status is `null` FOREVER, with two consequences this file pins:
 *
 * 1. handleReviewSubmit()'s `if (lockedStatus === FINALIZED) return;` guard
 *    (annotation-workspace.config.js:5112) never engages, so a reviewer can
 *    submit the same decision repeatedly and each submit appends another
 *    identical reviewer decision event -- no dedup. This differs from the
 *    unrelated DUP-02 case (annotation-review-unit.spec.ts), which covers a
 *    unit that DOES have a real submission and therefore DOES finalize (and
 *    hide its submit button) on the first review.
 *
 * 2. Two call sites read this same `null` status but disagree on what it
 *    means. The left column's reviewUnitState() (annotation-workspace.
 *    config.js:1545) falls back to 'pending' when status is null, so
 *    ws-sample-status reads 待審. The top banner's buildReviewUnitContext()
 *    (annotation-workspace.config.js:4696) uses the raw `null` status
 *    directly (`REVIEW_STATE_I18N_KEYS[unitStatus] || 'unitStateNone'`),
 *    which resolves to 尚無標記提交 instead -- the same unit, two different
 *    stated statuses on screen at once.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 * FR-044a, FR-053 (unchanged), FR-064 (context banner).
 */

const TASK = 'T001';
const SAMPLE = 'sent-001';
const ANNOTATOR = 'kioleemg12';

test.describe('issue #910 -- orphan review unit status consistency', () => {
  test('the left column and the banner agree the orphan unit is 待審 (defect 2)', async ({ page }) => {
    await skipGuidelineModal(page);
    await gotoReviewerWorkspace(page, { task_id: TASK, sample_id: SAMPLE, run_type: 'official_run' });

    // Left column entry for this exact sample/annotator pair.
    const items = page.locator(`[data-testid="ws-sample-item"][data-sample-id="${SAMPLE}"]`);
    const item = items.filter({ has: page.locator(`[data-testid="ws-sample-annotator"][title="${ANNOTATOR}"]`) });
    await expect(item.getByTestId('ws-sample-status')).toHaveText('待審');

    // Top banner for the same unit -- must say the same thing, not
    // 尚無標記提交 (that wording belongs to a truly empty unit with no
    // mock-row fallback either, per issue #307).
    await expect(page.locator('[data-testid="ws-review-unit-context"] .rv-unit-state')).toHaveText('待審');
  });

  test('double-submitting the orphan unit still leaves one reviewer decision event (defect 1)', async ({ page }) => {
    await skipGuidelineModal(page);
    const reviewerId = await gotoReviewerWorkspace(page, { task_id: TASK, sample_id: SAMPLE, run_type: 'official_run' });

    await page.getByTestId('ws-review-row-approve').click();
    const submitBtn = page.getByTestId('ws-review-submit-btn');
    await submitBtn.click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');

    // Unlike DUP-02 (a unit with a real annotator submission, which
    // finalizes and hides its submit button on the first review), this
    // orphan unit's status stays null forever, so lockedStatus never
    // becomes FINALIZED, advanceToNextActionableReviewUnit() re-selects
    // this SAME unit (it is still the lowest-ranked actionable one for this
    // reviewer), and the submit button stays visible after the in-place
    // re-render. That re-render also clears the transient decision-row
    // selection, so reproducing "submit again with the exact same decision"
    // means re-picking approve before the second submit -- clicking submit
    // alone would correctly no-op behind the pendingReviewOutputKeys guard,
    // which is not the bug under test here. Fall back to a direct DOM
    // dispatch (mirroring DUP-02) only if the button turns out hidden.
    if (await submitBtn.isVisible()) {
      await page.getByTestId('ws-review-row-approve').click();
      await submitBtn.click();
    } else {
      await page.evaluate(() => document.getElementById('wsReviewSubmitBtn')?.click());
    }

    const reviewerDecisionEvents = await page.evaluate(
      ({ taskId, runType, sampleId }) => {
        const data = (window as unknown as {
          LabelSuiteAnnotationWorkspaceData: {
            getSampleHistory: (
              taskId: string,
              runType: string,
              sampleId: string,
              identity: Record<string, never>
            ) => Array<{ action: string; role: string; actorId: string | null }>;
          };
        }).LabelSuiteAnnotationWorkspaceData;
        return data
          .getSampleHistory(taskId, runType, sampleId, {})
          .filter((e) => e.role === 'reviewer' && ['accepted', 'modified', 'bypassed'].includes(e.action));
      },
      { taskId: TASK, runType: 'official_run', sampleId: SAMPLE }
    );
    expect(reviewerDecisionEvents).toHaveLength(1);
    expect(reviewerDecisionEvents[0].actorId).toBe(reviewerId);
  });
});
