import { test, expect } from '@playwright/test';

test.describe('Annotation list routing', () => {
  test('shows task info card above filters for selected task', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-list.html?role=annotator&task_id=TASK-015-A2&run_type=dry_run&task_type=single_sentence_va_scoring');
    await expect(page.getByTestId('annotation-list-shell')).toBeVisible();

    const taskInfoCard = page.locator('#taskInfoCard');
    const toolbar = page.locator('.toolbar[role="search"]');
    await expect(taskInfoCard).toBeVisible();
    await expect(taskInfoCard).toContainText('情感 VA 雙維度評分');
    await expect(taskInfoCard).toContainText('單句 VA 評分');
    await expect(taskInfoCard).toContainText('試標');
    await expect(taskInfoCard.getByRole('button', { name: '快速繼續' })).toBeVisible();

    const taskInfoBox = await taskInfoCard.boundingBox();
    const toolbarBox = await toolbar.boundingBox();
    expect(taskInfoBox).not.toBeNull();
    expect(toolbarBox).not.toBeNull();
    expect(taskInfoBox!.y).toBeLessThan(toolbarBox!.y);
  });

  test('task info card quick continue opens latest unfinished sample in workspace', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-list.html?role=annotator&task_id=TASK-015-A2&run_type=dry_run&task_type=single_sentence_va_scoring');
    await expect(page.getByTestId('annotation-list-shell')).toBeVisible();

    await page.getByRole('button', { name: '快速繼續' }).click();
    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-workspace\.html\?/);
    await expect(page).toHaveURL(/role=annotator/);
    await expect(page).toHaveURL(/task_id=TASK-015-A2/);
    await expect(page).toHaveURL(/sample_id=A2-005/);
    await expect(page).toHaveURL(/run_type=dry_run/);
  });

  test('task info card quick continue uses pointer cursor', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-list.html?role=annotator&task_id=TASK-015-A2&run_type=dry_run&task_type=single_sentence_va_scoring');
    await expect(page.getByTestId('annotation-list-shell')).toBeVisible();
    await expect(page.getByRole('button', { name: '快速繼續' })).toHaveCSS('cursor', 'pointer');
  });

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

    const firstOpenButton = page.getByRole('button', { name: '編輯' }).first();
    await firstOpenButton.click();

    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-workspace\.html\?/);
    await expect(page).toHaveURL(/role=annotator/);
    await expect(page).toHaveURL(/task_id=TASK-015-A1/);
    await expect(page).toHaveURL(/sample_id=/);
  });

  test('editing first sample opens workspace focused on that sample', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-list.html?role=annotator&task_id=TASK-015-A2&run_type=dry_run&task_type=single_sentence_va_scoring');
    await expect(page.getByTestId('annotation-list-shell')).toBeVisible();

    await page.getByRole('button', { name: '編輯' }).first().click();
    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-workspace\.html\?/);
    await expect(page).toHaveURL(/sample_id=A2-001/);

    const guidelineModalConfirm = page.locator('#guidelineModalConfirm');
    if (await guidelineModalConfirm.isVisible()) {
      await guidelineModalConfirm.click();
    }

    const firstSample = page.locator('#sampleList .sample-item').first();
    await expect(firstSample).toHaveClass(/active/);
    await expect(firstSample).toContainText('整體服務態度很好，店員非常有耐心地解釋，讓我感受到被重視。');
    await expect(page.locator('#sampleText')).toContainText('整體服務態度很好，店員非常有耐心地解釋，讓我感受到被重視。');
  });

  test('sample open button uses pointer cursor', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-list.html?role=annotator&task_id=TASK-015-A1&run_type=official_run&task_type=single_sentence_classification');
    await expect(page.getByTestId('annotation-list-shell')).toBeVisible();
    await expect(page.getByRole('button', { name: '編輯' }).first()).toHaveCSS('cursor', 'pointer');
  });

  test('reviewer lands on list and can open sample workspace', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-list.html?role=reviewer&task_id=TASK-015-R1&run_type=official_run&task_type=single_sentence_classification');
    await expect(page.getByTestId('annotation-list-shell')).toBeVisible();
    await expect(page.getByRole('heading', { name: '標記清單' })).toBeVisible();

    const firstOpenButton = page.getByRole('button', { name: '編輯' }).first();
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

  test('annotator is redirected to list after final submit and all rows become submitted', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-list.html?role=annotator&task_id=TASK-015-A2&run_type=dry_run&task_type=single_sentence_va_scoring');
    await expect(page.getByTestId('annotation-list-shell')).toBeVisible();

    await page.locator('#sampleRows tr', { hasText: 'A2-003' }).first().click();
    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-workspace\.html\?/);

    const guidelineModalConfirm = page.locator('#guidelineModalConfirm');
    if (await guidelineModalConfirm.isVisible()) {
      await guidelineModalConfirm.click();
    }

    await page.locator('#submitBtn').click();
    await page.waitForTimeout(500);
    await page.locator('#submitBtn').click();
    await page.waitForTimeout(500);
    await page.locator('#submitBtn').click();

    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-list\.html\?/);
    await expect(page).toHaveURL(/task_id=TASK-015-A2/);

    const statusBadges = page.locator('#sampleRows tr td:nth-child(2) .status-badge');
    await expect(statusBadges).toHaveCount(5);
    await expect(statusBadges).toHaveText(['已提交', '已提交', '已提交', '已提交', '已提交']);
  });

  test('mobile list keeps first row compact without excessive vertical gap', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/pages/annotation/annotation-list.html?role=annotator&task_id=TASK-015-A2&run_type=dry_run&task_type=single_sentence_va_scoring');
    await expect(page.getByTestId('annotation-list-shell')).toBeVisible();

    const firstRow = page.locator('#sampleRows tr').first();
    await expect(firstRow).toBeVisible();

    const metrics = await page.evaluate(() => {
      const firstRowEl = document.querySelector('#sampleRows tr') as HTMLTableRowElement | null;
      if (!firstRowEl) return null;
      const firstCell = firstRowEl.querySelector('td');
      const firstCellTop = firstCell ? firstCell.getBoundingClientRect().top : 0;
      const rowRect = firstRowEl.getBoundingClientRect();
      return {
        rowHeight: rowRect.height,
        rowTopGap: firstCellTop - rowRect.top,
      };
    });

    expect(metrics).not.toBeNull();
    expect(metrics!.rowHeight).toBeLessThan(160);
    expect(metrics!.rowTopGap).toBeLessThan(24);
  });

  test('mobile top brand row stays uncompressed and does not overlap page header', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/pages/annotation/annotation-list.html?role=annotator&task_id=TASK-015-A2&run_type=dry_run&task_type=single_sentence_va_scoring');
    await expect(page.getByTestId('annotation-list-shell')).toBeVisible();

    const metrics = await page.evaluate(() => {
      const brand = document.querySelector('.brand-section') as HTMLElement | null;
      const pageTitle = document.getElementById('pageTitle');
      if (!brand || !pageTitle) return null;

      const brandRect = brand.getBoundingClientRect();
      const titleRect = pageTitle.getBoundingClientRect();
      return {
        brandClientWidth: brand.clientWidth,
        brandScrollWidth: brand.scrollWidth,
        brandBottom: brandRect.bottom,
        titleTop: titleRect.top,
      };
    });

    expect(metrics).not.toBeNull();
    expect(metrics!.brandScrollWidth).toBeLessThanOrEqual(metrics!.brandClientWidth + 1);
    expect(metrics!.titleTop).toBeGreaterThanOrEqual(metrics!.brandBottom + 4);
  });
});
