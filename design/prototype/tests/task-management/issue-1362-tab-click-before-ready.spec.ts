/*
 * Traceability: specs/task-management/014-task-detail (tab switching) - issue #1362.
 *
 * Red contract: a tab click made before the delayed panel fetches resolve must not be lost.
 * Root cause: tab buttons exist in static HTML but their handlers are bound in bindEvents()
 * only after loadAllTabPanels() resolves. Green: buttons carry aria-disabled="true" until
 * bound, so Playwright's click auto-waits for them to become enabled.
 *
 * Determinism: the annotation-progress / work-log panel fetch is delayed ~1500ms so the click
 * always lands before the handlers are bound (default expect timeout; load finishes ~2.1s).
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { TASK_DETAIL_URL } from './_dry-run-completion-helpers';

const DELAY_MS = 1500;

async function delayPanel(page: Page, file: string) {
  await page.route(`**/task-detail.panels/${file}*`, async (route) => {
    const response = await route.fetch();
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    await route.fulfill({ response });
  });
}

const cases = [
  { file: 'annotation-progress.html', tab: '#tabAnnotationProgress', panel: '#annotationProgressPanel' },
  { file: 'work-log.html', tab: '#tabWorkLog', panel: '#workLogPanel' },
];

for (const c of cases) {
  test(`issue #1362: clicking ${c.tab} before panels finish loading still switches tab`, async ({ page }) => {
    await delayPanel(page, c.file);
    await page.goto(`${TASK_DETAIL_URL}?task_role=project_leader&task_id=T014`);
    await page.locator(c.tab).waitFor({ state: 'attached' });
    await page.locator(c.tab).click();

    await expect(page.locator(c.tab)).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator(c.panel)).not.toHaveClass(/hidden/);
  });
}
