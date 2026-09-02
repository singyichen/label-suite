import { test, expect, type Page } from '@playwright/test';
import {
  assertNoPageErrors,
  buildWorkspaceUrl,
  dismissGuidelineModal,
  skipGuidelineModal,
  trackPageErrors,
  type RunType,
} from './_workspace-helpers';

/* Issue #550: the reviewer workspace used to explain the review decisions with TWO
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
 *   - its content may legally branch on `run_type` (AC-3.33 only forbids the
 *     branch INSIDE a review card; this element sits outside every card).
 *   - the review card DOM itself is unaffected (AC-3.33 still holds).
 *
 * issue #596 (OpenSpec change 2026-09-01-single-owner-review-relay, task
 * 3.7): FR-070 was rewritten to state the THREE decisions' real effects, and
 * what it may say shrank in two ways this file has to follow.
 *   - No rework path exists any anymore, so nothing in the copy is about the
 *     annotator and the annotator's id is no longer interpolated. The old
 *     "names the annotator under review" pair of cases therefore became one
 *     case asserting the opposite: the copy is annotator-invariant. Dropping
 *     them outright would have left nothing pinning that the interpolation
 *     really went away.
 *   - AC-3.40 narrows the run_type branch to exactly ONE sentence -- dry_run
 *     adds 「試標的定稿只彙總一致性與被修改率」 and the two texts are
 *     otherwise identical -- so the copy constants below are composed from a
 *     shared base rather than written out twice, which is what makes an
 *     accidental second divergence fail here.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md FR-070,
 * AC-3.40, AC-3.45 (revised v4.55.0); FR-077/AC-3.42/AC-3.44 (revoked);
 * FR-070 / AC-3.40 as modified by issue #596.
 */

const ANNOTATOR = 'kioleemg12';
const OTHER_ANNOTATOR = '113450022';

/* AC-3.40: `official_run` IS the shared base, and `dry_run` is the base plus
 * one sentence. Writing them as base + suffix is deliberate -- a copy change
 * that diverged the two texts anywhere else would have to edit the base and
 * would fail both run types at once, instead of silently passing one. */
const NOTE_OFFICIAL_ZH =
  '通過：該項直接定稿，正式標記中即成為最終答案。修正：您的修正不會立即生效，該項進入爭議池待仲裁。無法判定：同樣進入爭議池，仲裁者採用審核員側即定案為無法判定。試標與正式標記皆不會將樣本送回給標記員重做。';

const DRY_SUFFIX_ZH = '試標的定稿只彙總一致性與被修改率，不產生最終答案。';

const NOTE_DRY_ZH = NOTE_OFFICIAL_ZH + DRY_SUFFIX_ZH;

const NOTE_OFFICIAL_EN =
  'Approve: the item is finalized as it stands, and in an official run that value becomes the final answer. Modify: your correction does not take effect immediately; the item enters the dispute pool for arbitration. Cannot determine: the item also enters the dispute pool, and an arbiter adopting the reviewer side settles it as undecidable. Neither a dry run nor an official run sends the sample back to the annotator to redo it.';

const DRY_SUFFIX_EN =
  ' A dry-run finalization produces no final answer; it only aggregates agreement and the modification rate.';

const NOTE_DRY_EN = NOTE_OFFICIAL_EN + DRY_SUFFIX_EN;

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

  test('official_run: zh copy is pinned verbatim', async ({ page }) => {
    await openReviewer(page, 'official_run');
    await expect(page.getByTestId('ws-review-note-bubble')).toHaveText(NOTE_OFFICIAL_ZH);
    await expect(page.getByTestId('ws-review-note-bubble')).toHaveAttribute('data-run-type', 'official_run');
  });

  test('dry_run: en copy is pinned verbatim', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
    });
    await openReviewer(page, 'dry_run');
    await expect(page.getByTestId('ws-review-note-bubble')).toHaveText(NOTE_DRY_EN);
  });

  test('official_run: en copy is pinned verbatim', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
    });
    await openReviewer(page, 'official_run');
    await expect(page.getByTestId('ws-review-note-bubble')).toHaveText(NOTE_OFFICIAL_EN);
  });

  test('dry_run never claims a rollback and never names an annotator', async ({ page }) => {
    await openReviewer(page, 'dry_run');
    const bubble = page.getByTestId('ws-review-note-bubble');
    await expect(bubble).not.toContainText('回到待標記');
    await expect(bubble).not.toContainText('重標待辦');
    await expect(bubble).not.toContainText(ANNOTATOR);
  });

  test('official_run never claims the dry_run-only consequence', async ({ page }) => {
    await openReviewer(page, 'official_run');
    const bubble = page.getByTestId('ws-review-note-bubble');
    await expect(bubble).not.toContainText(DRY_SUFFIX_ZH);
    await expect(bubble).not.toContainText('IAA');
    await expect(bubble).not.toContainText('下一輪試標');
  });

  test('FR-070: neither run type names the annotator or any removed mechanism', async ({ page }) => {
    // The copy used to interpolate the annotator id because rejecting sent
    // the sample back to that person. No rework path exists any more, so the
    // id must be gone -- read with a NON-default annotator so a hardcoded
    // kioleemg12 could not pass this by coincidence.
    for (const runType of ['dry_run', 'official_run'] as RunType[]) {
      await openReviewer(page, runType, OTHER_ANNOTATOR);
      const bubble = page.getByTestId('ws-review-note-bubble');
      await expect(bubble).not.toContainText(OTHER_ANNOTATOR);
      await expect(bubble).not.toContainText(ANNOTATOR);
      for (const banned of ['退回', '重新標記', '定稿門檻', '多數決']) {
        await expect(bubble).not.toContainText(banned);
      }
    }
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
    // T016 ofm-05 has a derived unit status, so the FR-064 banner renders
    // its 了解審核流程 trigger; the note must be the trigger's next sibling.
    // issue #596: ofm-02 no longer works here -- its sole reviewer agreed, so
    // it derives `finalized`, and FR-070's note is only rendered while the
    // unit is still decidable.
    await page.goto(
      buildWorkspaceUrl({
        task_id: 'T016',
        sample_id: 'ofm-05-all-divergent',
        role: 'reviewer',
        run_type: 'official_run',
        annotator_id: 'kioleemg12',
        reviewer_id: 'reviewer_wang',
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
    await expect(page.getByRole('button', { name: '修正', exact: true })).toHaveCount(1);
    await expect(page.getByRole('button', { name: '無法判定', exact: true })).toHaveCount(1);
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
    // dry_run carries the longer of the two copies (base + suffix).
    await openReviewer(page, 'dry_run');

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
