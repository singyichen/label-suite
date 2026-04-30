import { test, expect } from '@playwright/test';

test.describe('Relation extraction accessibility', () => {
  test('undo button keeps a localized aria-label', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-workspace.html?task_type=relation_extraction&sample_id=RE-001');
    const zhGuidelineConfirm = page.locator('#guidelineModalConfirm');
    if (await zhGuidelineConfirm.isVisible()) {
      await zhGuidelineConfirm.click();
    }

    const undoButton = page.locator('#reUndoBtn');
    await expect(undoButton).toHaveAttribute('aria-label', '撤銷');

    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
    });
    await page.goto('/pages/annotation/annotation-workspace.html?task_type=relation_extraction&sample_id=RE-001');
    const enGuidelineConfirm = page.locator('#guidelineModalConfirm');
    if (await enGuidelineConfirm.isVisible()) {
      await enGuidelineConfirm.click();
    }
    await expect(undoButton).toHaveAttribute('aria-label', 'Undo');
  });
});
