/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-010s, FR-010s-1, FR-010s-2, FR-014e, SC-033
 *
 * Issue #596 retired the four-field "審核設定" block (min_reviewers /
 * review_assignment_mode / auto_finalize / arbitration toggle) in favor of a
 * two-checklist roster model (reviewer_ids / arbiter_ids). The field-level
 * contract now lives in issue-596-review-settings.spec.ts; this file keeps
 * only the still-live, roster-independent block behaviors that new contract
 * does not cover -- unsaved-changes guards on cancel/tab-switch, the
 * stale-arbiter cleanup on member disable, and the language toggle.
 */
import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

test.describe('Task detail review settings', () => {
  test('cancel with a dirty draft asks for confirmation and discards changes', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await page.locator('#reviewEditBtn').click();

    await page
      .locator('#reviewerOptionList .reviewer-option', { hasText: 'Kevin Liu' })
      .locator('input')
      .uncheck();

    page.on('dialog', (dialog) => dialog.accept());
    await page.locator('#reviewCancelBtn').click();

    await expect(page.locator('#reviewEditForm')).toHaveClass(/hidden/);
    await expect(page.locator('#valueReviewerIdsControl')).toHaveText('已勾選 3 人');
  });

  test('guards tab switches against unsaved review-setting changes', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
    await page.locator('#reviewEditBtn').click();
    await page
      .locator('#reviewerOptionList .reviewer-option', { hasText: 'Kevin Liu' })
      .locator('input')
      .uncheck();

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
    await expect(page.locator('#valueReviewerIdsControl')).toHaveText('已勾選 3 人');
  });

  test('drops arbiters that are no longer active reviewer members', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
    await page.locator('#reviewEditBtn').click();
    await page
      .locator('#arbiterOptionList .arbiter-option', { hasText: 'Mandy Chen' })
      .locator('input')
      .check();
    await page.locator('#reviewSaveBtn').click();
    await expect(page.locator('#valueArbiterIdsControl')).toHaveText('仲裁者 1 人');

    await page.locator('#tabMemberManagement').click();
    await page
      .locator('#memberTableBody tr')
      .filter({ hasText: 'Mandy Chen' })
      .locator('button:has-text("停用")')
      .click();
    await page.locator('#memberActionConfirmBtn').click();

    await page.locator('#tabOverview').click();
    await expect(page.locator('#valueArbiterIdsControl')).toHaveText('未指定仲裁者');
  });

  test('translates review settings labels and values to English', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);

    // Wait for the async panel render before toggling language (same
    // click-before-bind race guard as the sampling spec).
    await expect(page.locator('#valueReviewerIdsControl')).toHaveText('已勾選 3 人');

    await page.locator('#langToggle').click();

    await expect(page.locator('#reviewSettingsTitle')).toHaveText('Review Settings');
    await expect(page.locator('#labelReviewerIdsControl')).toHaveText('Reviewers');
    await expect(page.locator('#labelArbiterIdsControl')).toHaveText('Arbiters');
    await expect(page.locator('#valueReviewerIdsControl')).toHaveText('3 selected');
    await expect(page.locator('#valueArbiterIdsControl')).toHaveText('No arbiter designated');
  });
});
