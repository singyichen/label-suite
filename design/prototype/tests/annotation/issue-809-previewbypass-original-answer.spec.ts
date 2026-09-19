import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, patchDataFile, skipGuidelineModal } from './_workspace-helpers';

/* issue #809: `previewBypass` (the annotator-side "I cannot judge this
 * output" flag, distinct from the reviewer decision value `bypass` --
 * issue #811 renames only the latter, later, in Wave 2) is computed at
 * getReviewerRows() (annotation-workspace.config.js, row.bypass) but has
 * ZERO read consumers anywhere in the answer-rendering path. The reviewer's
 * "what did the annotator actually answer" label --
 * ws-review-original-answer, built in appendCorrectionControl() from
 * reviewRowOriginals[outKey], itself populated by seedReviewRow() from
 * describeOutputAnswer() -- never reads previewBypass. describeOutputAnswer()
 * switches purely on previewState[outKey], so an annotator who explicitly
 * bypassed an output (previewState left empty on purpose) and one who left
 * it empty by omission produce the exact same '（無）' text. A reviewer
 * cannot tell "the annotator said this is unjudgeable" from "the annotator
 * skipped this and nobody noticed."
 *
 * The fix must not change layout (FR-014P(2)/(4): same row, same element)
 * and must not corrupt reviewRowOriginals/data-answer, which
 * isRowCorrected() and issue-453's pre-submit-summary spec both depend on
 * as a raw-value cache -- only the display textContent may change.
 */

const T001_REVIEWER_001 = buildWorkspaceUrl({
  task_id: 'T001',
  sample_id: 'sent-001',
  role: 'reviewer',
  run_type: 'official_run',
});
const T001_REVIEWER_002 = buildWorkspaceUrl({
  task_id: 'T001',
  sample_id: 'sent-002',
  role: 'reviewer',
  run_type: 'official_run',
});

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #809: previewBypass must be visible to the reviewer', () => {
  test('an explicitly bypassed annotator answer reads as 無法判定, not （無）', async ({ page }) => {
    // T001's single_label output doesn't natively set allow_bypass -- patch
    // it on, same precedent as annotation-workspace-bypass.spec.ts.
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T001.outputs[0].config.allow_bypass = true;
    `);

    // UI-driven: the annotator bypasses single_label (not "leaves it
    // empty" -- an explicit, recorded decision) and submits.
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator' }));
    await dismissGuidelineModal(page);
    await page.getByTestId('ws-bypass-single_label').check();
    await page.getByTestId('ws-submit-btn').click();

    await page.goto(T001_REVIEWER_001);
    await dismissGuidelineModal(page);

    const origin = page.getByTestId('ws-review-original-answer');
    await expect(origin).toHaveCount(1);
    // Positive: the bypass must be named, as the exact answer-value string.
    await expect(origin).toHaveText('標記員原答案：無法判定 (Bypass)');
    // Negative, named: must NOT be indistinguishable from a plain no-answer.
    await expect(origin).not.toHaveText('標記員原答案：（無）');

    // data-answer stays the raw (empty) value -- isRowCorrected() and
    // issue-453's spec both diff/assert against it as real data, not
    // display text. The bypass signal must be display-only.
    await expect(origin).toHaveAttribute('data-answer', '');
  });

  test('a genuinely empty, non-bypassed answer still reads as （無）', async ({ page }) => {
    // Not reachable through the live submit form (an empty, non-bypassed
    // output blocks submit) -- represents data already on disk, the same
    // precedent issue #810's arbitration test used for this class of state.
    // Navigate first: localStorage is inaccessible from the default
    // about:blank document.
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-002', role: 'annotator' }));
    await page.evaluate(() => {
      window.localStorage.setItem(
        'labelsuite.wsSubmissions.T001::annotator::official_run::kioleemg12::-',
        JSON.stringify({
          'sent-002': {
            status: 'submitted',
            submittedAt: '2026-01-01T00:00:00.000Z',
            answers: { previewState: { single_label: { selected: null } } },
          },
        })
      );
    });

    await page.goto(T001_REVIEWER_002);
    await dismissGuidelineModal(page);

    const origin = page.getByTestId('ws-review-original-answer');
    await expect(origin).toHaveCount(1);
    await expect(origin).toHaveText('標記員原答案：（無）');
    await expect(origin).not.toHaveText('標記員原答案：無法判定 (Bypass)');
  });
});
