/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-014a, FR-014g, FR-014h, FR-014j
 * Issue #1130: read-only summary rows (basic section) are display-only, so their labels must not
 *   carry the required `*` marker; only the edit form labels do.
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { openSettingsSection } from './_task-detail-settings-helpers';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html?task_role=project_leader&task_id=T001';

const READONLY_LABEL_IDS = ['#labelTaskName', '#labelTaskType', '#labelDatasetSummary'];

async function expectNoRequiredMark(page: Page) {
  for (const id of READONLY_LABEL_IDS) {
    const label = page.locator(id);
    await expect(label).toBeVisible();
    await expect(label.locator('.required')).toHaveCount(0);
    expect(await label.innerText()).not.toContain('*');
  }
}

test.describe('Task detail overview edit state', () => {
  for (const lang of ['zh-TW', 'en'] as const) {
    test(`read-only summary labels show no required mark (${lang}, #1130)`, async ({ page }) => {
      if (lang === 'en') {
        await page.addInitScript(() => window.localStorage.setItem('labelsuite.lang', 'en'));
      }
      await page.goto(`${TASK_DETAIL_URL}&tab=settings&section=basic`);
      await openSettingsSection(page, 'basic');
      await expect(page.locator('#basicInfoView')).not.toHaveClass(/hidden/);
      await expectNoRequiredMark(page);
    });
  }

  test('hides draft-only hint text and uses simplified edit mode layout', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);

    await openSettingsSection(page, 'basic');
    const editBtn = page.locator('#overviewEditBtn');
    const saveBtn = page.locator('#overviewSaveBtn');
    const cancelBtn = page.locator('#overviewCancelBtn');

    await expect(editBtn).toBeEnabled();
    await expect(saveBtn).toHaveText('儲存');
    await expect(page.locator('#settingsPanel')).not.toContainText('僅 draft 狀態可編輯');
    await expectNoRequiredMark(page);

    await editBtn.click();

    await expect(page.locator('#basicInfoView')).toHaveClass(/hidden/);
    await expect(page.locator('#overviewEditForm')).not.toHaveClass(/hidden/);
    await expect(page.locator('#overviewReadonlyHint')).toHaveText('');
    await expect(page.locator('#editTaskNameLabel .required')).toHaveText('*');
    await expect(page.locator('#editTaskTypeLabel .required')).toHaveText('*');
    await expect(page.locator('#editDatasetLabel .required')).toHaveText('*');
    await expect(page.locator('#datasetFileList .upload-file-preview')).toHaveCount(1);
    await expect(page.locator('#datasetFileList .upload-file-name')).toContainText('single-label.json');

    const cancelBox = await cancelBtn.boundingBox();
    const saveBox = await saveBtn.boundingBox();
    expect(cancelBox).not.toBeNull();
    expect(saveBox).not.toBeNull();
    expect((cancelBox as { x: number }).x).toBeLessThan((saveBox as { x: number }).x);
  });
});
