import { test, expect } from '@playwright/test';

async function dismissGuidelineModal(page: import('@playwright/test').Page) {
  const confirmBtn = page.locator('#guidelineModalConfirm');
  if (await confirmBtn.isVisible()) {
    await confirmBtn.click();
  }
}

test('desktop aspect-list reviewer layout keeps correction editor and decisions visible before and after collapsing guideline', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 960 });
  await page.goto('/pages/annotation/annotation-workspace.html?role=reviewer&task_id=TASK-015-R3&run_type=official_run&task_type=sequence_labeling&sub_type=aspect_list&sample_id=AL-001');

  await dismissGuidelineModal(page);

  const firstReviewRow = page.locator('#rvAnnotatorRows .rv-annotator-review-row').first();
  const correctionEditor = firstReviewRow.locator('.rv-aspect-correction-editor');
  const choiceGroup = firstReviewRow.locator('.rv-choice-group');

  await expect(firstReviewRow).toBeVisible();
  await expect(correctionEditor).toBeVisible();
  await expect(choiceGroup).toBeVisible();

  const expandedMetrics = await page.evaluate(() => {
    const row = document.querySelector('#rvAnnotatorRows .rv-annotator-review-row') as HTMLElement | null;
    const editor = row?.querySelector('.rv-aspect-correction-editor') as HTMLElement | null;
    const actions = row?.querySelector('.rv-choice-group') as HTMLElement | null;
    if (!row || !editor || !actions) return null;

    const rowRect = row.getBoundingClientRect();
    const editorRect = editor.getBoundingClientRect();
    const actionsRect = actions.getBoundingClientRect();

    return {
      rowRight: rowRect.right,
      editorRight: editorRect.right,
      actionsLeft: actionsRect.left,
      actionsRight: actionsRect.right,
      actionsTop: actionsRect.top,
      editorBottom: editorRect.bottom,
    };
  });

  expect(expandedMetrics).not.toBeNull();
  expect(expandedMetrics!.editorRight).toBeLessThanOrEqual(expandedMetrics!.rowRight);
  expect(expandedMetrics!.actionsRight).toBeLessThanOrEqual(expandedMetrics!.rowRight);
  expect(expandedMetrics!.actionsTop).toBeGreaterThanOrEqual(expandedMetrics!.editorBottom - 1);

  await page.locator('#guidelineCollapseBtn').click();
  await expect(page.locator('#workspaceBody')).toHaveClass(/guideline-collapsed/);

  const collapsedMetrics = await page.evaluate(() => {
    const row = document.querySelector('#rvAnnotatorRows .rv-annotator-review-row') as HTMLElement | null;
    const actions = row?.querySelector('.rv-choice-group') as HTMLElement | null;
    const editor = row?.querySelector('.rv-aspect-correction-editor') as HTMLElement | null;
    if (!row || !editor || !actions) return null;

    const rowRect = row.getBoundingClientRect();
    const editorRect = editor.getBoundingClientRect();
    const actionsRect = actions.getBoundingClientRect();

    return {
      rowRight: rowRect.right,
      editorRight: editorRect.right,
      actionsRight: actionsRect.right,
      actionsTop: actionsRect.top,
      editorBottom: editorRect.bottom,
      rowBottom: rowRect.bottom,
    };
  });

  expect(collapsedMetrics).not.toBeNull();
  expect(collapsedMetrics!.editorRight).toBeLessThanOrEqual(collapsedMetrics!.rowRight);
  expect(collapsedMetrics!.actionsRight).toBeLessThanOrEqual(collapsedMetrics!.rowRight);
  expect(collapsedMetrics!.actionsTop).toBeGreaterThanOrEqual(collapsedMetrics!.editorBottom - 1);
});
