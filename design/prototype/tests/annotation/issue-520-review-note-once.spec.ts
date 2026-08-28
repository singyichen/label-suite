import { test, expect, type Page } from '@playwright/test';
import {
  assertNoPageErrors,
  buildWorkspaceUrl,
  dismissGuidelineModal,
  skipGuidelineModal,
  trackPageErrors,
  type RunType,
} from './_workspace-helpers';

/* Issue #520: `ws-review-note` is rendered once per REVIEW CARD, because it
 * lives inside appendCorrectionControl() -- which buildReviewRow() and
 * buildMergedSpanReviewRow() each call once per card. A task whose outputs[]
 * produces more than one card therefore repeats the very same decision-level
 * sentence on every card, even though a reviewer only has to understand once
 * what 通過 / 退回 mean. T013 (entity_recognition + relation_identification +
 * multi_dim) renders two cards -- the FR-014N merged span card plus the
 * multi_dim card -- so the paragraph appears twice on one review unit.
 *
 * Measured before this change (page-level counts, official_run):
 *   T013 -> 2 review cards, 2 notes; T010 -> 1 card, 1 note;
 *   T001 -> 1 card, 1 note.
 * (The issue text predicted three notes on T013 by counting one per outKey;
 * FR-014N's merged span card already collapses two of the three.)
 *
 * Issue #515 ③ / spec 015 v4.46.0 shortened the sentence but explicitly left
 * the repetition in place. This spec pins the remaining half: the note is
 * rendered exactly ONCE per review unit, above the card stack whose decision
 * pairs it explains, and everything the note is NOT allowed to disturb stays
 * put -- the decision buttons and their accessible names (issue #399), the
 * per-output-type original answers and correction titles, and the
 * run-type-branching consequence line (`ws-review-summary-effect`).
 *
 * The one deliberate copy change: the sentence used to say 本輸出類型 /
 * "for this output type", a deictic that resolved to the card the note sat
 * in. At unit level that referent no longer exists, so it becomes the
 * generic 該輸出類型 / "that output type" -- still accurate, because each
 * approve/reject pair is per outKey (FR-014P). The rest is verbatim.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md FR-070,
 * AC-3.40, AC-3.45; related FR-014N, FR-014P, FR-077, AC-3.33, AC-3.42,
 * AC-3.43.
 */

const NOTE_ZH =
  '通過：採用標記員在該輸出類型的作答為審核結果。退回：記錄審核決策與修正差異；是否回退標記員狀態依試標／正式標記而異，實際影響見下方「送出前確認」。';

const NOTE_EN =
  'Approve: accept the annotator’s answer for that output type as the review result. Reject: records the review decision and any correction; whether the annotator status is rolled back differs between a dry run and an official run -- the actual effect is stated under “Confirm before submitting” below.';

/* taskId / sampleId / how many review cards the task's outputs[] produce. */
const CASES: Array<{ taskId: string; sampleId: string; cards: number; decisions: number; label: string }> = [
  // Three output types, two cards (FR-014N merges the two span types).
  { taskId: 'T013', sampleId: 'absa-001', cards: 2, decisions: 3, label: 'three output types' },
  // The FR-014N merged span card on its own.
  { taskId: 'T010', sampleId: 'med-001', cards: 1, decisions: 2, label: 'merged span card' },
  // Single output type -- the note must not be deleted outright.
  { taskId: 'T001', sampleId: 'sent-001', cards: 1, decisions: 1, label: 'single output type' },
];

async function openReviewer(page: Page, taskId: string, sampleId: string, runType: RunType) {
  await page.goto(
    buildWorkspaceUrl({ task_id: taskId, sample_id: sampleId, role: 'reviewer', run_type: runType })
  );
  await dismissGuidelineModal(page);
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('the review decision note is rendered once per review unit (issue #520)', () => {
  for (const { taskId, sampleId, cards, decisions, label } of CASES) {
    for (const runType of ['dry_run', 'official_run'] as RunType[]) {
      test(`${taskId} (${label}) renders exactly one ws-review-note in ${runType}`, async ({ page }) => {
        const errors = trackPageErrors(page);
        await openReviewer(page, taskId, sampleId, runType);

        // The card count is the premise: it is what makes the repetition
        // observable, and it must not change to make the note count drop.
        await expect(page.getByTestId('ws-review-row')).toHaveCount(cards);
        await expect(page.getByTestId('ws-review-note')).toHaveCount(1);
        await expect(page.getByTestId('ws-review-note')).toBeVisible();
        await expect(page.getByTestId('ws-review-note')).not.toBeEmpty();
        // One decision pair per output type is untouched (FR-014P/FR-014N).
        await expect(page.getByTestId('ws-review-row-approve')).toHaveCount(decisions);
        await expect(page.getByTestId('ws-review-row-reject')).toHaveCount(decisions);

        assertNoPageErrors(errors);
      });
    }
  }

  test('the note sits above the card stack it explains, not inside any one card', async ({ page }) => {
    await openReviewer(page, 'T013', 'absa-001', 'official_run');

    // Mount point contract: the note explains every decision pair in the
    // unit, so it must not be scoped to a single review card.
    for (let i = 0; i < 2; i++) {
      await expect(page.getByTestId('ws-review-row').nth(i).getByTestId('ws-review-note')).toHaveCount(0);
    }
    // ...and it must precede the first card, so it is read before any
    // decision is taken.
    const notePrecedesFirstCard = await page.evaluate(() => {
      const note = document.querySelector('[data-testid="ws-review-note"]');
      const firstRow = document.querySelector('[data-testid="ws-review-row"]');
      if (!note || !firstRow) return null;
      return (note.compareDocumentPosition(firstRow) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    });
    expect(notePrecedesFirstCard).toBe(true);
  });

  test('the unit-level copy is pinned verbatim in zh', async ({ page }) => {
    await openReviewer(page, 'T013', 'absa-001', 'official_run');
    await expect(page.getByTestId('ws-review-note')).toHaveText(NOTE_ZH);
  });

  test('the unit-level copy is pinned verbatim in en', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
    });
    await openReviewer(page, 'T013', 'absa-001', 'official_run');
    await expect(page.getByTestId('ws-review-note')).toHaveText(NOTE_EN);
  });

  test('the note stays identical across run types (AC-3.33)', async ({ page }) => {
    await openReviewer(page, 'T013', 'absa-001', 'dry_run');
    const dryText = await page.getByTestId('ws-review-note').textContent();

    await openReviewer(page, 'T013', 'absa-001', 'official_run');
    const officialText = await page.getByTestId('ws-review-note').textContent();

    expect(dryText).toBe(officialText);
  });

  test('per-output-type card content is untouched — originals, correction titles, panels', async ({ page }) => {
    await openReviewer(page, 'T013', 'absa-001', 'official_run');

    // AC-3.42: the annotator's original answer is still named once per
    // output type (the merged span card names both of its types).
    await expect(page.getByTestId('ws-review-original-answer')).toHaveCount(3);
    // One 直接修正 title and one correction panel per CARD, as before.
    await expect(page.getByTestId('ws-review-corrected-answer-title')).toHaveCount(2);
    await expect(page.getByTestId('ws-review-correct-span')).toHaveCount(1);
    await expect(page.getByTestId('ws-review-correct-multi_dim')).toHaveCount(1);
  });

  test('decision buttons keep their accessible names (issue #399 contract)', async ({ page }) => {
    await openReviewer(page, 'T013', 'absa-001', 'official_run');

    await expect(page.getByRole('button', { name: '通過', exact: true })).toHaveCount(3);
    await expect(page.getByRole('button', { name: '退回', exact: true })).toHaveCount(3);
  });

  test('the run-type consequence still lives in the confirmation area (FR-077/AC-3.42)', async ({ page }) => {
    for (const runType of ['dry_run', 'official_run'] as RunType[]) {
      await openReviewer(page, 'T013', 'absa-001', runType);
      const effect = page.getByTestId('ws-review-summary-effect');
      await expect(effect).toHaveAttribute('data-run-type', runType);
      await expect(effect).toContainText('送出後影響');
    }
  });
});
