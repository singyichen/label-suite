import { test, expect, type Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html?task_id=T001';

// Tab panels arrive via fetched partials and event bindings only attach after
// the last partial (#workLogPanel) lands; wait for it before interacting.
const PANEL_LOAD_TIMEOUT = 15000;

/* w6-resilience-a11y.md DUP-06: with data isolation DISABLED, publishing must
 * route through the riskModal second confirmation -- cancel leaves the task
 * untouched, only confirm actually publishes.
 *
 * T001 seeds isolationEnabled=true, and the toggle is only editable while the
 * task is a draft (isSamplingEditable()), so the test reaches the
 * isolation-off state through the real PL flow: sampling edit -> uncheck the
 * isolation switch -> save. Both publish buttons share the identical
 * `!TASK_DATA.isolationEnabled && !state.isolationConfirmed -> openRiskModal`
 * branch in the same delegated publishActionRow click handler
 * (task-detail.html), and the official-run button only renders in
 * waiting_iaa_confirmation -- a status in which sampling (and therefore the
 * isolation toggle) is no longer editable -- so the dry-run legs below pin
 * the shared guard for both actions. */

async function disableIsolation(page: Page) {
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
  await page.locator('#samplingEditBtn').click();
  // The real checkbox is visually hidden inside the toggle-switch, so click
  // its label wrapper instead of uncheck() (same pattern as the
  // review-settings arbitration toggle tests).
  await page.locator('label[for="isolationToggle"]').click();
  await expect(page.locator('#isolationToggle')).not.toBeChecked();
  await page.locator('#samplingSaveBtn').click();
  await expect(page.locator('#samplingEditForm')).toHaveClass(/hidden/);
}

test.describe('Publish risk-confirm modal with isolation disabled (DUP-06)', () => {
  test('cancelling the risk modal leaves the task in draft with no trial round', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL + '&status=draft');
    await disableIsolation(page);

    await page.locator('#publishDryRunBtn').click();

    const riskModal = page.locator('#riskModal');
    await expect(riskModal).toHaveAttribute('aria-hidden', 'false');
    await expect(riskModal).toHaveClass(/show/);

    await page.locator('#riskCancelBtn').click();

    await expect(riskModal).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('#statusBadge')).toHaveText('草稿');
    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(0);
  });

  test('confirming the risk modal publishes exactly one trial round', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL + '&status=draft');
    await disableIsolation(page);

    await page.locator('#publishDryRunBtn').click();
    await expect(page.locator('#riskModal')).toHaveAttribute('aria-hidden', 'false');

    await page.locator('#riskConfirmBtn').click();

    await expect(page.locator('#riskModal')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(1);
    await expect(page.locator('#trialRoundsUsedValue')).toHaveText('1');
  });
});
