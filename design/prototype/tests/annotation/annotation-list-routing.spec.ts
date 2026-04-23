import { test, expect } from '@playwright/test';

test.describe('Annotation list routing', () => {
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
