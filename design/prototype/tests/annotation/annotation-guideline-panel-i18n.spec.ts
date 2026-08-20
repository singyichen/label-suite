import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal } from './_workspace-helpers';

/* w6-resilience-a11y.md I18N-02: the guideline area's UI chrome -- the two
 * tab labels and the summary panel title -- is workspace-owned copy and must
 * follow the global language mode.
 *
 * Scope deliberately EXCLUDES the guideline/attachment CONTENT itself:
 * uploaded guideline files are single-language source data (F-02), the same
 * UI-chrome-only scope rationale documented at the top of
 * annotation-workspace-i18n.spec.ts. */

test.describe('Guideline tab and panel chrome localization (I18N-02)', () => {
  test('renders the Chinese chrome by default', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.guidelineModalSeen', '1');
    });
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
    await dismissGuidelineModal(page);

    await expect(page.locator('#wsTabGuidelineLabel')).toHaveText('說明與檔案');
    await expect(page.locator('#wsTabHistoryLabel')).toHaveText('歷程');
    await expect(page.locator('#guidelineSummaryTitle')).toHaveText('任務說明');
  });

  test('renders the English chrome in English mode', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
      window.localStorage.setItem('labelsuite.guidelineModalSeen', '1');
    });
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
    await dismissGuidelineModal(page);
    // Belt and braces against a stale stored-lang read: flip via the shared
    // toggle if the page did not come up in English (same defensive pattern
    // as annotation-workspace-i18n.spec.ts's ensureEnglishMode).
    if ((await page.getByTestId('lang-label').textContent()) !== 'EN') {
      await page.getByTestId('lang-toggle').click();
    }
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await expect(page.locator('#wsTabGuidelineLabel')).toHaveText('Guidelines & Files');
    await expect(page.locator('#wsTabHistoryLabel')).toHaveText('History');
    await expect(page.locator('#guidelineSummaryTitle')).toHaveText('Task Guideline');
  });
});
