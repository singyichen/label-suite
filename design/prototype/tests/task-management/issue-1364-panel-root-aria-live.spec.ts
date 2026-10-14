/*
 * Traceability: specs/task-management/014-task-detail/spec.md FR-026 (1); issue #1364.
 *
 * TDD Red. Contract: the single visually hidden status region is the only page-level live
 * announcer, so no task-detail panel root may carry `aria-live`. Small inner regions that
 * announce their own narrow changes keep their live attributes.
 */
import { test, expect } from '../fixtures';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

const PANEL_ROOTS = [
  { tab: 'overview', root: '#overviewPanel' },
  { tab: 'settings', root: '#settingsPanel' },
  { tab: 'annotation-progress', root: '#annotationProgressPanel' },
] as const;

const PRESERVED_REGIONS = [
  { selector: '#settingsSectionStatus', live: 'polite' },
  { selector: '.review-progress-values', live: 'polite' },
  { selector: '.exec-stage-decision', live: 'polite' },
  { selector: '#reviewSettingsError', live: 'assertive' },
] as const;

test.describe('panel roots carry no aria-live (#1364)', () => {
  for (const { tab, root } of PANEL_ROOTS) {
    test(`${root} has no aria-live`, async ({ page }) => {
      await page.goto(`${TASK_DETAIL_URL}?task_id=T001&tab=${tab}&task_role=project_leader`);
      await page.locator(root).waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
      await expect(page.locator(root)).not.toHaveAttribute('aria-live', /.*/);
    });
  }

  test('inner live regions are preserved', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T001&tab=settings&task_role=project_leader`);
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
    for (const { selector, live } of PRESERVED_REGIONS) {
      await expect(page.locator(selector).first(), selector).toHaveAttribute('aria-live', live);
    }
  });
});
