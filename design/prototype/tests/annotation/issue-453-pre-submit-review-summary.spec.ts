import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, skipGuidelineModal } from './_workspace-helpers';

/* Pre-submit review summary (issue #453, spec 015 FR-077 / AC-3.42).
 *
 * The reviewer workspace lets a reviewer BOTH edit the answer in place
 * (the 直接修正 control, seeded from the reviewed annotator's own answer)
 * AND record a separate ✕ / ✓ decision. Those are two independent stores
 * that look like one action on screen, so before this change nothing on
 * the page answered:
 *
 *   - after editing the answer, does 通過 approve the annotator's original
 *     answer or the corrected one?
 *   - on 退回 with no edit, what reviewer answer is actually saved?
 *   - what happens to the annotator's status after submit (official_run
 *     rolls the sample back to pending; dry_run does not)?
 *   - on a multi-output task, which rows are still undecided?
 *
 * This spec pins the answer: an explicit per-output summary in the submit
 * area, an original-answer label inside the answer edit area, decision
 * buttons that carry visible text (not only a glyph), and — the one
 * behavioral clause — a decision that is RESET the moment its correction
 * value changes, so a submitted decision always refers to the value on
 * screen.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md FR-077,
 * AC-3.42. Companion of issue #398 (AC-6.10 / FR-014S) which covers the
 * reload path; this spec covers the live-edit path.
 */

const T001_OFFICIAL = buildWorkspaceUrl({
  task_id: 'T001',
  sample_id: 'sent-001',
  role: 'reviewer',
  run_type: 'official_run',
});

const T001_DRY = buildWorkspaceUrl({
  task_id: 'T001',
  sample_id: 'sent-001',
  role: 'reviewer',
  run_type: 'dry_run',
});

/* T013 (absa-001) ships entity_recognition + relation_identification +
 * multi_dim, i.e. THREE decisions spread over two review cards -- the
 * multi-output case where "did I decide every row?" is a real question. */
const T013_OFFICIAL = buildWorkspaceUrl({
  task_id: 'T013',
  sample_id: 'absa-001',
  role: 'reviewer',
  run_type: 'official_run',
});

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

function summaryRow(page: Page, outKey: string) {
  return page.locator(`[data-testid="ws-review-summary-row"][data-outkey="${outKey}"]`);
}

/* Flips the single_label correction away from whatever the annotator
 * submitted, so the row genuinely counts as corrected. Returns the value
 * the correction now holds. */
async function flipSingleLabel(page: Page): Promise<string> {
  const correction = page.getByTestId('ws-review-correct-single_label');
  const negative = correction.getByTestId('ws-single-label-chip-negative');
  const positive = correction.getByTestId('ws-single-label-chip-positive');
  const negativePressed = (await negative.getAttribute('aria-pressed')) === 'true';
  const target = negativePressed ? positive : negative;
  await target.click();
  await expect(target).toHaveAttribute('aria-pressed', 'true');
  return negativePressed ? 'positive' : 'negative';
}

test.describe('Answer edit area names both the original and the corrected answer (issue #453)', () => {
  test('the correction panel is labeled with the annotator original answer', async ({ page }) => {
    await page.goto(T001_OFFICIAL);
    await dismissGuidelineModal(page);

    const origin = page.getByTestId('ws-review-original-answer');
    await expect(origin).toHaveCount(1);
    await expect(origin).toBeVisible();
    await expect(origin).toContainText('標記員原答案');
    await expect(origin).toHaveAttribute('data-outkey', 'single_label');
    // The label must carry the actual seeded value, not just a caption.
    await expect(origin).not.toHaveAttribute('data-answer', '');

    // ...and the editable control is explicitly named as the reviewer's
    // corrected answer, so the two are told apart on screen.
    await expect(page.getByTestId('ws-review-corrected-answer-title')).toContainText('修正後答案');
  });
});

test.describe('Decision buttons carry visible text, not only a glyph (issue #453)', () => {
  test('approve and reject each render their label as text', async ({ page }) => {
    await page.goto(T001_OFFICIAL);
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-review-row-approve')).toContainText('通過');
    await expect(page.getByTestId('ws-review-row-reject')).toContainText('退回');
    // The accessible name contract from issue #399 must survive.
    await expect(page.getByRole('button', { name: '通過', exact: true })).toHaveCount(1);
    await expect(page.getByRole('button', { name: '退回', exact: true })).toHaveCount(1);
  });
});

test.describe('Pre-submit summary covers all four decision × correction combinations (issue #453)', () => {
  test('approve with no correction: summary says the annotator original answer is being accepted', async ({ page }) => {
    await page.goto(T001_OFFICIAL);
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-review-row-approve').click();

    const row = summaryRow(page, 'single_label');
    await expect(row).toHaveCount(1);
    await expect(row).toHaveAttribute('data-decision', 'approve');
    await expect(row).toHaveAttribute('data-changed', 'false');
    await expect(row.getByTestId('ws-review-summary-note')).toHaveAttribute('data-kind', 'approve-unchanged');
    // Original and corrected are both shown, and they agree.
    const original = await row.getByTestId('ws-review-summary-original').getAttribute('data-answer');
    const corrected = await row.getByTestId('ws-review-summary-corrected').getAttribute('data-answer');
    expect(original).toBe(corrected);
  });

  test('approve after a correction: summary says the CORRECTED answer is what gets approved', async ({ page }) => {
    await page.goto(T001_OFFICIAL);
    await dismissGuidelineModal(page);

    const newValue = await flipSingleLabel(page);
    await page.getByTestId('ws-review-row-approve').click();

    const row = summaryRow(page, 'single_label');
    await expect(row).toHaveAttribute('data-decision', 'approve');
    await expect(row).toHaveAttribute('data-changed', 'true');
    await expect(row.getByTestId('ws-review-summary-note')).toHaveAttribute('data-kind', 'approve-changed');
    await expect(row.getByTestId('ws-review-summary-corrected')).toHaveAttribute('data-answer', newValue);
    const original = await row.getByTestId('ws-review-summary-original').getAttribute('data-answer');
    expect(original).not.toBe(newValue);
  });

  test('reject with no correction: summary states which reviewer answer is stored', async ({ page }) => {
    await page.goto(T001_OFFICIAL);
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-review-row-reject').click();

    const row = summaryRow(page, 'single_label');
    await expect(row).toHaveAttribute('data-decision', 'reject');
    await expect(row).toHaveAttribute('data-changed', 'false');
    const note = row.getByTestId('ws-review-summary-note');
    await expect(note).toHaveAttribute('data-kind', 'reject-unchanged');
    // The whole point of this case: say out loud that the stored reviewer
    // answer equals the annotator's original, since nothing was edited.
    await expect(note).toContainText('與標記員原答案相同');
  });

  test('reject after a correction: summary says the corrected answer is stored with the reject', async ({ page }) => {
    await page.goto(T001_OFFICIAL);
    await dismissGuidelineModal(page);

    const newValue = await flipSingleLabel(page);
    await page.getByTestId('ws-review-row-reject').click();

    const row = summaryRow(page, 'single_label');
    await expect(row).toHaveAttribute('data-decision', 'reject');
    await expect(row).toHaveAttribute('data-changed', 'true');
    await expect(row.getByTestId('ws-review-summary-note')).toHaveAttribute('data-kind', 'reject-changed');
    await expect(row.getByTestId('ws-review-summary-corrected')).toHaveAttribute('data-answer', newValue);
  });
});

test.describe('Multi-output tasks name the still-undecided outputs (issue #453)', () => {
  test('T013 (3 outputs) lists the two outputs left undecided after one approve', async ({ page }) => {
    await page.goto(T013_OFFICIAL);
    await dismissGuidelineModal(page);

    const pending = page.getByTestId('ws-review-summary-pending');
    await expect(pending).toBeVisible();
    await expect(pending).toHaveAttribute('data-count', '3');

    await page.getByTestId('ws-review-row-approve').first().click();

    await expect(pending).toHaveAttribute('data-count', '2');
    // The remaining rows are named, not just counted.
    await expect(pending).toContainText('relation_identification');
    await expect(pending).toContainText('multi_dim');
    await expect(pending).not.toContainText('entity_recognition');

    // One summary row per output type, even though the span types share a card.
    await expect(page.getByTestId('ws-review-summary-row')).toHaveCount(3);
    await expect(summaryRow(page, 'multi_dim')).toHaveAttribute('data-decision', 'none');
  });
});

test.describe('Submit-time consequence is stated per run type (issue #453)', () => {
  test('official_run warns that a reject reopens the annotator re-annotation task', async ({ page }) => {
    await page.goto(T001_OFFICIAL);
    await dismissGuidelineModal(page);

    const effect = page.getByTestId('ws-review-summary-effect');
    await expect(effect).toBeVisible();
    await expect(effect).toHaveAttribute('data-run-type', 'official_run');
    await expect(effect).toContainText('待標記');
    await expect(effect).toContainText('重標');
  });

  test('dry_run states that no individual annotator rollback happens', async ({ page }) => {
    await page.goto(T001_DRY);
    await dismissGuidelineModal(page);

    const effect = page.getByTestId('ws-review-summary-effect');
    await expect(effect).toHaveAttribute('data-run-type', 'dry_run');
    await expect(effect).toContainText('不');
    await expect(effect).toContainText('標記員狀態');
  });
});

test.describe('A decision never survives an edit to the value it judged (issue #453)', () => {
  test('editing the correction after deciding resets the decision and warns', async ({ page }) => {
    await page.goto(T001_OFFICIAL);
    await dismissGuidelineModal(page);

    const approve = page.getByTestId('ws-review-row-approve');
    await approve.click();
    await expect(approve).toHaveAttribute('aria-pressed', 'true');

    await flipSingleLabel(page);

    await expect(approve).toHaveAttribute('aria-pressed', 'false');
    await expect(summaryRow(page, 'single_label')).toHaveAttribute('data-decision', 'none');
    await expect(page.locator('#toastMsg')).toContainText('決策已重置');
  });

  test('the reset decision blocks submit until it is re-confirmed', async ({ page }) => {
    await page.goto(T001_OFFICIAL);
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-review-row-reject').click();
    await flipSingleLabel(page);

    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('請完成每位標記員的審核決策');

    // Re-deciding against the new value lets the submit through.
    await page.getByTestId('ws-review-row-reject').click();
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審查已提交');
  });
});
