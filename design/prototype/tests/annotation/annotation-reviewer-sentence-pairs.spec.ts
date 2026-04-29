import { test, expect } from '@playwright/test';

test('reviewer workspace shows original sentence-pair source block above review results', async ({ page }) => {
  await page.goto('/pages/annotation/annotation-workspace.html?role=reviewer&task_id=TASK-015-R5&run_type=dry_run&task_type=sentence_pairs&sample_id=R5-001');

  const guidelineModalConfirm = page.locator('#guidelineModalConfirm');
  if (await guidelineModalConfirm.isVisible()) {
    await guidelineModalConfirm.click();
  }

  await expect(page.locator('#sampleTextCard')).toBeHidden();
  await expect(page.locator('#sentencePairsReviewerSourceCard')).toBeVisible();
  await expect(page.locator('#sentencePairsReviewerSourceTitle')).toContainText('句對語意判定');
  await expect(page.locator('#spReviewerModeBadge')).toContainText('相似度判定');
  await expect(page.locator('#spReviewerSentence1Label')).toContainText('Sentence A');
  await expect(page.locator('#spReviewerSentence2Label')).toContainText('Sentence B');
  await expect(page.locator('#spReviewerSentence1Text')).toContainText('這部電影的視覺特效令人嘆為觀止，故事情節也相當緊湊。');
  await expect(page.locator('#spReviewerSentence2Text')).toContainText('這部片的特效非常精彩，劇情節奏流暢，值得一看。');
  await expect(page.locator('#sentencePairsReviewerSourcePanel')).toHaveCSS('display', 'flex');
  await expect(page.locator('#sentencePairsReviewerSourcePanel')).toHaveCSS('flex-direction', 'column');
  await expect(page.locator('#sentencePairsReviewerSourcePanel')).toHaveCSS('row-gap', '16px');

  const sourceBox = await page.locator('#sentencePairsReviewerSourceCard').boundingBox();
  const reviewBox = await page.locator('#reviewerCard').boundingBox();
  expect(sourceBox).not.toBeNull();
  expect(reviewBox).not.toBeNull();
  expect(sourceBox!.y).toBeLessThan(reviewBox!.y);
});
