import { test, expect } from '@playwright/test';

async function dismissGuidelineModal(page: import('@playwright/test').Page) {
  const guidelineModal = page.locator('#guidelineModal');
  const confirmBtn = page.locator('#guidelineModalConfirm');
  if (await confirmBtn.isVisible()) {
    await confirmBtn.click();
    await expect(guidelineModal).toBeHidden();
  }
}

test('keeps single-column content width on mobile even after guideline panel is collapsed', async ({ page }) => {
  await page.goto('/pages/annotation/annotation-workspace.html?task_type=single_sentence_va_scoring');

  await dismissGuidelineModal(page);

  await page.locator('#guidelineCollapseBtn').click();
  await page.setViewportSize({ width: 390, height: 844 });

  const metrics = await page.evaluate(() => {
    const workspaceBody = document.getElementById('workspaceBody');
    const contentColumn = document.querySelector('.col-content') as HTMLElement | null;
    if (!workspaceBody || !contentColumn) return null;
    const bodyWidth = workspaceBody.getBoundingClientRect().width;
    const contentWidth = contentColumn.getBoundingClientRect().width;
    return { bodyWidth, contentWidth };
  });

  expect(metrics).not.toBeNull();
  expect(metrics!.contentWidth).toBeGreaterThan(metrics!.bodyWidth * 0.9);
});
