/**
 * Issue #1429 -- T014 (dry_run_in_progress) must keep a non-empty official pool (014 FR-010e).
 * Its 5 datasetRecords are all consumed by trial R1 (sampleCount 5 / usedSamples 5), leaving the
 * official pool at 0. The seed fix adds >= 1 dataset record without touching R1.
 *
 * Contract:
 * - #officialPoolValue (the rendered official pool) is >= 1.
 * - R1 is unchanged: 5 samples used, result 進行中.
 */
import { test, expect } from '../fixtures';

const T014_URL = '/pages/task-management/task-detail.html?task_id=T014&task_role=project_leader';

test('T014 keeps an official pool of at least 1 while R1 stays unchanged (#1429)', async ({ page }) => {
  await page.goto(T014_URL);
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: 15000 });
  await expect(page.locator('#loadingSkeleton')).toBeHidden();
  await expect(page.locator('#statusBadge')).toBeAttached();

  /* R1 unchanged (passes before and after the fix). */
  const rows = page.locator('[data-testid="trial-round-table"] [data-testid="trial-round-row"]');
  await expect(rows).toHaveCount(1);
  await expect(rows.first().locator('[data-testid="trial-round-result"]')).toHaveText('進行中');
  await expect(page.locator('#trialRoundValue')).toHaveText('R1');
  await expect(page.locator('#trialUsedValue')).toHaveText(/^5 \/ \d+$/);

  /* Official pool must not be empty (fails until the seed gains a dataset record). */
  const pool = Number(await page.locator('#officialPoolValue').textContent());
  expect(pool).toBeGreaterThanOrEqual(1);
});
