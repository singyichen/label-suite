import { test, expect } from '@playwright/test';

test('ner entity delete button matches relation extraction style', async ({ page }) => {
  await page.goto('/pages/annotation/annotation-workspace.html?task_type=sequence_labeling&sub_type=ner&sample_id=1');

  const guidelineModalConfirm = page.locator('#guidelineModalConfirm');
  if (await guidelineModalConfirm.isVisible()) {
    await guidelineModalConfirm.click();
  }

  const firstEntityRow = page.locator('#nerEntityList .re-entity-row').first();
  const badge = firstEntityRow.locator('.re-entity-badge').first();
  const deleteButton = firstEntityRow.locator('button[data-entity-id]').first();

  await expect(firstEntityRow).toBeVisible();
  await expect(badge).toHaveText('ORG');
  await expect(badge).toHaveCSS('border-top-width', '1px');
  await expect(badge).toHaveCSS('border-top-left-radius', '9999px');
  await expect(deleteButton).toHaveClass(/re-entity-del-btn/);
  await expect(deleteButton).toHaveCSS('width', '20px');
  await expect(deleteButton).toHaveCSS('height', '20px');
  await expect(deleteButton).toHaveCSS('border-top-width', '1px');
});
