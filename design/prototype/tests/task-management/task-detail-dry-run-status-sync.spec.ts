import { test, expect } from '@playwright/test';

test('moves task status to waiting IAA confirmation after all 5 dry-run samples are submitted', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('labelsuite.guidelineModalSeen', '1');
  });
  await page.goto('/pages/annotation/annotation-workspace.html?task_id=TASK-014&run_type=dry_run&task_type=single_sentence_classification');

  const guidelineModalConfirm = page.locator('#guidelineModalConfirm');
  if (await guidelineModalConfirm.isVisible()) {
    await guidelineModalConfirm.click();
  }

  /* Annotation panels arrive via fetched partials and bindEvents() only runs
     after the last one (#sentencePairsAnnotatorPanel) lands; the class options
     ship in the first partial, so wait for the last before clicking. */
  await page
    .locator('#sentencePairsAnnotatorPanel')
    .waitFor({ state: 'attached', timeout: 15000 });

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
