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
 * This spec pins the STRUCTURAL half of that fix, which issue #550 left
 * untouched: the note (now a tooltip, see issue-550-review-note-tooltip.
 * spec.ts for its content and accessibility contract) is rendered exactly
 * ONCE per review unit, above the card stack whose decision pairs it
 * explains -- everything else the note is NOT allowed to disturb stays put:
 * the decision buttons and their accessible names (issue #399), and the
 * per-output-type original answers and correction titles.
 *
 * What issue #550 changed and is therefore NOT pinned here anymore: the note
 * used to be one run-type-invariant string (AC-3.33-forbidden-branch
 * reasoning) and deferred the submit consequence to a separate confirmation
 * area. Both are gone -- the tooltip now legally branches on `run_type` and
 * carries the consequence itself (see issue-550-review-note-tooltip.spec.ts).
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md FR-070,
 * AC-3.40, AC-3.45 (revised v4.55.0, issue #550).
 */

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

  test('per-output-type card content is untouched — originals, correction titles, panels', async ({ page }) => {
    await openReviewer(page, 'T013', 'absa-001', 'official_run');

    // AC-3.45: the annotator's original answer is still named once per
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
});
