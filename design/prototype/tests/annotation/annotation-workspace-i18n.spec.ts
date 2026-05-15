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

  test('reviewer panel localizes aggregate stats and annotator results in English mode across task types', async ({ page }) => {
    const cases: Array<{
      url: string;
      expectedStats: string;
      expectedResult: string;
      forbidden: string[];
      expectedCorrectionValues?: string[];
    }> = [
      {
        url: '/pages/annotation/annotation-workspace.html?role=reviewer&task_id=TASK-015-R1&run_type=official_run&task_type=single_sentence_classification&sample_id=R1-001',
        expectedStats: 'Politics×4 · Technology×5',
        expectedResult: 'Politics, Technology',
        forbidden: ['政治', '科技'],
      },
      {
        url: '/pages/annotation/annotation-workspace.html?role=reviewer&task_id=TASK-015-R2&run_type=dry_run&task_type=single_sentence_va_scoring&sample_id=R2-001',
        expectedStats: 'mean : [7.33, 7.17]',
        expectedResult: '[6, 5.5]',
        forbidden: [],
      },
      {
        url: '/pages/annotation/annotation-workspace.html?role=reviewer&task_id=TASK-015-R3&run_type=official_run&task_type=sequence_labeling&sub_type=aspect_list&sample_id=AL-001',
        expectedStats: 'Aspect List task - review each annotator extraction',
        expectedResult: 'screen',
        forbidden: ['螢幕', '電池續航力', '請查看'],
        expectedCorrectionValues: ['screen', 'battery life', 'price'],
      },
      {
        url: '/pages/annotation/annotation-workspace.html?role=reviewer&task_id=TASK-015-R5&run_type=dry_run&task_type=sentence_pairs&sample_id=R5-001',
        expectedStats: 'Equivalent×3 · Related×2',
        expectedResult: 'Equivalent',
        forbidden: ['等價', '相關'],
      },
      {
        url: '/pages/annotation/annotation-workspace.html?role=reviewer&task_id=TASK-015-R6&run_type=official_run&task_type=sequence_labeling&sub_type=ner&sample_id=NER-001',
        expectedStats: 'F1 mean: 0.81 · Macro-F1: 0.79 · 3 annotators',
        expectedResult: 'TSMC',
        forbidden: ['台積電', '張忠謀'],
      },
      {
        url: '/pages/annotation/annotation-workspace.html?role=reviewer&task_id=TASK-015-R4&run_type=official_run&task_type=relation_extraction&sample_id=RE-001',
        expectedStats: 'Relation extraction task - review each annotator triple',
        expectedResult: '(DRUG:Aspirin)→treats→(SYMP:headache)',
        forbidden: ['阿司匹靈', '頭痛', '請查看'],
      },
    ];

    for (const item of cases) {
      await page.goto(item.url);
      await ensureEnglishMode(page);
      await expect(page.locator('#reviewerCard')).toBeVisible();
      await expect(page.locator('#rvStatsSummary')).toContainText(item.expectedStats);
      const firstReviewerRow = page.locator('#rvAnnotatorRows .rv-annotator-review-row').first();
      await expect(firstReviewerRow).toContainText(item.expectedResult);
      if (item.expectedCorrectionValues) {
        await expect(firstReviewerRow.locator('.rv-aspect-correction-input')).toHaveCount(item.expectedCorrectionValues.length);
        const correctionValues = await firstReviewerRow.locator('.rv-aspect-correction-input').evaluateAll((inputs) =>
          inputs.map((input) => (input as HTMLInputElement).value)
        );
        expect(correctionValues).toEqual(item.expectedCorrectionValues);
      }
      for (const forbiddenText of item.forbidden) {
        await expect(page.locator('#rvStatsSummary')).not.toContainText(forbiddenText);
        await expect(firstReviewerRow).not.toContainText(forbiddenText);
      }
    }
  });
});
