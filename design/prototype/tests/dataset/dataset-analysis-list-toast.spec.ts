/**
 * List-page toast contract (UXC-07 / MASTER §Toast, issue #183 audit).
 *
 * Before the fix the toast was a bottom-right dark-ink banner with a fixed
 * 3000ms auto-dismiss and no close control or semantic variants.
 */
import { test, expect } from '@playwright/test';

const LIST_URL = '/pages/dataset/dataset-analysis-list.html';

test.describe('Dataset analysis list toast', () => {
  test('row navigation shows an info-variant toast with a manual close control', async ({ page }) => {
    await page.goto(LIST_URL);

    // Keep the page alive after the row click so the toast can be inspected —
    // the 220ms delayed navigation would otherwise tear the document down.
    await page.route('**/dataset-analysis-detail.html*', (route) => route.abort());

    const toast = page.locator('#toast');
    await expect(toast).toBeHidden();

    // Freeze page timers right before triggering the toast (not before
    // page.goto — that would freeze the page's own render/init timers too).
    // install() alone is NOT enough: the fake clock keeps ticking with real
    // time by default, so pauseAt is what actually traps the toast's 5s
    // auto-dismiss (dataset-analysis-list.js TOAST_DURATIONS.info=5000) and
    // keeps it from firing mid-assertion, no matter how slow the assertions
    // run under system load (issue #286).
    await page.clock.install();
    await page.clock.pauseAt(Date.now() + 1000);

    await page.locator('#taskTableBody tr.task-row').first().click();
    await expect(toast).toBeVisible();
    await expect(toast).toHaveClass(/toast-info/);
    await expect(page.locator('#toastMsg')).toHaveText('前往分析詳情…');

    await page.locator('#toastClose').click();
    await expect(toast).toBeHidden();
  });
});
