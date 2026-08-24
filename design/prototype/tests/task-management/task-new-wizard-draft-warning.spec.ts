import { test, expect } from '@playwright/test';

const TASK_NEW_URL = '/pages/task-management/task-new.html';

/**
 * Issue #197: task-new wizard must warn before an accidental refresh/leave
 * discards unsaved progress, and must recover the in-progress draft after
 * a same-tab reload.
 */
test.describe('Task-new wizard leave/draft protection', () => {
  test('shows a beforeunload warning once the wizard has unsaved changes', async ({ page }) => {
    await page.goto(TASK_NEW_URL);
    await page.fill('#taskNameInput', 'Draft task name');

    const dialogPromise = page.waitForEvent('dialog');
    // Dismissing the beforeunload prompt cancels the reload, so it never
    // resolves; fire-and-forget and rely on the dialog event instead.
    page.reload({ timeout: 3000 }).catch(() => {});
    const dialog = await dialogPromise;

    expect(dialog.type()).toBe('beforeunload');
    await dialog.dismiss();
  });

  test('does not show a beforeunload warning when the wizard is untouched', async ({ page }) => {
    await page.goto(TASK_NEW_URL);

    let dialogFired = false;
    page.once('dialog', async (dialog) => {
      dialogFired = true;
      await dialog.dismiss();
    });

    await page.reload();

    expect(dialogFired).toBe(false);
  });

  test('restores the draft task name after an accepted reload', async ({ page }) => {
    await page.goto(TASK_NEW_URL);

    page.on('dialog', (dialog) => dialog.accept());

    await page.fill('#taskNameInput', 'Draft task name');
    await page.reload();

    await expect(page.locator('#taskNameInput')).toHaveValue('Draft task name');
  });
});
