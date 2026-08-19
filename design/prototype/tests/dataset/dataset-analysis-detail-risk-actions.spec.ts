import { test, expect } from '@playwright/test';

/* Issue #153: the risk-table action buttons (審核標記 / 調整參與狀態) were
 * rendered across every quality-*.html partial with no click handler, so the
 * Project Leader's main entry from quality analysis into review was dead.
 *
 * T104 (relation_identification, membershipRole: project_leader) ships a
 * high-risk row carrying both buttons. T106 (entity_recognition,
 * membershipRole: reviewer) keeps them disabled per FR-029. */

const DETAIL_URL = '/pages/dataset/dataset-analysis-detail.html';

test.describe('Risk table action buttons (issue #153)', () => {
  test('審核標記 navigates to the reviewer annotation list for the analyzed dry run', async ({ page }) => {
    await page.goto(`${DETAIL_URL}?task_id=T104&tab=quality`);
    const reviewBtn = page.locator('.risk-action-btn[data-i18n="qualityRisk.actionReview"]').first();
    await expect(reviewBtn).toBeEnabled();
    await reviewBtn.click();
    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-list\.html\?/);
    await expect(page).toHaveURL(/task_id=T104/);
    await expect(page).toHaveURL(/role=reviewer/);
    await expect(page).toHaveURL(/run_type=dry_run/);
  });

  test('調整參與狀態 navigates to the task-detail member-management tab', async ({ page }) => {
    await page.goto(`${DETAIL_URL}?task_id=T104&tab=quality`);
    const adjustBtn = page.locator('.risk-action-btn[data-i18n="qualityRisk.actionAdjust"]').first();
    await expect(adjustBtn).toBeEnabled();
    await adjustBtn.click();
    await expect(page).toHaveURL(/\/pages\/task-management\/task-detail\.html\?/);
    await expect(page).toHaveURL(/task_id=T104/);
    await expect(page).toHaveURL(/tab=member-management/);
  });

  test('classification partials (classificationActionReview key) navigate too', async ({ page }) => {
    await page.goto(`${DETAIL_URL}?task_id=T101&tab=quality`);
    const reviewBtn = page.locator('.risk-action-btn[data-i18n="classificationActionReview"]').first();
    await expect(reviewBtn).toBeEnabled();
    await reviewBtn.click();
    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-list\.html\?/);
    await expect(page).toHaveURL(/task_id=T101/);
  });

  test('non-leader membership keeps the buttons disabled and non-navigating (FR-029)', async ({ page }) => {
    await page.goto(`${DETAIL_URL}?task_id=T106&tab=quality`);
    const reviewBtn = page.locator('.risk-action-btn[data-i18n="qualityRisk.actionReview"]').first();
    await expect(reviewBtn).toBeDisabled();
    await expect(page).toHaveURL(/dataset-analysis-detail\.html/);
  });
});
