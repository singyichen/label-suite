import { test, expect } from '@playwright/test';

async function dismissGuidelineModal(page: import('@playwright/test').Page) {
  const guidelineModal = page.locator('#guidelineModal');
  const confirmBtn = page.locator('#guidelineModalConfirm');
  if (await confirmBtn.isVisible()) {
    await confirmBtn.click();
    await expect(guidelineModal).toBeHidden();
  }
}

test('classification task supports multi-label selection and submission', async ({ page }) => {
  await page.goto('/pages/annotation/annotation-workspace.html?task_type=single_sentence_classification&sample_id=R2-003');

  await dismissGuidelineModal(page);

  const politics = page.locator('input[name="news_category"][value="politics"]');
  const technology = page.locator('input[name="news_category"][value="technology"]');

  await politics.check();
  await technology.check();

  await expect(politics).toBeChecked();
  await expect(technology).toBeChecked();

  await page.click('#submitBtn');
  await expect(page.locator('#toastMsg')).toContainText('已提交');

  const labels = await page.evaluate(() => {
    const sample = (window as unknown as { SAMPLES: Array<{ sampleId: string; labels?: string[] | null }> }).SAMPLES
      .find((item) => item.sampleId === 'R2-003');
    return sample?.labels ?? null;
  });

  expect(labels).toEqual(['politics', 'technology']);
});
