import { test, expect } from '@playwright/test';

test('reviewer ner diff section keeps content without subtitle', async ({ page }) => {
  await page.goto('/pages/annotation/annotation-workspace.html?role=reviewer&task_type=sequence_labeling&sub_type=ner&sample_id=1');

  const guidelineModalConfirm = page.locator('#guidelineModalConfirm');
  if (await guidelineModalConfirm.isVisible()) {
    await guidelineModalConfirm.click();
  }

  const firstReviewRow = page.locator('#rvAnnotatorRows .rv-annotator-review-row').first();
  const diffSection = firstReviewRow.locator('.rv-aspect-diff');

  await expect(firstReviewRow).toBeVisible();
  await expect(diffSection).toBeVisible();
  await expect(diffSection).not.toContainText('NER 標記差異');
  await expect(diffSection).toContainText('ORG');
  await expect(diffSection).toContainText('台積電');
});
