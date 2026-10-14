import { test, expect } from '../fixtures';
import { buildListUrl, skipGuidelineModal } from './_workspace-helpers';

/* Issue #1429: T014 datasetTotal is 6 (one official-pool record lives
 * outside datasetRecords, same #1120 precedent as T015/T016). The R1 trial
 * annotation list must keep iterating only the 5 listed records, so it
 * stays consistent with sampleCount 5.
 *
 * Traceability: specs/task-management/014-task-detail/spec.md FR-010e
 */
test.describe('T014 dry_run annotation list ignores the unlisted official-pool record (issue #1429)', () => {
  test('lists exactly the 5 R1 records and no dry-06', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildListUrl({ task_id: 'T014', role: 'annotator', run_type: 'dry_run' }));
    const rows = page.getByTestId('ws-sample-item');
    await expect(rows.first()).toBeVisible();
    await expect(rows).toHaveCount(5);
    await expect(page.locator('body')).not.toContainText('dry-06');
  });
});
