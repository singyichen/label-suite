import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, skipGuidelineModal } from '../annotation/_workspace-helpers';

/* w6-resilience-a11y.md I18N-01: the global language choice is stored under
 * the shared 'labelsuite.lang' localStorage key, so a page opened AFTER the
 * switch must come up in the chosen language without any per-page toggle.
 *
 * 限制標注: one BrowserContext stands in for one browser profile ("the same
 * user opening another tab"). Only pages opened after the switch inherit it
 * at load -- no storage-event listener pushes the change into already-open
 * pages (that manual-reload reconciliation model is pinned by
 * xrole-concurrency.spec.ts). */

test('a language switched on the dashboard is inherited by a workspace opened afterwards (I18N-01)', async ({ page, context }) => {
  await page.goto('/pages/dashboard/dashboard.html');
  await expect(page.getByTestId('lang-label')).toHaveText('ZH');
  await page.getByTestId('lang-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  const next = await context.newPage();
  await skipGuidelineModal(next);
  await next.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
  await dismissGuidelineModal(next);

  await expect(next.locator('html')).toHaveAttribute('lang', 'en');
  // A workspace-owned label proves the page actually rendered in English
  // rather than merely carrying the lang attribute.
  await expect(next.getByTestId('ws-note-label')).toHaveText('Notes (optional)');
  await next.close();
});
