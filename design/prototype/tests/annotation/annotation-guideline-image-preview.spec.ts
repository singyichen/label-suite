import { test, expect } from '@playwright/test';

test('shows VA example image in guideline preview area when image file is clicked', async ({ page }) => {
  await page.goto('/pages/annotation/annotation-workspace.html?task_type=single_sentence_va_scoring');

  const guidelineModalConfirm = page.locator('#guidelineModalConfirm');
  if (await guidelineModalConfirm.isVisible()) {
    await guidelineModalConfirm.click();
  }

  await page.locator('#guidelineFileBtn2').click();

  const previewPanel = page.locator('#guidelineImagePreviewPanel');
  const previewImage = page.locator('#guidelineImagePreview');

  await expect(previewPanel).toBeVisible();
  await expect(previewImage).toBeVisible();
  await expect(previewImage).toHaveAttribute('src', /assets\/images\/task-management\/VA_emj\.png$/);
});
