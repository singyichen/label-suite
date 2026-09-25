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

  /* Regression found in code review of the #910 fix above: appendReviewDecisionEvents()
   * (annotation-workspace.data.js) sets its `timingWritten` flag to true as soon as it
   * attaches started_at/lead_time to the FIRST outKey's `extra` object -- BEFORE knowing
   * whether appendHistoryEvent() will actually push that event or silently drop it via the
   * new #910 outKey-scoped dedup guard. When a submit covers 2+ outKeys and the FIRST one
   * (Object.keys(decisions) order) is an exact repeat of its own last recorded event while a
   * LATER outKey in the SAME submit is genuinely new, the timing flag is wrongly consumed by
   * the discarded first attempt, and the event that actually lands in history ends up with NO
   * started_at/lead_time at all. This violates FR-088 (spec 015, v6.9.0) / AC-2.26
   * (specs/annotation/015-annotation-workspace/spec.md:262), which requires exactly ONE event
   * per submit operation to carry started_at/lead_time.
   *
   * Reproduced here via two synthetic outKeys (alpha/beta) submitted directly through
   * markSampleSubmitted() -- same known-good pattern as
   * issue-583-reviewer-submit-events.spec.ts's multi-outKey test: appendReviewDecisionEvents()
   * iterates Object.keys(decisions) generically with no task-specific branching
   * (Generalization-First), so a synthetic multi-outKey shape exercises the same iteration-order
   * code path a real multi-output-type task would, without needing a second task fixture. T001
   * itself has only one output type (single_label, task-detail.data.js) so it cannot host this
   * repro through its own real outKeys.
   *
   * Traceability: specs/annotation/015-annotation-workspace/spec.md FR-088, AC-2.26.
   */
  test('a genuinely-new outKey in the same submit still carries started_at/lead_time when an earlier outKey was deduped away (issue #910 regression)', async ({
    page,
  }) => {
    await skipGuidelineModal(page);
    const reviewerId = await gotoReviewerWorkspace(page, { task_id: TASK, sample_id: SAMPLE, run_type: 'official_run' });

    type WorkspaceDataGlobal = {
      markSampleSubmitted: (
        taskId: string,
        role: string,
        runType: string,
        sampleId: string,
        payload: unknown,
        historySummary: string,
        identity: { annotatorId?: string; reviewerId?: string }
      ) => void;
      getSampleHistory: (
        taskId: string,
        runType: string,
        sampleId: string,
        identity: Record<string, never>
      ) => Array<{
        action: string;
        role: string;
        actorId: string | null;
        outKey?: string;
        started_at?: string | null;
        lead_time?: number | null;
      }>;
    };

    const submit = (payload: unknown) =>
      page.evaluate(
        (a) =>
          (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceDataGlobal }).LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
            a.taskId,
            'reviewer',
            a.runType,
            a.sampleId,
            a.payload,
            '',
            { annotatorId: a.annotatorId, reviewerId: a.reviewerId }
          ),
        { taskId: TASK, runType: 'official_run', sampleId: SAMPLE, payload, annotatorId: ANNOTATOR, reviewerId }
      );

    // First submit: both synthetic outKeys approved -- establishes the
    // baseline event each outKey's dedup comparison will be made against.
    await submit({ decisions: { alpha: 'approve', beta: 'approve' } });

    // Second submit: alpha repeats its exact prior decision (role/action/
    // reason/value all match -> dedup guard fires, no-op) while beta
    // genuinely changes from approve to modify (action differs -> dedup
    // guard does NOT fire, event is written). alpha is first in
    // Object.keys(decisions) order, so this reproduces the exact
    // iteration-order bug: timingWritten is consumed by alpha's discarded
    // attempt before beta -- the only outKey that actually lands a new
    // event this submit -- is ever reached.
    await submit({
      decisions: { alpha: 'approve', beta: 'modify' },
      timing: { startedAt: '2026-09-19T09:00:00.000Z', leadTime: 12_000 },
    });

    const reviewerEvents = await page.evaluate(
      (a) =>
        (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceDataGlobal })
          .LabelSuiteAnnotationWorkspaceData.getSampleHistory(a.taskId, a.runType, a.sampleId, {})
          .filter((e) => e.role === 'reviewer'),
      { taskId: TASK, runType: 'official_run', sampleId: SAMPLE }
    );

    // alpha's second attempt was deduped away (no-op): only 3 events exist
    // total -- alpha/beta accepted (submit 1) + beta modified (submit 2).
    expect(reviewerEvents).toHaveLength(3);

    // FR-088 / AC-2.26: exactly one event per submit operation carries
    // started_at/lead_time. Submit 2's only genuinely-new event is beta's
    // `modified` -- it MUST carry submit 2's timing, not end up with none,
    // even though alpha (the outKey that consumed the timing flag first)
    // was itself deduped away.
    const modifiedEvent = reviewerEvents.find((e) => e.action === 'modified');
    expect(modifiedEvent).toBeDefined();
    expect(modifiedEvent?.started_at).toBe('2026-09-19T09:00:00.000Z');
    expect(modifiedEvent?.lead_time).toBe(12_000);
  });
});
