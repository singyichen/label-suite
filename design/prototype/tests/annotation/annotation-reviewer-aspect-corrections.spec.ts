import { test, expect } from '@playwright/test';

test('reviewer can directly add and delete aspects for aspect list review', async ({ page }) => {
  await page.goto('/pages/annotation/annotation-workspace.html?role=reviewer&task_type=sequence_labeling&sample_id=AL-001');
  await page.locator('#guidelineModalConfirm').click();

  const firstReviewRow = page.locator('.rv-annotator-review-row').first();
  await expect(firstReviewRow).toContainText('kioleemg12');

  const editor = firstReviewRow.locator('.rv-aspect-correction-editor');
  await expect(editor).toBeVisible();
  await expect(editor.locator('.rv-aspect-correction-input')).toHaveCount(3);

  const addButton = editor.locator('.rv-aspect-correction-add');
  await expect(addButton).toBeVisible();
  await expect(addButton).toContainText('新增 Aspect');
  await expect(addButton).toHaveCSS('color', 'rgb(16, 185, 129)');
  await expect(addButton).toHaveCSS('border-color', 'rgb(16, 185, 129)');

  await editor.locator('.rv-aspect-correction-delete').first().click();
  await expect(editor.locator('.rv-aspect-correction-input')).toHaveCount(2);
  await expect(firstReviewRow).toContainText('Reviewer 已刪除');

  await addButton.click();
  await expect(editor.locator('.rv-aspect-correction-input')).toHaveCount(3);
  await editor.locator('.rv-aspect-correction-input').last().fill('政策影響');
  await expect(firstReviewRow).toContainText('Reviewer 已新增');
});
