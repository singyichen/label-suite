import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, skipGuidelineModal } from './_workspace-helpers';

/* Pre-submit review summary (issue #453, spec 015 FR-077 / AC-3.42 --
 * FR-077/AC-3.42/AC-3.44 revoked by issue #550, spec 015 v4.55.0).
 *
 * The reviewer workspace lets a reviewer BOTH edit the answer in place
 * (the 直接修正 control, seeded from the reviewed annotator's own answer)
 * AND record a separate ✕ / ✓ decision. Those are two independent stores
 * that look like one action on screen. This spec still pins the two
 * concerns issue #550 left untouched: an original-answer label inside the
 * answer edit area, and decision buttons that carry visible text (not only
 * a glyph). What issue #550 removed -- the four-combination pre-submit
 * summary rows, the per-run_type submit-consequence element, and the
 * decision-reset-on-edit toast's exact wording -- moved to
 * issue-550-review-note-tooltip.spec.ts (content) and the "toast names the
 * undecided output types" describe below (issue #550 point 4, the
 * compensating change for the removed summaryPending list).
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md FR-070
 * (new point, toast), AC-3.42/AC-3.45. Companion of issue #398 (AC-6.10 /
 * FR-014S) which covers the reload path; this spec covers the live-edit
 * path.
 */

const T001_OFFICIAL = buildWorkspaceUrl({
  task_id: 'T001',
  sample_id: 'sent-001',
  role: 'reviewer',
  run_type: 'official_run',
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
  test('all three decisions render their label as text', async ({ page }) => {
    await page.goto(T001_OFFICIAL);
    await dismissGuidelineModal(page);

    const LABELS: Record<string, string> = {
      approve: '通過', modify: '修正', bypass: '無法判定',
    };
    for (const [decision, label] of Object.entries(LABELS)) {
      await expect(page.getByTestId('ws-review-row-' + decision)).toContainText(label);
      // The accessible name contract from issue #399 must survive.
      await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(1);
    }
  });
});

test.describe('Multi-output tasks name the still-undecided outputs in the submit-blocking toast (issue #550)', () => {
  test('T013 (3 outputs): submitting with zero decisions names all three output types', async ({ page }) => {
    await page.goto(T013_OFFICIAL);
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-review-submit-btn').click();
    const toast = page.locator('#toastMsg');
    await expect(toast).toContainText('entity_recognition');
    await expect(toast).toContainText('relation_identification');
    await expect(toast).toContainText('multi_dim');
  });

  test('T013 (3 outputs): after deciding one, the toast names only the remaining two', async ({ page }) => {
    await page.goto(T013_OFFICIAL);
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-review-row-approve').first().click();
    await page.getByTestId('ws-review-submit-btn').click();

    const toast = page.locator('#toastMsg');
    await expect(toast).toContainText('relation_identification');
    await expect(toast).toContainText('multi_dim');
    await expect(toast).not.toContainText('entity_recognition');
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
    await expect(page.locator('#toastMsg')).toContainText('決策已重置');
  });

  test('the reset decision blocks submit until it is re-confirmed', async ({ page }) => {
    await page.goto(T001_OFFICIAL);
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-review-row-modify').click();
    await flipSingleLabel(page);

    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('請完成以下輸出類型的審核決策：single_label');

    // Re-deciding against the new value lets the submit through.
    await page.getByTestId('ws-review-row-modify').click();
    // FR-016A: a modify decision needs a reason before submit goes through.
    await page.getByTestId('ws-review-reason').fill('理由');
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');
  });
});
