/**
 * Issue #1232 -- a dry_run_in_progress task must not show its still-open latest trial round as
 * 「未通過」. Maintainer ruling: fix the seed (task-detail.data.js), not the render.
 *
 * Fixture: T014 -> status dry_run_in_progress, no trialRounds in its profile (so the page
 * synthesizes the latest round).
 *
 * Contract: the last trial-round-row shows 進行中 (never 未通過), and its completion-time cell
 * carries no date. The render prints '-' for a falsy date, so "no date" is asserted as the
 * absence of a YYYY-MM-DD pattern rather than an exact empty string.
 */
import { test, expect } from '../fixtures';

const T014_URL = '/pages/task-management/task-detail.html?task_id=T014&task_role=project_leader';

test('the in-progress latest trial round of T014 shows 進行中 with no completion date (#1232)', async ({ page }) => {
  await page.goto(T014_URL);
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: 15000 });
  await expect(page.locator('#loadingSkeleton')).toBeHidden();
  await expect(page.locator('#statusBadge')).toBeAttached();

  const rows = page.locator('[data-testid="trial-round-table"] [data-testid="trial-round-row"]');
  await expect(rows.first()).toBeVisible();
  const latest = rows.last();

  const result = latest.locator('[data-testid="trial-round-result"]');
  await expect(result).toHaveText('進行中');
  await expect(result).not.toHaveText('未通過');
  await expect(result).not.toHaveClass(/failed/);

  const dateCell = latest.locator('td').last();
  await expect(dateCell).not.toHaveText(/\d{4}-\d{2}-\d{2}/);
});
