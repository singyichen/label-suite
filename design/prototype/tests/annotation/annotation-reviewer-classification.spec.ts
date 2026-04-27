import { test, expect } from '@playwright/test';

test('reviewer workspace shows multi-label classification stats and label results', async ({ page }) => {
  await page.goto('/pages/annotation/annotation-workspace.html?role=reviewer&task_id=TASK-015-R1&run_type=official_run&task_type=single_sentence_classification&sample_id=R1-001');

  const guidelineModalConfirm = page.locator('#guidelineModalConfirm');
  if (await guidelineModalConfirm.isVisible()) {
    await guidelineModalConfirm.click();
  }

  await expect(page.locator('#reviewerCard')).toBeVisible();
  await expect(page.locator('#rvStatsSummary')).toContainText('政治×4');
  await expect(page.locator('#rvStatsSummary')).toContainText('科技×5');
  await expect(page.locator('#rvStatsSummary')).not.toContainText('mean');

  const rows = page.locator('#rvAnnotatorRows .rv-annotator-review-row');
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText('kioleemg12');
  await expect(rows.first()).toContainText('政治、科技');
  await expect(rows.first()).not.toContainText('[');
});
