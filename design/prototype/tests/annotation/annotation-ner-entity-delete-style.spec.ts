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

test('ner workspace translates sample text and tagged entities in English mode', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('labelsuite.lang', 'en');
    window.localStorage.setItem('labelsuite.guidelineModalSeen', '1');
  });

  await page.goto('/pages/annotation/annotation-workspace.html?role=annotator&task_id=TASK-015-A6&run_type=official_run&task_type=sequence_labeling&sub_type=ner&sample_id=NER-003');

  await expect(page.locator('#sampleList .sample-item').nth(2)).toContainText('Ministry of Health and Welfare');
  await expect(page.locator('#sampleText')).toContainText('Ministry of Health and Welfare');
  await expect(page.locator('#sampleText')).toContainText('Minister Hsueh Jui-yuan');
  await expect(page.locator('#sampleText .ner-entity-type-badge')).toHaveText(['ORG', 'PER']);
  await expect(page.locator('#nerEntityList')).toContainText('Ministry of Health');
  await expect(page.locator('#nerEntityList')).toContainText('Hsueh Jui-yuan');
  await expect(page.locator('#sampleList')).not.toContainText('衛生福利部長薛瑞元');
  await expect(page.locator('#sampleText')).not.toContainText('衛生福利部長薛瑞元');
  await expect(page.locator('#nerEntityList')).not.toContainText('衛生福利部');
});
