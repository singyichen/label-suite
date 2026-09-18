/**
 * Dashboard Annotator/Reviewer task list sort control (issue #187)
 * Source spec: specs/dashboard/012-dashboard/spec.md (FR-010D, FR-011F)
 *
 *   - A sort <select> lets the user reorder the task list by progress
 *     (high-to-low / low-to-high), with a default option that restores
 *     the original seed order.
 *   - Sorting must not change which tasks render, only their order; the
 *     existing "keep current fixed assignment set" scope (issue #187,
 *     no per-user assignment data in dashboard.assignments.js) is
 *     verified by asserting the full 17-task baseline still renders.
 */
import { test, expect } from '@playwright/test';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';

test.describe.configure({ mode: 'serial' });

test.describe('Dashboard — issue #187 annotator task list sort', () => {
  test('default order matches the unsorted seed order', async ({ page }) => {
    await page.goto(`${DASHBOARD_URL}?scenario=annotator`);
    const titles = page.getByTestId('annotator-view').locator('.list-item-title');
    await expect(titles.first()).toHaveText('醫療文本情感分類');
  });

  test('sorting by progress descending/ascending reorders the cards', async ({ page }) => {
    await page.goto(`${DASHBOARD_URL}?scenario=annotator`);
    const titles = page.getByTestId('annotator-view').locator('.list-item-title');

    await page.locator('#annotatorSortSelect').selectOption('progress_desc');
    // T014/T016/T017 are tied at 100% progress; stable sort keeps their
    // original relative order, so T014 (first in the seed) leads.
    await expect(titles.first()).toHaveText('審核流程示範：試標');
    await expect(titles.last()).toHaveText('病患情緒與照護情境階層分類'); // T003, 18%

    await page.locator('#annotatorSortSelect').selectOption('progress_asc');
    await expect(titles.first()).toHaveText('病患情緒與照護情境階層分類'); // T003, 18%
    // Stable sort keeps the 100%-tie group (T014/T016/T017) in seed order
    // regardless of direction, so T017 (last of the tie) lands last here.
    await expect(titles.last()).toHaveText('審核流程示範：正式標記（雙審核員平手）');

    await page.locator('#annotatorSortSelect').selectOption('default');
    await expect(titles.first()).toHaveText('醫療文本情感分類');
  });

  test('sorting does not change the assigned task subset or card actions', async ({ page }) => {
    await page.goto(`${DASHBOARD_URL}?scenario=annotator`);
    const view = page.getByTestId('annotator-view');
    await expect(view.locator('.list-item-title')).toHaveCount(17);

    await page.locator('#annotatorSortSelect').selectOption('progress_desc');
    await expect(view.locator('.list-item-title')).toHaveCount(17);
    await expect(view.locator('.role-task-action-btn')).toHaveCount(17);
  });

  test('sort control labels localize on language toggle', async ({ page }) => {
    await page.goto(`${DASHBOARD_URL}?scenario=annotator`);
    await expect(page.locator('#annotatorSortLabel')).toHaveText('排序');
    await expect(page.locator('#annotatorSortOptionProgressDesc')).toHaveText('進度：高到低');

    await page.locator('#langToggle').click();
    await expect(page.locator('#annotatorSortLabel')).toHaveText('Sort by');
    await expect(page.locator('#annotatorSortOptionProgressDesc')).toHaveText('Progress: High to Low');
  });
});

test.describe('Dashboard — issue #187 reviewer task list sort', () => {
  test('sorting by progress descending reorders the cards and preserves the task subset', async ({ page }) => {
    await page.goto(`${DASHBOARD_URL}?scenario=reviewer`);
    const view = page.getByTestId('reviewer-view');
    const titles = view.locator('.list-item-title');
    await expect(titles).toHaveCount(17);

    await page.locator('#reviewerSortSelect').selectOption('progress_desc');
    // T016 is the sole 100% (審核覆蓋率) reviewer entry.
    await expect(titles.first()).toHaveText('審核流程示範：正式標記（三審核員多數決）');
    await expect(titles).toHaveCount(17);
    await expect(view.locator('.role-task-action-btn')).toHaveCount(17);
  });
});
