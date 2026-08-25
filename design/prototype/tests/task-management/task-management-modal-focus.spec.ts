/*
 * Traceability: specs/task-management/010-task-list/spec.md
 *   FR-010d
 */
import { test, expect } from '@playwright/test';

/* Issue #195 / F-11 (WCAG 2.1 AA 2.4.3), A11Y-02 follow-up to the A11Y-01
 * fix already shipped for annotation-workspace's guideline modals (see
 * annotation-guideline-modal-focus.spec.ts). This covers the two remaining
 * role="dialog" modals named in
 * docs/product/e2e/issue-180/phase3-drafts/w6-resilience-a11y.md#A11Y-02:
 * task-detail.html's #riskModal and task-list.html's #deleteTaskModal.
 * Same shared LabelSuiteModalFocus helper (pages/shared/modal-focus.js). */

test.describe('Risk confirm modal keyboard focus management (A11Y-02, #riskModal)', () => {
  async function openRiskModal(page: import('@playwright/test').Page) {
    await page.goto('/pages/task-management/task-detail.html?task_id=T001&status=draft');
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: 15000 });
    await page.locator('#samplingEditBtn').click();
    await page.locator('label[for="isolationToggle"]').click();
    await expect(page.locator('#isolationToggle')).not.toBeChecked();
    await page.locator('#samplingSaveBtn').click();
    await expect(page.locator('#samplingEditForm')).toHaveClass(/hidden/);
    await page.locator('#publishDryRunBtn').click();
    await expect(page.locator('#riskModal')).toHaveClass(/show/);
  }

  test('focus moves to the first interactive element when the modal opens', async ({ page }) => {
    await openRiskModal(page);
    await expect(page.locator('#riskCancelBtn')).toBeFocused();
  });

  test('Tab and Shift+Tab stay trapped inside the modal', async ({ page }) => {
    await openRiskModal(page);
    const cancelBtn = page.locator('#riskCancelBtn');
    await expect(cancelBtn).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#riskConfirmBtn')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(cancelBtn).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#riskConfirmBtn')).toBeFocused();
  });

  test('Escape closes the modal and returns focus to the triggering button', async ({ page }) => {
    await openRiskModal(page);

    await page.keyboard.press('Escape');

    await expect(page.locator('#riskModal')).not.toHaveClass(/show/);
    await expect(page.locator('#publishDryRunBtn')).toBeFocused();
  });

  test('cancelling the modal returns focus to the triggering button', async ({ page }) => {
    await openRiskModal(page);

    await page.locator('#riskCancelBtn').click();

    await expect(page.locator('#riskModal')).not.toHaveClass(/show/);
    await expect(page.locator('#publishDryRunBtn')).toBeFocused();
  });
});

test.describe('Delete task modal keyboard focus management (A11Y-02, #deleteTaskModal)', () => {
  async function openDeleteModal(page: import('@playwright/test').Page) {
    await page.goto('/pages/task-management/task-list.html?task_role=project_leader');
    const draftRow = page.locator('#taskTableBody tr[data-source-file="single-label.json"]');
    await draftRow.getByRole('button', { name: '刪除' }).click();
    await expect(page.locator('#deleteTaskModal')).toHaveClass(/show/);
  }

  test('focus moves to the first interactive element when the modal opens', async ({ page }) => {
    await openDeleteModal(page);
    await expect(page.locator('#deleteTaskCancelBtn')).toBeFocused();
  });

  test('Tab and Shift+Tab stay trapped inside the modal', async ({ page }) => {
    await openDeleteModal(page);
    const cancelBtn = page.locator('#deleteTaskCancelBtn');
    await expect(cancelBtn).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#deleteTaskConfirmBtn')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(cancelBtn).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#deleteTaskConfirmBtn')).toBeFocused();
  });

  test('Escape closes the modal and returns focus to the triggering delete button', async ({ page }) => {
    await openDeleteModal(page);
    const draftRow = page.locator('#taskTableBody tr[data-source-file="single-label.json"]');
    const trigger = draftRow.getByRole('button', { name: '刪除' });

    await page.keyboard.press('Escape');

    await expect(page.locator('#deleteTaskModal')).not.toHaveClass(/show/);
    await expect(trigger).toBeFocused();
  });

  test('cancelling the modal returns focus to the triggering delete button', async ({ page }) => {
    await openDeleteModal(page);
    const draftRow = page.locator('#taskTableBody tr[data-source-file="single-label.json"]');
    const trigger = draftRow.getByRole('button', { name: '刪除' });

    await page.locator('#deleteTaskCancelBtn').click();

    await expect(page.locator('#deleteTaskModal')).not.toHaveClass(/show/);
    await expect(trigger).toBeFocused();
  });
});
