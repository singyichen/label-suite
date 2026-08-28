import { test, expect, type Page } from '@playwright/test';
import {
  assertNoPageErrors,
  buildWorkspaceUrl,
  dismissGuidelineModal,
  skipGuidelineModal,
  trackPageErrors,
  type RunType,
} from './_workspace-helpers';

/* Issue #550: the reviewer workspace used to explain approve/reject with TWO
 * elements that said overlapping things -- a run-type-invariant paragraph
 * above the card stack (`ws-review-note`, issue #520) and a pre-submit
 * confirmation area below it (`ws-review-summary-effect`, FR-077/AC-3.42)
 * that stated the run-type-dependent submit consequence. Both are gone as
 * separate things; this spec pins the replacement:
 *
 *   - ONE tooltip per unit, mounted INSIDE the unit-context banner
 *     (`ws-review-unit-context`) immediately after the 了解審核流程 trigger
 *     (`ws-review-flow-trigger`) -- still above the card stack and outside
 *     every `ws-review-row`, but now beside the other unit-level controls,
 *     built per design/system/MASTER.md's Tooltip spec (a real <button>
 *     trigger, a role="tooltip" bubble linked by aria-describedby -- never
 *     the native title attribute).
 *   - its content now legally branches on `run_type` (AC-3.33 only forbids
 *     the branch INSIDE a review card; this element sits outside every
 *     card), so it absorbs the submit consequence that used to live in the
 *     confirmation area.
 *   - the two `run_type` texts are mutually exclusive: `dry_run` never
 *     claims a rollback or names an annotator; `official_run` names the
 *     annotator under review.
 *   - the review card DOM itself is unaffected (AC-3.33 still holds).
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md FR-070,
 * AC-3.40, AC-3.45 (revised v4.55.0); FR-077/AC-3.42/AC-3.44 (revoked).
 */

const ANNOTATOR = 'kioleemg12';
const OTHER_ANNOTATOR = '113450022';

const NOTE_DRY_ZH =
  '通過：採用該輸出類型目前顯示的作答（含您的修正）為審核結果。退回：記錄不採用的決策與修正差異。送出後——試標：不回退標記員狀態，品質問題由任務層級 IAA 閘門與下一輪試標處理。';

const NOTE_OFFICIAL_ZH = (annotator: string) =>
  `通過：採用該輸出類型目前顯示的作答（含您的修正）為審核結果。退回：記錄不採用的決策與修正差異。送出後——正式標記：任一輸出類型退回會使此單位回到待標記，並產生標記員 ${annotator} 的重標待辦；全部通過則標記員狀態不變。`;

const NOTE_DRY_EN =
  'Approve: the answer currently shown for that output type (including your correction) becomes the review result. Reject: records the decision not to accept it, plus any correction. After submitting — dry run: the annotator status is not rolled back; quality issues are handled by the task-level IAA gate and the next dry run.';

const NOTE_OFFICIAL_EN = (annotator: string) =>
  `Approve: the answer currently shown for that output type (including your correction) becomes the review result. Reject: records the decision not to accept it, plus any correction. After submitting — official run: rejecting any output type returns this unit to pending and creates a re-annotation task for ${annotator}; if everything is approved the annotator status is unchanged.`;

async function openReviewer(page: Page, runType: RunType, annotatorId = ANNOTATOR): Promise<void> {
  await page.goto(
    buildWorkspaceUrl({
      task_id: 'T001',
      sample_id: 'sent-001',
      role: 'reviewer',
      run_type: runType,
      annotator_id: annotatorId,
    })
  );
  await dismissGuidelineModal(page);
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('the review note renders as a real tooltip (issue #550)', () => {
  test('the trigger is a real button with an aria-label, and the bubble is a linked role=tooltip', async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await openReviewer(page, 'official_run');

    const trigger = page.getByTestId('ws-review-note-trigger');
    await expect(trigger).toHaveCount(1);
    expect(await trigger.evaluate((el) => el.tagName)).toBe('BUTTON');
    expect(await trigger.getAttribute('aria-label')).toBeTruthy();

    const bubble = page.getByTestId('ws-review-note-bubble');
    await expect(bubble).toHaveAttribute('role', 'tooltip');
    const bubbleId = await bubble.getAttribute('id');
    expect(bubbleId).toBeTruthy();
    expect(await trigger.getAttribute('aria-describedby')).toBe(bubbleId);

    assertNoPageErrors(errors);
  });

  test('the page never uses the native title attribute for this explanation', async ({ page }) => {
    await openReviewer(page, 'official_run');
    const trigger = page.getByTestId('ws-review-note-trigger');
    expect(await trigger.getAttribute('title')).toBeNull();
  });

  test('the bubble is hidden until hover or keyboard focus', async ({ page }) => {
    await openReviewer(page, 'official_run');
    const bubble = page.getByTestId('ws-review-note-bubble');
    await expect(bubble).toBeHidden();

    await page.getByTestId('ws-review-note-trigger').focus();
    await expect(bubble).toBeVisible();
  });

  test('the tooltip trigger never renders inside a ws-review-row', async ({ page }) => {
    await openReviewer(page, 'official_run');
    await expect(page.getByTestId('ws-review-row').getByTestId('ws-review-note-trigger')).toHaveCount(0);
  });
});

test.describe('the tooltip content branches on run_type and each branch stays exclusive (issue #550)', () => {
  test('dry_run: zh copy is pinned verbatim', async ({ page }) => {
    await openReviewer(page, 'dry_run');
    await expect(page.getByTestId('ws-review-note-bubble')).toHaveText(NOTE_DRY_ZH);
    await expect(page.getByTestId('ws-review-note-bubble')).toHaveAttribute('data-run-type', 'dry_run');
  });

  test('official_run: zh copy is pinned verbatim and names the reviewed annotator', async ({ page }) => {
    await openReviewer(page, 'official_run');
    await expect(page.getByTestId('ws-review-note-bubble')).toHaveText(NOTE_OFFICIAL_ZH(ANNOTATOR));
    await expect(page.getByTestId('ws-review-note-bubble')).toHaveAttribute('data-run-type', 'official_run');
  });

  test('dry_run: en copy is pinned verbatim', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
    });
    await openReviewer(page, 'dry_run');
    await expect(page.getByTestId('ws-review-note-bubble')).toHaveText(NOTE_DRY_EN);
  });

  test('official_run: en copy is pinned verbatim and names the reviewed annotator', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
    });
    await openReviewer(page, 'official_run');
    await expect(page.getByTestId('ws-review-note-bubble')).toHaveText(NOTE_OFFICIAL_EN(ANNOTATOR));
  });

  test('dry_run never claims a rollback and never names an annotator', async ({ page }) => {
    await openReviewer(page, 'dry_run');
    const bubble = page.getByTestId('ws-review-note-bubble');
    await expect(bubble).not.toContainText('回到待標記');
    await expect(bubble).not.toContainText('重標待辦');
    await expect(bubble).not.toContainText(ANNOTATOR);
  });

  test('official_run never claims the dry_run IAA-gate consequence', async ({ page }) => {
    await openReviewer(page, 'official_run');
    const bubble = page.getByTestId('ws-review-note-bubble');
    await expect(bubble).not.toContainText('IAA');
    await expect(bubble).not.toContainText('下一輪試標');
  });

  test('the named annotator tracks the annotator actually under review, not a constant', async ({ page }) => {
    await openReviewer(page, 'official_run', OTHER_ANNOTATOR);
    const bubble = page.getByTestId('ws-review-note-bubble');
    await expect(bubble).toContainText(OTHER_ANNOTATOR);
    await expect(bubble).not.toContainText(ANNOTATOR);
  });
});

test.describe('the tooltip mounts once per review unit, above the card stack (issue #520 contract preserved)', () => {
  const CASES: Array<{ taskId: string; sampleId: string; cards: number; label: string }> = [
    { taskId: 'T013', sampleId: 'absa-001', cards: 2, label: 'three output types, two cards' },
    { taskId: 'T010', sampleId: 'med-001', cards: 1, label: 'merged span card' },
    { taskId: 'T001', sampleId: 'sent-001', cards: 1, label: 'single output type' },
  ];

  for (const { taskId, sampleId, cards, label } of CASES) {
    for (const runType of ['dry_run', 'official_run'] as RunType[]) {
      test(`${taskId} (${label}) renders exactly one tooltip in ${runType}`, async ({ page }) => {
        await page.goto(buildWorkspaceUrl({ task_id: taskId, sample_id: sampleId, role: 'reviewer', run_type: runType }));
        await dismissGuidelineModal(page);

        await expect(page.getByTestId('ws-review-row')).toHaveCount(cards);
        await expect(page.getByTestId('ws-review-note')).toHaveCount(1);
        await expect(page.getByTestId('ws-review-note-trigger')).toHaveCount(1);
      });
    }
  }

  test('the tooltip sits above the card stack, not inside any one card', async ({ page }) => {
    await openReviewer(page, 'official_run');
    const precedesFirstCard = await page.evaluate(() => {
      const note = document.querySelector('[data-testid="ws-review-note"]');
      const firstRow = document.querySelector('[data-testid="ws-review-row"]');
      if (!note || !firstRow) return null;
      return (note.compareDocumentPosition(firstRow) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    });
    expect(precedesFirstCard).toBe(true);
  });

  test('the tooltip lives in the unit-context banner, right after the review-flow trigger', async ({ page }) => {
    // T016 ofm-02 has a derived unit status, so the FR-064 banner renders
    // its 了解審核流程 trigger; the note must be the trigger's next sibling.
    await page.goto(
      buildWorkspaceUrl({
        task_id: 'T016',
        sample_id: 'ofm-02-approved-interim',
        role: 'reviewer',
        run_type: 'official_run',
        annotator_id: 'kioleemg12',
        reviewer_id: 'reviewer_chen',
      })
    );
    await dismissGuidelineModal(page);
    const banner = page.getByTestId('ws-review-unit-context');
    await expect(banner.getByTestId('ws-review-flow-trigger')).toHaveCount(1);
    await expect(banner.getByTestId('ws-review-note')).toHaveCount(1);
    await expect(banner.getByTestId('ws-review-note-trigger')).toHaveCount(1);
    const followsFlowTrigger = await page.evaluate(() => {
      const flow = document.querySelector('[data-testid="ws-review-flow-trigger"]');
      const note = document.querySelector('[data-testid="ws-review-note"]');
      return !!flow && !!note && flow.nextElementSibling === note;
    });
    expect(followsFlowTrigger).toBe(true);
  });

  test('a unit with no derived status has no flow trigger, so the tooltip is simply the banner\'s last child', async ({ page }) => {
    await openReviewer(page, 'official_run');
    const banner = page.getByTestId('ws-review-unit-context');
    await expect(banner.getByTestId('ws-review-flow-trigger')).toHaveCount(0);
    await expect(banner.getByTestId('ws-review-note')).toHaveCount(1);
    const isLastChild = await page.evaluate(() => {
      const banner = document.querySelector('[data-testid="ws-review-unit-context"]');
      const note = document.querySelector('[data-testid="ws-review-note"]');
      return !!banner && !!note && banner.lastElementChild === note;
    });
    expect(isLastChild).toBe(true);
  });
});

test.describe('the review card is unaffected by the tooltip (AC-3.33 still holds)', () => {
  test('T001 review card DOM (excluding the tooltip) is identical across run types', async ({ page }) => {
    async function cardHtml(runType: RunType): Promise<string | null> {
      await openReviewer(page, runType);
      return page.evaluate(() => document.querySelector('[data-testid="ws-review-row"]')?.outerHTML ?? null);
    }
    const dryHtml = await cardHtml('dry_run');
    const officialHtml = await cardHtml('official_run');
    expect(dryHtml).not.toBeNull();
    expect(dryHtml).toBe(officialHtml);
  });

  test('decision buttons keep their accessible names regardless of the tooltip', async ({ page }) => {
    await openReviewer(page, 'official_run');
    await expect(page.getByRole('button', { name: '通過', exact: true })).toHaveCount(1);
    await expect(page.getByRole('button', { name: '退回', exact: true })).toHaveCount(1);
  });
});

test.describe('accessibility: keyboard focus and small viewports (issue #550)', () => {
  test('Tab-focusing the trigger opens the bubble', async ({ page }) => {
    await openReviewer(page, 'official_run');
    const trigger = page.getByTestId('ws-review-note-trigger');
    const bubble = page.getByTestId('ws-review-note-bubble');

    await trigger.focus();
    await expect(trigger).toBeFocused();
    await expect(bubble).toBeVisible();
  });

  test('the bubble does not cause horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    // official_run carries the longer of the two copies (88 zh characters).
    await openReviewer(page, 'official_run');

    await page.getByTestId('ws-review-note-trigger').focus();
    const bubble = page.getByTestId('ws-review-note-bubble');
    await expect(bubble).toBeVisible();

    const box = await bubble.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(375 + 1);
    }

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
