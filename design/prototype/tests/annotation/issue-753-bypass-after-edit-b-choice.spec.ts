import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, skipGuidelineModal } from './_workspace-helpers';

/* issue #753: FR-061 point 2 (spec.md:779) requires that a `bypass` decision
 * renders and finalizes as "無法判定" -- it must NEVER surface the
 * annotator's or a stale edited value:
 *
 *   「來源為 `bypass` 時呈現 `B · 審核員 Bypass（無法判定）`，採 B 即定案為
 *    無法判定，該項定案值記為無法判定，不得回填標記員原答案。」
 *
 * (also pinned by AC-4.54, spec.md:594.)
 *
 * The defect: collectAnswerPayload() (annotation-workspace.config.js)
 * unconditionally deep-clones state.previewState into the reviewer's
 * submission regardless of decision, so clicking a correction chip and
 * THEN clicking 無法判定 (bypass) does not clear the edited preview value.
 * convertSubmissionAnswer() (annotation-workspace.data.js:1630) reads that
 * same previewState, so getDisputeItems() computes a real diff (the edited
 * value) instead of taking the `if (!diffs.length)` synthesis branch that
 * null-fills bypass's B value. The stale edited value then flows into both
 * arbitrationBChoiceText() (the B button's wording) and, if adopted,
 * `finalized_value` (the read-only finalized row) -- surfacing an edited
 * value issue #750 never exercises, because issue #750's bypass case never
 * edits the preview panel first.
 */

async function submitAsAnnotator(page: Page, taskId: string, sampleId: string, answer: () => Promise<void>) {
  await page.goto(buildWorkspaceUrl({ task_id: taskId, sample_id: sampleId, role: 'annotator' }));
  await dismissGuidelineModal(page);
  await answer();
  await page.getByTestId('ws-submit-btn').click();
}

function reviewerUrl(taskId: string, sampleId: string): string {
  return buildWorkspaceUrl({ task_id: taskId, sample_id: sampleId, role: 'reviewer', run_type: 'official_run' });
}

/* Non-participant, can_arbitrate demo roster identity (same convention as
 * issue-750-bypass-modify-dispute.spec.ts) -- the default reviewer identity
 * DEFAULT_REVIEWER_ID resolves to REVIEWER_ROSTER[0] ('reviewer_wang'), so
 * 'reviewer_chen' is eligible to arbitrate a unit that reviewer submitted. */
function arbiterUrl(taskId: string, sampleId: string): string {
  return buildWorkspaceUrl({
    task_id: taskId, sample_id: sampleId, role: 'reviewer', run_type: 'official_run', reviewer_id: 'reviewer_chen',
  });
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
  // Four full workspace navigations per case (annotator, reviewer, the
  // reviewer re-open that issue #719's FR-099 auto-advance made necessary,
  // then arbiter) can exceed the default 30s in this sandbox's slower
  // page-load conditions.
  test.setTimeout(60_000);
});

test.describe('issue #753: bypass after an edit must not surface the edited value', () => {
  test('editing the correction chip then choosing 無法判定 renders B as bypass, not the edited value', async ({ page }) => {
    await submitAsAnnotator(page, 'T001', 'sent-001', async () => {
      await page.getByTestId('ws-single-label-chip-negative').click();
    });
    await page.goto(reviewerUrl('T001', 'sent-001'));
    await dismissGuidelineModal(page);

    const row = page.getByTestId('ws-review-row').first();
    // Edit the pre-filled preview panel first (annotation-workspace-reviewer.spec.ts:89 idiom).
    await row.getByTestId('ws-review-correct-single_label').getByTestId('ws-single-label-chip-positive').click();
    // Then bypass -- the edited preview value must not survive this decision.
    await row.getByTestId('ws-review-row-bypass').click();
    await row.getByTestId('ws-review-reason').fill('已判讀但無法判定（測試理由）');
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');

    /* issue #719 (FR-099, spec 015 v6.2.0): a submit that leaves the unit
     * unfinalized auto-advances this reviewer to their next actionable
     * unit, so the unit context on screen is no longer sent-001's. Re-open
     * the unit to assert the derivation this spec is guarding. */
    await page.goto(reviewerUrl('T001', 'sent-001'));
    await dismissGuidelineModal(page);
    await expect(page.locator('[data-testid="ws-review-unit-context"] .rv-unit-state'))
      .toHaveText('爭議中 · 未定稿，待仲裁');

    await page.goto(arbiterUrl('T001', 'sent-001'));
    await dismissGuidelineModal(page);
    const item = page.getByTestId('ws-arbitration-item').first();
    const bChoice = item.getByTestId('ws-arbitration-choose-b');

    // Positive: the exact FR-061 point 2 bypass wording (annotation-workspace.config.js:84).
    await expect(bChoice).toHaveText('B・審核員 Bypass（無法判定）');
    // Negative, named: must NOT carry the stale edited value anywhere in the button text.
    await expect(bChoice).not.toContainText('positive');
  });

  test('adopting B on an edited-then-bypassed item finalizes as 無法判定, not the edited value', async ({ page }) => {
    await submitAsAnnotator(page, 'T001', 'sent-001', async () => {
      await page.getByTestId('ws-single-label-chip-negative').click();
    });
    await page.goto(reviewerUrl('T001', 'sent-001'));
    await dismissGuidelineModal(page);

    const row = page.getByTestId('ws-review-row').first();
    await row.getByTestId('ws-review-correct-single_label').getByTestId('ws-single-label-chip-positive').click();
    await row.getByTestId('ws-review-row-bypass').click();
    await row.getByTestId('ws-review-reason').fill('已判讀但無法判定（測試理由）');
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');

    await page.goto(arbiterUrl('T001', 'sent-001'));
    await dismissGuidelineModal(page);
    const item = page.getByTestId('ws-arbitration-item').first();
    await item.getByTestId('ws-arbitration-choose-b').click();
    await page.getByTestId('ws-arbitration-submit').click();
    await expect(page.locator('#toastMsg')).toHaveText('仲裁已提交');
    await expect(page.getByTestId('ws-review-finalized-card')).toBeVisible();

    /* FR-061 point 2: "採 B 即定案為無法判定...不得回填標記員原答案". The
     * finalized resolved row (established testid/assertion convention:
     * issue-308-finalized-unit-lock.spec.ts, issue-408-...spec.ts) renders
     * `disputeItemLabel + '：' + formatDisputeValue(finalized_value) + '（' +
     * finalized_by + '）'`. formatDisputeValue(null) renders the same
     * "（無）" no-answer wording reviewNoAnswer uses elsewhere -- a real
     * fix must store finalized_value = null for this bypass item, not the
     * stale edited 'positive'. */
    const resolved = page.getByTestId('ws-finalized-resolved');
    await expect(resolved).toHaveCount(1);
    await expect(resolved).not.toContainText('positive');
    await expect(resolved).toContainText('（無）');
  });
});
