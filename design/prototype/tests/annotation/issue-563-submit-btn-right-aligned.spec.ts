/**
 * Reviewer submit buttons sit at the right edge of their row (issue #563)
 * Source spec: specs/annotation/015-annotation-workspace/spec.md
 *
 * §頁面結構 puts the primary submit action on the RIGHT of the bottom action
 * bar. That held for annotators, whose autosave status occupies the left
 * slot, but `.action-bar` lays out with `justify-content: space-between`
 * and renderAutosaveStatus() hides the status entirely for reviewers -- so
 * the lone `.action-bar-right` collapsed to the left edge. The arbitration
 * card's 送出仲裁 button was simply appended in flow, i.e. left-aligned.
 *
 * Each test measures bounding boxes: the button's right edge must land
 * within the row's right padding, and its left edge must be past the row's
 * midpoint, so a full-width or centred button cannot pass by accident.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, skipGuidelineModal } from './_workspace-helpers';

type WorkspaceData = {
  markSampleSubmitted: (
    taskId: string, role: string, runType: string, sampleId: string,
    payload: unknown, historySummary: string,
    identity: { annotatorId?: string; reviewerId?: string }
  ) => void;
};

declare global {
  interface Window {
    LabelSuiteAnnotationWorkspaceData: WorkspaceData;
  }
}

/* Widest gap the right padding of either container may leave between the
   button and the container edge (action-bar uses --space-lg = 24px). */
const RIGHT_PADDING_TOLERANCE = 32;

async function expectRightAligned(button: Locator, container: Locator) {
  await expect(button).toBeVisible();
  const btn = await button.boundingBox();
  const box = await container.boundingBox();
  if (!btn || !box) throw new Error('bounding boxes unavailable');
  const containerRight = box.x + box.width;
  const buttonRight = btn.x + btn.width;
  expect(containerRight - buttonRight).toBeLessThanOrEqual(RIGHT_PADDING_TOLERANCE);
  expect(btn.x).toBeGreaterThan(box.x + box.width / 2);
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('Submit buttons are right-aligned (issue #563)', () => {
  test('reviewer：送出審核靠底部操作列右側', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({
      task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'official_run',
    }));
    await dismissGuidelineModal(page);

    /* Anchor: this is the reviewer layout -- the autosave status is gone. */
    await expect(page.getByTestId('ws-autosave-status')).toBeHidden();
    await expectRightAligned(page.getByTestId('ws-review-submit-btn'), page.locator('.action-bar'));
  });

  test('annotator：送出仍靠右（未被連帶改壞）', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({
      task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'official_run',
    }));
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-autosave-status')).toBeVisible();
    await expectRightAligned(page.getByTestId('ws-submit-btn'), page.locator('.action-bar'));
  });

  test('arbiter：送出仲裁靠仲裁卡右側', async ({ page }) => {
    /* Same seed as annotation-workspace-arbitration.spec.ts: annotator sad,
       reviewer_wang fear, reviewer_lin sad -> 1:1 tie at N=2, one open item
       for reviewer_chen (can_arbitrate) to decide. */
    const url = buildWorkspaceUrl({
      task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'official_run',
      annotator_id: 'kioleemg12', reviewer_id: 'reviewer_chen',
    });
    await page.goto(url);
    await seedDisputedUnit(page);
    await page.reload();
    await dismissGuidelineModal(page);

    const card = page.getByTestId('ws-arbitration-card');
    await expect(card).toBeVisible();
    await expectRightAligned(page.getByTestId('ws-arbitration-submit'), card);
  });
});

async function seedDisputedUnit(page: Page) {
  const labelPayload = (selected: string) => ({ previewState: { single_label: { selected } } });
  const seeds: Array<{ role: string; payload: unknown; identity: { annotatorId?: string; reviewerId?: string } }> = [
    { role: 'annotator', payload: labelPayload('sad'), identity: { annotatorId: 'kioleemg12' } },
    { role: 'reviewer', payload: labelPayload('fear'), identity: { annotatorId: 'kioleemg12', reviewerId: 'reviewer_wang' } },
    { role: 'reviewer', payload: labelPayload('sad'), identity: { annotatorId: 'kioleemg12', reviewerId: 'reviewer_lin' } },
  ];
  for (const s of seeds) {
    await page.evaluate((a) => {
      window.LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
        'T001', a.role, 'official_run', 'sent-001', a.payload, '', a.identity
      );
    }, s);
  }
}
