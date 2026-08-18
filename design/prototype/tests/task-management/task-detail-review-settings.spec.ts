import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

test.describe('Task detail review settings', () => {
  test('shows review settings section with seeded summary and view/edit visibility flips', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);

    await expect(page.locator('#reviewSettingsTitle')).toHaveText('審核設定');

    const editBtn = page.locator('#reviewEditBtn');
    const saveBtn = page.locator('#reviewSaveBtn');
    const cancelBtn = page.locator('#reviewCancelBtn');

    await expect(editBtn).toBeVisible();
    await expect(editBtn).toBeEnabled();
    await expect(saveBtn).toBeHidden();
    await expect(cancelBtn).toBeHidden();
    await expect(page.locator('#reviewSummaryView')).toBeVisible();
    await expect(page.locator('#reviewEditForm')).toHaveClass(/hidden/);

    await expect(page.locator('#labelMinReviewersControl')).toHaveText('每筆資料審核員數');
    await expect(page.locator('#valueMinReviewersControl')).toHaveText('1');
    await expect(page.locator('#labelReviewAssignmentControl')).toHaveText('審核指派方式');
    await expect(page.locator('#valueReviewAssignmentControl')).toHaveText('自動輪派');
    await expect(page.locator('#labelAutoFinalizeControl')).toHaveText('一致即定案');
    await expect(page.locator('#valueAutoFinalizeControl')).toHaveText('啟用');
    await expect(page.locator('#labelArbitrationControl')).toHaveText('第三人仲裁');
    await expect(page.locator('#valueArbitrationControl')).toHaveText('啟用 · 未指定仲裁者');

    await editBtn.click();

    await expect(editBtn).toBeHidden();
    await expect(saveBtn).toBeVisible();
    await expect(cancelBtn).toBeVisible();
    await expect(page.locator('#reviewSummaryView')).toHaveClass(/hidden/);
    await expect(page.locator('#reviewEditForm')).not.toHaveClass(/hidden/);
  });

  test('edit form exposes min-reviewers input, assignment radios, toggles, and arbiter options', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await page.locator('#reviewEditBtn').click();

    await expect(page.locator('#minReviewersInput')).toBeEnabled();
    await expect(page.locator('#minReviewersInput')).toHaveValue('1');
    await expect(page.locator('#assignmentModeAuto')).toBeChecked();
    await expect(page.locator('#assignmentModeManual')).not.toBeChecked();
    await expect(page.locator('#autoFinalizeToggle')).toBeChecked();
    await expect(page.locator('#arbitrationToggle')).toBeChecked();

    // The seed carries three active reviewer members (Mandy first); arbiter_ids
    // is empty, so the options render unchecked.
    const arbiterOptions = page.locator('#arbiterOptions .arbiter-option');
    await expect(page.locator('#arbiterOptions')).toBeVisible();
    await expect(arbiterOptions).toHaveCount(3);
    await expect(arbiterOptions.first()).toContainText('Mandy Chen');
    await expect(arbiterOptions.first().locator('input')).not.toBeChecked();

    // Disabling arbitration retires the arbiter picker entirely. The real
    // checkbox is visually hidden inside the toggle-switch, so click its
    // label wrapper instead of uncheck().
    await page.locator('label[for="arbitrationToggle"]').click();
    await expect(page.locator('#arbitrationToggle')).not.toBeChecked();
    await expect(page.locator('#arbiterOptions')).toBeHidden();
  });

  test('rejects a non-positive reviewer count with an inline error', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await page.locator('#reviewEditBtn').click();

    await page.locator('#minReviewersInput').fill('0');
    await page.locator('#reviewSaveBtn').click();

    await expect(page.locator('#reviewSettingsError')).toHaveText('每筆資料審核員數需為 ≥ 1 的整數。');
    await expect(page.locator('#reviewSettingsError')).toHaveClass(/show/);
    await expect(page.locator('#reviewEditForm')).not.toHaveClass(/hidden/);
    await expect(page.locator('#reviewSaveBtn')).toBeVisible();
  });

  test('persists updated review settings on save', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await page.locator('#reviewEditBtn').click();

    await page.locator('#minReviewersInput').fill('3');
    await page.locator('#assignmentModeManual').check();
    await page.locator('#arbiterOptions .arbiter-option input').first().check();
    await page.locator('#reviewSaveBtn').click();

    await expect(page.locator('#reviewEditForm')).toHaveClass(/hidden/);
    await expect(page.locator('#reviewSummaryView')).toBeVisible();
    await expect(page.locator('#valueMinReviewersControl')).toHaveText('3');
    await expect(page.locator('#valueReviewAssignmentControl')).toHaveText('手動指派');
    await expect(page.locator('#valueArbitrationControl')).toHaveText('啟用 · 仲裁者 1 人');
  });

  test('shows disabled arbitration state after saving with the toggle off', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await page.locator('#reviewEditBtn').click();

    await page.locator('label[for="autoFinalizeToggle"]').click();
    await page.locator('label[for="arbitrationToggle"]').click();
    await expect(page.locator('#autoFinalizeToggle')).not.toBeChecked();
    await expect(page.locator('#arbitrationToggle')).not.toBeChecked();
    await page.locator('#reviewSaveBtn').click();

    await expect(page.locator('#valueAutoFinalizeControl')).toHaveText('停用');
    await expect(page.locator('#valueArbitrationControl')).toHaveText('停用');
  });

  test('cancel with a dirty draft asks for confirmation and discards changes', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await page.locator('#reviewEditBtn').click();

    await page.locator('#minReviewersInput').fill('5');

    page.on('dialog', (dialog) => dialog.accept());
    await page.locator('#reviewCancelBtn').click();

    await expect(page.locator('#reviewEditForm')).toHaveClass(/hidden/);
    await expect(page.locator('#valueMinReviewersControl')).toHaveText('1');
  });

  test('guards tab switches against unsaved review-setting changes', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: 15000 });
    await page.locator('#reviewEditBtn').click();
    await page.locator('#minReviewersInput').fill('5');

    let dialogSeen = false;
    page.on('dialog', (dialog) => {
      dialogSeen = true;
      void dialog.accept();
    });
    await page.locator('#tabMemberManagement').click();
    await expect(page.locator('#memberManagementPanel')).not.toHaveClass(/hidden/);
    expect(dialogSeen).toBe(true);

    // Accepting the leave confirmation discards the draft, so returning to
    // the overview shows the summary view again (not a stale edit form).
    await page.locator('#tabOverview').click();
    await expect(page.locator('#reviewEditForm')).toHaveClass(/hidden/);
    await expect(page.locator('#valueMinReviewersControl')).toHaveText('1');
  });

  test('drops arbiters that are no longer active reviewer members', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: 15000 });
    await page.locator('#reviewEditBtn').click();
    await page.locator('#arbiterOptions .arbiter-option input').first().check();
    await page.locator('#reviewSaveBtn').click();
    await expect(page.locator('#valueArbitrationControl')).toHaveText('啟用 · 仲裁者 1 人');

    await page.locator('#tabMemberManagement').click();
    await page
      .locator('#memberTableBody tr')
      .filter({ hasText: 'Mandy Chen' })
      .locator('button:has-text("停用")')
      .click();
    await page.locator('#memberActionConfirmBtn').click();

    await page.locator('#tabOverview').click();
    await expect(page.locator('#valueArbitrationControl')).toHaveText('啟用 · 未指定仲裁者');
  });

  test('translates review settings labels and values to English', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);

    // Wait for the async panel render before toggling language (same
    // click-before-bind race guard as the sampling spec).
    await expect(page.locator('#valueMinReviewersControl')).toHaveText('1');

    await page.locator('#langToggle').click();

    await expect(page.locator('#reviewSettingsTitle')).toHaveText('Review Settings');
    await expect(page.locator('#labelMinReviewersControl')).toHaveText('Reviewers per item');
    await expect(page.locator('#valueReviewAssignmentControl')).toHaveText('Auto rotation');
    await expect(page.locator('#valueArbitrationControl')).toHaveText('Enabled · no arbiter designated');
  });
});
