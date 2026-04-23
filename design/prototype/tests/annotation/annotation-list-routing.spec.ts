import { test, expect } from '@playwright/test';

test.describe('Annotation list routing', () => {
  test('annotation list uses task-list style toolbar and table shell', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-list.html?role=annotator&task_id=TASK-015-A1&run_type=official_run&task_type=single_sentence_classification');
    await expect(page.getByTestId('annotation-list-shell')).toBeVisible();

    await expect(page.getByRole('heading', { name: '任務資料清單' })).toHaveCount(0);
    await expect(page.locator('.toolbar[role="search"]')).toBeVisible();
    await expect(page.locator('#statusFilter')).toBeVisible();
    await expect(page.locator('#searchInput')).toBeVisible();
    await expect(page.locator('.task-table')).toBeVisible();
  });

  test('status filter can filter rows by completion status', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-list.html?role=annotator&task_id=TASK-015-A1&run_type=official_run&task_type=single_sentence_classification');
    await expect(page.getByTestId('annotation-list-shell')).toBeVisible();

    await expect(page.locator('#sampleRows tr')).toHaveCount(3);
    await page.locator('#statusFilter').selectOption('submitted');
    await expect(page.locator('#sampleRows tr')).toHaveCount(1);
    await expect(page.locator('#sampleRows tr').first()).toContainText('A1-001');
  });

  test('A2 task shows five samples with full text content in list', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-list.html?role=annotator&task_id=TASK-015-A2&run_type=dry_run&task_type=single_sentence_va_scoring');
    await expect(page.getByTestId('annotation-list-shell')).toBeVisible();

    await expect(page.locator('#sampleRows tr')).toHaveCount(5);
    await expect(page.locator('#sampleRows tr').nth(0)).toContainText('整體服務態度很好，店員非常有耐心地解釋，讓我感受到被重視。');
    await expect(page.locator('#sampleRows tr').nth(4)).toContainText('產品說明書寫得非常詳盡，安裝過程完全按照步驟就順利完成，沒遇到任何問題。');
  });

  test('reviewer sees five samples for TASK-015-A2', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-list.html?role=reviewer&task_id=TASK-015-A2&run_type=dry_run&task_type=single_sentence_va_scoring');
    await expect(page.getByTestId('annotation-list-shell')).toBeVisible();

    await expect(page.locator('#sampleRows tr')).toHaveCount(5);
    await expect(page.locator('#sampleRows tr').first()).toContainText('R2-001');
    await expect(page.locator('#sampleRows tr').nth(4)).toContainText('R2-005');
  });

  test('reviewer quick review param TASK-015-R2 shows five samples', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-list.html?role=reviewer&task_id=TASK-015-R2&run_type=dry_run&task_type=single_sentence_va_scoring');
    await expect(page.getByTestId('annotation-list-shell')).toBeVisible();
    await expect(page.locator('#sampleRows tr')).toHaveCount(5);
  });

  test('annotator can open sample workspace by clicking a table row', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-list.html?role=annotator&task_id=TASK-015-A1&run_type=official_run&task_type=single_sentence_classification');
    await expect(page.getByTestId('annotation-list-shell')).toBeVisible();

    const firstRow = page.locator('#sampleRows tr').first();
    await firstRow.click();

    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-workspace\.html\?/);
    await expect(page).toHaveURL(/role=annotator/);
    await expect(page).toHaveURL(/task_id=TASK-015-A1/);
    await expect(page).toHaveURL(/sample_id=/);
  });

  test('annotator lands on list and can open sample workspace', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-list.html?role=annotator&task_id=TASK-015-A1&run_type=official_run&task_type=single_sentence_classification');
    await expect(page.getByTestId('annotation-list-shell')).toBeVisible();
    await expect(page.getByRole('heading', { name: '標記清單' })).toBeVisible();

    const firstOpenButton = page.getByRole('button', { name: '進入作業頁' }).first();
    await firstOpenButton.click();

    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-workspace\.html\?/);
    await expect(page).toHaveURL(/role=annotator/);
    await expect(page).toHaveURL(/task_id=TASK-015-A1/);
    await expect(page).toHaveURL(/sample_id=/);
  });

  test('reviewer lands on list and can open sample workspace', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-list.html?role=reviewer&task_id=TASK-015-R1&run_type=official_run&task_type=single_sentence_classification');
    await expect(page.getByTestId('annotation-list-shell')).toBeVisible();
    await expect(page.getByRole('heading', { name: '標記清單' })).toBeVisible();

    const firstOpenButton = page.getByRole('button', { name: '進入作業頁' }).first();
    await firstOpenButton.click();

    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-workspace\.html\?/);
    await expect(page).toHaveURL(/role=reviewer/);
    await expect(page).toHaveURL(/task_id=TASK-015-R1/);
    await expect(page).toHaveURL(/sample_id=/);
  });

  test('reviewer can open sample workspace by clicking a table row', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-list.html?role=reviewer&task_id=TASK-015-R1&run_type=official_run&task_type=single_sentence_classification');
    await expect(page.getByTestId('annotation-list-shell')).toBeVisible();

    const firstRow = page.locator('#sampleRows tr').first();
    await firstRow.click();

    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-workspace\.html\?/);
    await expect(page).toHaveURL(/role=reviewer/);
    await expect(page).toHaveURL(/task_id=TASK-015-R1/);
    await expect(page).toHaveURL(/sample_id=/);
  });
});
