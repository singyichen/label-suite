import { test, expect } from '@playwright/test';

test.describe('Annotation workspace localized sample content', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
      window.localStorage.setItem('labelsuite.guidelineModalSeen', '1');
    });
  });

  async function ensureEnglishMode(page: import('@playwright/test').Page) {
    if (await page.locator('#langLabel').textContent() !== 'EN') {
      await page.locator('#langToggle').click();
    }
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  }

  test('classification sample list and source text use English content', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-workspace.html?role=annotator&task_id=TASK-015-A1&run_type=official_run&task_type=single_sentence_classification&sample_id=R2-001');
    await ensureEnglishMode(page);

    await expect(page.locator('#sampleList .sample-item').first()).toContainText('Legislature passes tech industry transformation act');
    await expect(page.locator('#sampleText')).toContainText('Legislature passes tech industry transformation act');
    await expect(page.locator('#sampleList')).not.toContainText('立法院三讀通過');
    await expect(page.locator('#sampleText')).not.toContainText('立法院三讀通過');
  });

  test('aspect-list source, editable sentence, and aspects use English content', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-workspace.html?role=annotator&task_id=TASK-015-A3&run_type=official_run&task_type=sequence_labeling&sub_type=aspect_list&sample_id=AL-003');
    await ensureEnglishMode(page);

    await expect(page.locator('#sampleList .sample-item').nth(2)).toContainText("The hotel's breakfast quality is excellent");
    await expect(page.locator('#sampleText')).toContainText("The hotel's breakfast quality is excellent");
    await expect(page.locator('#aspectOriginalSentence')).toContainText("The hotel's breakfast quality is excellent");
    await expect(page.locator('#aspectCorrectedSentence')).toHaveValue(/room soundproofing/);
    await expect(page.locator('#aspectRows input').nth(0)).toHaveValue('breakfast quality');
    await expect(page.locator('#aspectRows input').nth(1)).toHaveValue('parking');
    await expect(page.locator('#aspectRows')).not.toContainText('早餐品質');
    await expect(page.locator('#sampleText')).not.toContainText('這家飯店的早餐品質');
  });

  test('relation extraction source and entity list use English content', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-workspace.html?role=annotator&task_id=TASK-015-A4&run_type=official_run&task_type=relation_extraction&sample_id=RE-001');
    await ensureEnglishMode(page);

    await expect(page.locator('#sampleList .sample-item').first()).toContainText('Aspirin can relieve headaches');
    await expect(page.locator('#sampleText')).toContainText('Aspirin can relieve headaches');
    await expect(page.locator('#reEntityList')).toContainText('Aspirin');
    await expect(page.locator('#reEntityList')).toContainText('headaches');
    await expect(page.locator('#reEntityList')).not.toContainText('阿司匹靈');
    await expect(page.locator('#sampleText')).not.toContainText('阿司匹靈');
  });

  test('sentence-pair list and pair source use English content', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-workspace.html?role=reviewer&task_id=TASK-015-R5&run_type=dry_run&task_type=sentence_pairs&sample_id=R5-001');
    await ensureEnglishMode(page);

    await expect(page.locator('#sampleList .sample-item').first()).toContainText("The film's visual effects are breathtaking");
    await expect(page.locator('#spReviewerSentence1Text')).toContainText("The film's visual effects are breathtaking");
    await expect(page.locator('#spReviewerSentence2Text')).toContainText('The special effects are spectacular');
    await expect(page.locator('#sampleList')).not.toContainText('這部電影的視覺特效');
    await expect(page.locator('#spReviewerSentence1Text')).not.toContainText('這部電影的視覺特效');
  });

  test('annotation note placeholder follows English language mode', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-workspace.html?role=annotator&task_id=TASK-015-A5&run_type=dry_run&task_type=sentence_pairs&sample_id=A5-003');
    await ensureEnglishMode(page);

    await expect(page.locator('#annotationNoteLabel')).toHaveText('Notes (optional)');
    await expect(page.locator('#annotationNote')).toHaveAttribute('placeholder', 'Describe special cases here...');
  });
});
