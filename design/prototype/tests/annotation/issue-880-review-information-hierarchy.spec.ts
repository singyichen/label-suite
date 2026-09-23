import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/**
 * Issue #880 Red contract: separate three questions that were previously
 * presented as overlapping versions of "history".
 *
 * - The finalized card answers what the final result is and, only for a
 *   complex route, what changed and which side/action supplied the result.
 * - The right panel is the activity log: actors, timestamps, changes, reasons.
 * - The drawer is the flow/current-state model: stage, possible routes and the
 *   route this unit took, without actors, timestamps or answer values.
 *
 * The suite guards the retired `ws-finalized-trace`, the renamed activity-log
 * tab and the explanatory, route-specific flow drawer in both languages.
 */

const COMPLEX_URL = buildWorkspaceUrl({
  task_id: 'T015',
  sample_id: 'ofs-03-arbitrated-gold',
  role: 'reviewer',
  run_type: 'official_run',
  reviewer_id: 'reviewer_chen',
  annotator_id: 'kioleemg12',
});

const DIRECT_URL = buildWorkspaceUrl({
  task_id: 'T015',
  sample_id: 'ofs-01-agree-gold',
  role: 'reviewer',
  run_type: 'official_run',
  reviewer_id: 'reviewer_wang',
  annotator_id: 'kioleemg12',
});

async function open(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await expect(page.getByTestId('ws-review-finalized-card')).toBeVisible();
}

test.describe('issue #880 — finalized result summary', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
  });

  test('T015 ofs-03 shows original, final result and data-derived arbitration basis without a micro trace', async ({ page }) => {
    await open(page, COMPLEX_URL);

    const card = page.getByTestId('ws-review-finalized-card');
    await expect(card.getByTestId('ws-finalized-original')).toHaveText(
      '標記員原答案：single_label：positive',
    );
    await expect(card.getByTestId('ws-finalized-result')).toHaveText(
      '最終結果：single_label：neutral',
    );
    await expect(card.getByTestId('ws-finalized-basis')).toHaveText(
      '定稿依據：仲裁採用審核員答案',
    );

    await expect(card.getByTestId('ws-finalized-trace')).toHaveCount(0);
    await expect(card.getByTestId('ws-trace-actor')).toHaveCount(0);
    await expect(card).not.toContainText('reviewer_lin');
    await expect(card).not.toContainText('reviewer_chen');
  });

  test('a direct approval shows only the final result, without redundant original or basis blocks', async ({ page }) => {
    await open(page, DIRECT_URL);

    const card = page.getByTestId('ws-review-finalized-card');
    await expect(card.getByTestId('ws-finalized-result')).toContainText('single_label');
    await expect(card.getByTestId('ws-finalized-original')).toHaveCount(0);
    await expect(card.getByTestId('ws-finalized-basis')).toHaveCount(0);
    await expect(card.getByTestId('ws-finalized-trace')).toHaveCount(0);
  });
});

test.describe('issue #880 — activity log and flow/current-state drawer', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
    await open(page, COMPLEX_URL);
  });

  test('uses distinct Chinese labels and explains the complex route without audit details', async ({ page }) => {
    await expect(page.locator('#wsTabHistoryLabel')).toHaveText('操作紀錄');

    const trigger = page.getByTestId('ws-review-flow-trigger');
    await expect(trigger).toHaveText('流程與目前狀態');
    await trigger.click();

    const dialog = page.getByTestId('ws-review-flow-drawer');
    await expect(dialog).toHaveAccessibleName('流程與目前狀態');
    await expect(dialog.getByTestId('ws-review-flow-description')).toHaveText(
      '顯示此審核單位目前所在階段與可能路線',
    );
    await expect(dialog.getByTestId('ws-review-flow-route-summary')).toHaveText(
      '此單位經由「修正或無法裁決」進入爭議，仲裁後定稿。',
    );
    await expect(dialog.locator('[aria-current="step"]')).toContainText('已定稿');

    await expect(dialog).not.toContainText('reviewer_lin');
    await expect(dialog).not.toContainText('reviewer_chen');
    await expect(dialog).not.toContainText('positive');
    await expect(dialog).not.toContainText('neutral');
  });

  test('keeps the same information split in English', async ({ page }) => {
    await page.getByTestId('lang-toggle').click();

    await expect(page.locator('#wsTabHistoryLabel')).toHaveText('Activity log');
    const trigger = page.getByTestId('ws-review-flow-trigger');
    await expect(trigger).toHaveText('Flow & current status');
    await trigger.click();

    const dialog = page.getByTestId('ws-review-flow-drawer');
    await expect(dialog).toHaveAccessibleName('Flow & current status');
    await expect(dialog.getByTestId('ws-review-flow-description')).toHaveText(
      'Shows this review unit’s current stage and possible routes.',
    );
    await expect(dialog.getByTestId('ws-review-flow-route-summary')).toHaveText(
      'This unit entered a dispute through “Modified or cannot adjudicate” and was finalized after arbitration.',
    );
  });

  test('desktop drawer shows the complete state track without horizontal clipping', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.getByTestId('ws-review-flow-trigger').click();

    const track = page.getByTestId('ws-review-flow-drawer').locator('.rv-flow-track');
    const overflow = await track.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

    const drawerBox = await page.getByTestId('ws-review-flow-drawer').boundingBox();
    const currentBox = await track.locator('[aria-current="step"]').boundingBox();
    expect(drawerBox).not.toBeNull();
    expect(currentBox).not.toBeNull();
    expect((currentBox?.x ?? 0) + (currentBox?.width ?? 0))
      .toBeLessThanOrEqual((drawerBox?.x ?? 0) + (drawerBox?.width ?? 0));
  });
});
