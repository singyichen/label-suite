import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from '../annotation/_workspace-helpers';
import { applyDryRunState, expectStillInProgress, TASK_DETAIL_URL } from './_dry-run-completion-helpers';

const PANEL_LOAD_TIMEOUT = 15000;

/* T001 (single_label, spec 015 v2.0.0 seed) has exactly 5 dataset records
 * (sent-001..sent-005), each carrying a gold_label output-role prefill (013
 * FR-003g-5) -- the single_label answer chip is already seeded on load, so
 * every sample can be submitted immediately without an extra chip click. */
const SAMPLE_IDS = ['sent-001', 'sent-002', 'sent-003', 'sent-004', 'sent-005'];

test('moves task status to waiting IAA confirmation only after all 5 dry-run samples are submitted and review, arbitration and the exception pool are complete (FR-008a, #1120 G4a)', async ({ page }) => {
  await skipGuidelineModal(page);

  for (let i = 0; i < SAMPLE_IDS.length; i += 1) {
    await page.goto(
      buildWorkspaceUrl({ task_id: 'T001', sample_id: SAMPLE_IDS[i], role: 'annotator', run_type: 'dry_run' })
    );
    await page.getByTestId('ws-submit-btn').click();
    if (i < SAMPLE_IDS.length - 1) {
      await expect(page.getByTestId('ws-sample-item').nth(i)).toHaveAttribute('data-submitted', 'true');
    } else {
      /* issue #514: the fifth submit leaves nothing pending, so the workspace
         now returns to annotation-list (FR-022C) instead of staying put --
         the list row's 已提交 badge is where that last submission is
         readable from, and it is the same evidence AC-2.5 asks for. */
      await expect(page).toHaveURL(/annotation-list\.html\?/);
      await expect(page.getByTestId('ws-sample-item').nth(i).locator('.status-badge')).toHaveText('已提交');
    }
  }

  /* #1120 G4a: submission alone no longer completes the trial. Half 1: every sample submitted
     but review outstanding -> the task stays in progress. */
  await page.goto(`${TASK_DETAIL_URL}?task_id=T001&status=dry_run_in_progress`);
  await expect(page.locator('#statusBadge')).toBeAttached({ timeout: PANEL_LOAD_TIMEOUT });
  await expectStillInProgress(page, 'T001');

  /* Half 2: close review and arbitration through the workspace's public write paths, then the
     same page load re-evaluates the gate and advances. */
  await applyDryRunState(page, 'T001', { review: true, arbitrate: 'all' });
  await page.reload();
  await expect(page.locator('#statusBadge')).toHaveText('待 IAA 確認', { timeout: PANEL_LOAD_TIMEOUT });
});
