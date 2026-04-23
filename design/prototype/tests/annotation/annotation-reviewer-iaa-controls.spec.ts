import { test, expect } from '@playwright/test';

test('reviewer workspace shows IAA summary, annotator results, and bulk controls for VA scoring', async ({ page }) => {
  await page.goto('/pages/annotation/annotation-workspace.html?role=reviewer&task_id=TASK-015-R2&run_type=dry_run&task_type=single_sentence_va_scoring&sample_id=R2-001');

  const guidelineModalConfirm = page.locator('#guidelineModalConfirm');
  if (await guidelineModalConfirm.isVisible()) {
    await guidelineModalConfirm.click();
  }

  await expect(page.locator('#reviewerCard')).toBeVisible();
  await expect(page.locator('#rvStatsSummary')).toContainText('mean');
  await expect(page.locator('#rvStatsSummary')).toContainText('±1.5std V');
  await expect(page.locator('#rvStatsSummary')).toContainText('±1.5std A');

  const rows = page.locator('#rvAnnotatorRows .rv-annotator-review-row');
  await expect(rows).toHaveCount(6);
  await expect(rows.first()).toContainText('kioleemg12');
  await expect(rows.first()).toContainText('[6, 5.5]');
  await expect(page.locator('#rvBulkApproveBtn')).toBeVisible();
  await expect(page.locator('#rvBulkRejectBtn')).toBeVisible();
});
