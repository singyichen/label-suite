import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, skipGuidelineModal } from './_workspace-helpers';

/* free_text annotator interaction (spec 015 v2.0.0). T009: max_length=256,
 * `reference` mapped as evidence (rendersEvidencePreview) shown before the
 * input content, `gold_answer` mapped as output (visible prefill). */

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('free_text output type', () => {
  test('evidence card renders before the input content and the answer control', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T009', sample_id: 'sum-001' }));
    await dismissGuidelineModal(page);

    const evidenceCard = page.getByTestId('ws-evidence-card');
    const inputContent = page.getByTestId('ws-input-content');
    const answerPanel = page.getByTestId('ws-output-panel-free_text');

    await expect(evidenceCard).toBeVisible();
    await expect(evidenceCard).toContainText('癌症希望基金會在台北成立癌友專屬心理諮商所');

    const [evidenceBox, inputBox, answerBox] = await Promise.all([
      evidenceCard.boundingBox(),
      inputContent.boundingBox(),
      answerPanel.boundingBox(),
    ]);
    expect(evidenceBox!.y).toBeLessThan(inputBox!.y);
    expect(inputBox!.y).toBeLessThan(answerBox!.y);
  });

  test('typing updates the character counter and respects max_length', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T009', sample_id: 'sum-001' }));
    await dismissGuidelineModal(page);

    const textarea = page.getByTestId('ws-free-text-input');
    await textarea.fill('測試摘要內容');
    await expect(page.getByTestId('ws-free-text-counter')).toContainText('6/256');
  });

  test('answer survives switching away to another sample and back', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T009', sample_id: 'sum-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-free-text-input').fill('測試摘要內容');
    await page.getByTestId('ws-sample-item').nth(1).click();
    // sum-002 has its own gold_answer prefill (013 FR-003g-5) -- switching to
    // it is expected to show ITS OWN preannotation, not a blank textarea.
    await expect(page.getByTestId('ws-free-text-input')).toHaveValue(
      '糖尿病治療以飲食與運動為基礎，藥物首選 Metformin，若不耐受可改用 SGLT-2 抑制劑或 GLP-1 促效劑。'
    );

    await page.getByTestId('ws-sample-item').nth(0).click();
    await expect(page.getByTestId('ws-free-text-input')).toHaveValue('測試摘要內容');
  });
});
