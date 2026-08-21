/**
 * Dashboard task-card row: keyboard accessibility + task_type routing param
 * Source spec: specs/dashboard/012-dashboard/spec.md FR-010B1 / FR-011B1
 * Issue: #311
 *
 * The interactive annotator/reviewer task-card rows must be keyboard
 * operable (role=button + tabindex=0 + Enter/Space, mirroring the #186
 * pending-IAA stat pattern) and the row-click annotation-list URL must
 * carry the independent legacy `task_type` compatibility field
 * (annotationTaskType seed, never derived from outputs[]).
 */
import { test, expect, type Page } from '@playwright/test';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';

test.describe.configure({ mode: 'serial' });

async function openScenario(page: Page, scenario: 'annotator' | 'reviewer') {
  await page.goto(DASHBOARD_URL);
  const trigger = page.locator(`.scenario-pill[data-scenario="${scenario}"]`);
  await expect(trigger).toBeVisible();
  await trigger.click();
}

test.describe('Dashboard task-card keyboard accessibility (issue #311)', () => {
  test('annotator card is a focusable button and Enter routes to annotation list with task_type', async ({ page }) => {
    await openScenario(page, 'annotator');

    const firstCard = page
      .getByTestId('annotator-view')
      .locator('#annotatorTaskList .list-item')
      .first();
    await expect(firstCard).toHaveAttribute('role', 'button');
    await expect(firstCard).toHaveAttribute('tabindex', '0');

    // Accessible name is computed from the card contents (task title).
    await expect(
      page
        .getByTestId('annotator-view')
        .getByRole('button', { name: /醫療文本情感分類/ })
    ).toBeVisible();

    await firstCard.focus();
    await expect(firstCard).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-list\.html\?/);
    await expect(page).toHaveURL(/task_id=T001/);
    await expect(page).toHaveURL(/role=annotator/);
    await expect(page).toHaveURL(/run_type=official_run/);
    await expect(page).toHaveURL(/task_type=single_sentence_classification/);
  });

  test('reviewer card Space press routes to annotation list with task_type', async ({ page }) => {
    await openScenario(page, 'reviewer');

    const firstCard = page
      .getByTestId('reviewer-view')
      .locator('#reviewerTaskList .list-item')
      .first();
    await expect(firstCard).toHaveAttribute('role', 'button');
    await expect(firstCard).toHaveAttribute('tabindex', '0');

    await firstCard.focus();
    await expect(firstCard).toBeFocused();
    await page.keyboard.press(' ');

    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-list\.html\?/);
    await expect(page).toHaveURL(/task_id=T001/);
    await expect(page).toHaveURL(/role=reviewer/);
    await expect(page).toHaveURL(/run_type=official_run/);
    await expect(page).toHaveURL(/task_type=single_sentence_classification/);
  });

  test('Enter on the inner quick-action button still routes to the workspace, not the list', async ({ page }) => {
    await openScenario(page, 'annotator');

    const firstActionButton = page
      .getByTestId('annotator-view')
      .locator('#annotatorTaskList .role-task-action-btn')
      .first();
    await firstActionButton.focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-workspace\.html\?/);
    await expect(page).toHaveURL(/sample_id=sent-001/);
  });

  test('non-interactive admin cards do not get the button role', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.locator('.scenario-pill[data-scenario="super_admin_data"]').click();

    const adminCards = page.locator('#adminTaskList .list-item');
    await expect(adminCards.first()).toBeVisible();
    await expect(adminCards.first()).not.toHaveAttribute('role', 'button');
    await expect(adminCards.first()).not.toHaveAttribute('tabindex', '0');
  });
});

test.describe('Dashboard task_type compatibility param (issue #311)', () => {
  test('task_type is the per-task independent seed, not a uniform value', async ({ page }) => {
    await openScenario(page, 'annotator');

    const sequenceCard = page
      .getByTestId('annotator-view')
      .locator('#annotatorTaskList [data-example-task-id="T006"]');
    await sequenceCard.click({ position: { x: 80, y: 24 } });

    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-list\.html\?/);
    await expect(page).toHaveURL(/task_id=T006/);
    await expect(page).toHaveURL(/task_type=sequence_labeling/);
  });

  test('demo-task reviewer row carries task_type alongside reviewer_id', async ({ page }) => {
    await openScenario(page, 'reviewer');

    const demoCard = page
      .getByTestId('reviewer-view')
      .locator('#reviewerTaskList [data-example-task-id="T014"]');
    await demoCard.click({ position: { x: 80, y: 24 } });

    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-list\.html\?/);
    await expect(page).toHaveURL(/task_id=T014/);
    await expect(page).toHaveURL(/role=reviewer/);
    await expect(page).toHaveURL(/run_type=dry_run/);
    await expect(page).toHaveURL(/task_type=single_sentence_classification/);
    await expect(page).toHaveURL(/reviewer_id=reviewer_chen/);
  });
});
