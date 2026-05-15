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

  await expect(page.locator('#rvReviewNote')).toBeVisible();
  await expect(page.locator('#rvReviewNote')).toContainText('通過：此筆標記有效');

  const firstRowButtons = rows.first().locator('button');
  await expect(firstRowButtons).toHaveCount(2);
  await expect(firstRowButtons.nth(0)).toContainText('退回');
  await expect(firstRowButtons.nth(1)).toContainText('通過');

  const annotatorList = page.locator('#rvAnnotatorRows');
  await expect(annotatorList).toHaveCSS('background-color', 'rgb(248, 250, 252)');
  await expect(rows.first()).toHaveCSS('border-bottom-color', 'rgb(234, 236, 240)');
});

test('reviewer workspace translates sample text and sidebar user role in English mode', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('labelsuite.lang', 'en');
    window.localStorage.setItem('labelsuite.guidelineModalSeen', '1');
  });

  await page.goto('/pages/annotation/annotation-workspace.html?role=reviewer&task_id=TASK-015-R2&run_type=dry_run&task_type=single_sentence_va_scoring&sample_id=R2-003');

  await expect(page.locator('#roleIndicator')).toHaveText('User');
  await expect(page.locator('#sampleList .sample-item').nth(2)).toContainText('This phone truly exceeded my expectations');
  await expect(page.locator('#sampleText')).toContainText('This phone truly exceeded my expectations');
  await expect(page.locator('#sampleList')).not.toContainText('這款手機真的超出我的預期');
  await expect(page.locator('#sampleText')).not.toContainText('這款手機真的超出我的預期');
});
