import { test, expect } from '@playwright/test';

const ANNOTATOR_TASK_TITLE_CASES = [
  {
    name: 'classification',
    url: '/pages/annotation/annotation-workspace.html?role=annotator&task_id=TASK-015-A1&run_type=official_run&task_type=single_sentence_classification&sample_id=A1-001',
    expectedTitle: '新聞標題多標籤分類',
  },
  {
    name: 'va scoring',
    url: '/pages/annotation/annotation-workspace.html?role=annotator&task_id=TASK-015-A2&run_type=dry_run&task_type=single_sentence_va_scoring&sample_id=A2-001',
    expectedTitle: '情感 VA 雙維度評分',
  },
  {
    name: 'aspect list',
    url: '/pages/annotation/annotation-workspace.html?role=annotator&task_id=TASK-015-A3&run_type=official_run&task_type=sequence_labeling&sub_type=aspect_list&sample_id=AL-001',
    expectedTitle: '產品評論序列標記（NER / Aspect）',
  },
  {
    name: 'NER',
    url: '/pages/annotation/annotation-workspace.html?role=annotator&task_id=TASK-015-A6&run_type=official_run&task_type=sequence_labeling&sub_type=ner&sample_id=NER-001',
    expectedTitle: 'NER 命名實體辨識',
  },
  {
    name: 'relation extraction',
    url: '/pages/annotation/annotation-workspace.html?role=annotator&task_id=TASK-015-A4&run_type=official_run&task_type=relation_extraction&sample_id=RE-001',
    expectedTitle: '醫療關係抽取（Entity / Triple）',
  },
  {
    name: 'sentence pairs',
    url: '/pages/annotation/annotation-workspace.html?role=annotator&task_id=TASK-015-A5&run_type=dry_run&task_type=sentence_pairs&sample_id=A5-001',
    expectedTitle: '句對相似度 / 蘊含判定',
  },
];

for (const taskCase of ANNOTATOR_TASK_TITLE_CASES) {
  test(`annotator workspace uses task title for ${taskCase.name}`, async ({ page }) => {
    await page.goto(taskCase.url);

    const guidelineModalConfirm = page.locator('#guidelineModalConfirm');
    if (await guidelineModalConfirm.isVisible()) {
      await guidelineModalConfirm.click();
    }

    await expect(page.locator('#annotatorCard')).toBeVisible();
    await expect(page.locator('#annotationCardTitle')).toHaveText(taskCase.expectedTitle);
  });
}

test('annotator workspace sample list header keeps only annotation list label', async ({ page }) => {
  await page.goto('/pages/annotation/annotation-workspace.html?role=annotator&task_id=TASK-015-A1&run_type=official_run&task_type=single_sentence_classification&sample_id=A1-001');

  const guidelineModalConfirm = page.locator('#guidelineModalConfirm');
  if (await guidelineModalConfirm.isVisible()) {
    await guidelineModalConfirm.click();
  }

  await expect(page.locator('#sampleListTitle')).toHaveText('標記清單');
  await expect(page.locator('#sampleListTitle')).not.toContainText('正式標記清單');
});
