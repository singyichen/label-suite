import { test, expect } from '@playwright/test';

test('moves task status to waiting IAA confirmation after all 5 dry-run samples are submitted', async ({ page }) => {
  await page.goto('/pages/annotation/annotation-workspace.html?task_id=TASK-014&run_type=dry_run&task_type=single_sentence_classification');

  const guidelineModalConfirm = page.locator('#guidelineModalConfirm');
  if (await guidelineModalConfirm.isVisible()) {
    await guidelineModalConfirm.click();
  }

  for (let done = 3; done <= 5; done += 1) {
    await page.locator('.class-option').nth(2).click();
    await page.locator('#submitBtn').click();
    await expect(page.locator('#progressText')).toHaveText(`${done} / 5 已提交`);
    if (done < 5) {
      await page.waitForTimeout(450);
    }
  }

  await page.goto('/pages/task-management/task-detail.html?task_id=TASK-014&status=dry_run_in_progress');
  await expect(page.locator('#statusBadge')).toHaveText('待 IAA 確認');
});
