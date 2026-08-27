/**
 * T014-T017 (review-flow demo tasks, issue #302 / task-list.data.js) were
 * missing from TASK_META, so opening the dataset detail page with any of
 * their task_id redirected to the list as "invalid_task" (issue #490).
 */
import { test, expect } from '@playwright/test';

const DETAIL_URL = '/pages/dataset/dataset-analysis-detail.html';

const REVIEW_FLOW_TASKS: Array<{ taskId: string; title: string }> = [
  { taskId: 'T014', title: '審核流程示範：試標' },
  { taskId: 'T015', title: '審核流程示範：正式標記（單一審核員）' },
  { taskId: 'T016', title: '審核流程示範：正式標記（三審核員多數決）' },
  { taskId: 'T017', title: '審核流程示範：正式標記（雙審核員平手）' },
];

test.describe('Dataset detail — review-flow demo tasks (T014-T017) are reachable', () => {
  for (const { taskId, title } of REVIEW_FLOW_TASKS) {
    test(`${taskId} opens on the detail page without an invalid_task redirect`, async ({ page }) => {
      await page.goto(`${DETAIL_URL}?task_id=${taskId}&tab=quality`);

      await expect(page).toHaveURL(new RegExp(`task_id=${taskId}`));
      await expect(page).not.toHaveURL(/dataset-analysis-list\.html/);
      await expect(page.locator('#bcCurrent')).toHaveText(title);
    });
  }

  test('T014 (dry_run, seeded reviewer data): single_label IAA card shows the real derived alpha, not a hardcoded value', async ({ page }) => {
    await page.goto(`${DETAIL_URL}?task_id=T014&tab=quality`);

    const card = page.locator('section[aria-labelledby="iaaTitle"]');
    await expect(card.locator('.iaa-card-value')).toHaveText('0.59');
    await expect(card.locator('.iaa-card-value')).toHaveClass(/fail/);
    await expect(page.locator('#iaaSummaryBadge')).toHaveText('0/1 達標');
  });

  test('T015 (official_run, no dry_run reviewer data): single_label IAA card shows "not computable", never 0.00', async ({ page }) => {
    await page.goto(`${DETAIL_URL}?task_id=T015&tab=quality`);

    const card = page.locator('section[aria-labelledby="iaaTitle"]');
    await expect(card.locator('.iaa-card-value')).toHaveText('無法計算');
    await expect(card.locator('.iaa-card-value')).not.toHaveText('0.00');
    await expect(card.locator('.iaa-card-value')).toHaveClass(/warn/);
    await expect(page.locator('#iaaSummaryBadge')).toHaveText('—/1 待完成 Dry Run');
  });
});
