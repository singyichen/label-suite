import { test, expect } from '@playwright/test';

test('opens guideline image modal when image file is clicked', async ({ page }) => {
  await page.goto('/pages/annotation/annotation-workspace.html?task_type=single_sentence_va_scoring');

  const guidelineModalConfirm = page.locator('#guidelineModalConfirm');
  if (await guidelineModalConfirm.isVisible()) {
    await guidelineModalConfirm.click();
  }

  await page.locator('#guidelineFileBtn2').click();

  const imageModal = page.locator('#guidelineImageModal');
  const modalImage = page.locator('#guidelineImageModalPreview');

  await expect(imageModal).toBeVisible();
  await expect(modalImage).toBeVisible();
  await expect(modalImage).toHaveAttribute('src', /assets\/images\/task-management\/VA_emj\.png$/);
});
