import { test, expect } from '@playwright/test';

test.describe('Run materialization cues', () => {
  test('draft task rows show that no annotation list has been created yet', async ({ page }) => {
    await page.goto('/pages/task-management/task-list.html?task_role=project_leader');

    const row = page.locator('tbody tr').filter({ hasText: '新聞標題多標籤分類' }).first();
    await expect(row).toContainText('草稿');
    await expect(row).toContainText('未建立清單');
    await expect(row).not.toContainText('正式標記');
  });

  test('annotation list exposes the materialized dry-run round context', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-list.html?role=annotator&task_id=TASK-015-A2&run_type=dry_run&task_type=single_sentence_va_scoring');

    await expect(page.locator('#taskInfoCard')).toContainText('試標回合 R2');
    await expect(page.locator('#taskInfoCard')).toContainText('本回合清單 10 筆');
    await expect(page.locator('#sampleRows tr')).toHaveCount(5);
  });

  test('workspace sample list keeps the same dry-run round context', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-workspace.html?role=annotator&task_id=TASK-015-A2&run_type=dry_run&task_type=single_sentence_va_scoring&sample_id=A2-001');

    await expect(page.locator('#sampleListTitle')).toHaveText('標記清單 · 試標回合 R2');
    await expect(page.locator('#sampleListCount')).toHaveText('10 筆');
    await expect(page.locator('#sampleList .sample-item')).toHaveCount(5);
  });
});
