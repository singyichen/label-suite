import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from '../annotation/_workspace-helpers';

const PANEL_LOAD_TIMEOUT = 15000;

/* T001 (single_label, spec 015 v2.0.0 seed) has exactly 5 dataset records
 * (sent-001..sent-005), each carrying a gold_label output-role prefill (013
 * FR-003g-5) -- the single_label answer chip is already seeded on load, so
 * every sample can be submitted immediately without an extra chip click. */
const SAMPLE_IDS = ['sent-001', 'sent-002', 'sent-003', 'sent-004', 'sent-005'];

test('moves task status to waiting IAA confirmation after all 5 dry-run samples are submitted', async ({ page }) => {
  await skipGuidelineModal(page);

  for (let i = 0; i < SAMPLE_IDS.length; i += 1) {
    await page.goto(
      buildWorkspaceUrl({ task_id: 'T001', sample_id: SAMPLE_IDS[i], role: 'annotator', run_type: 'dry_run' })
    );
    await page.getByTestId('ws-submit-btn').click();
    await expect(page.getByTestId('ws-sample-item').nth(i)).toHaveAttribute('data-submitted', 'true');
  }

  await page.goto('/pages/task-management/task-detail.html?task_id=T001&status=dry_run_in_progress');
  await expect(page.locator('#statusBadge')).toHaveText('待 IAA 確認', { timeout: PANEL_LOAD_TIMEOUT });
});
