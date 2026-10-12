/* Red test for issue #1202 -- a workspace-tab-bar switch must not be undone
 * by the OUTGOING page's late history.replaceState() (spec 019 AC-3.5 /
 * FR-007 re-key rule, AC-2.5 location.replace() switching).
 *
 * Mechanism: activateWorkspaceTab() writes activeIndex=<destination> and
 * calls location.replace(dest), which is async; the outgoing page stays
 * alive until the destination responds. If that page calls replaceState in
 * the window (task-detail's 560ms skeleton render does), its settle timer
 * finds its OWN stored slot (index != new activeIndex, same dedupeKey) and
 * misreads it as an AC-3.5 collision: it flips activeIndex back and
 * navigates to itself, undoing the user's switch.
 *
 * Determinism: the destination response is held for DESTINATION_DELAY_MS via
 * page.route, so the outgoing page is guaranteed alive. Playwright's click()
 * waits for the triggered navigation to commit, so a page.evaluate() issued
 * after it would run on the DESTINATION page. The late replaceState is
 * therefore armed on the outgoing page BEFORE the click as a timer
 * (LATE_REPLACE_STATE_DELAY_MS, well inside the delay window), and the page
 * records where it fired in sessionStorage so the test can prove it ran on
 * the outgoing document. The reordered-query replaceState changes the href
 * (so the byte-identical-href early return does not apply) and keeps the
 * normalized dedupe key, so the owner guard is what this spec depends on.
 */
import { test, expect } from '../fixtures';
import { workspaceTabs, readWorkspaceTabState, setDesktopViewport } from './_workspace-tabs-helpers';

const TAB_A_URL = '/pages/task-management/task-detail.html?task_id=T001&tab=overview&ap_stage=r1';
const TAB_B_URL = '/pages/task-management/task-detail.html?task_id=T002&tab=overview&ap_stage=r1';
const DESTINATION_DELAY_MS = 1500;
const LATE_REPLACE_STATE_DELAY_MS = 200;
const SETTLE_WINDOW_MS = 300;
const FIRED_ON_KEY = 'ls-test-late-replacestate-fired-on';

test.describe('Workspace tabs — outgoing page replaceState must not undo a tab-bar switch (#1202)', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('a replaceState on the outgoing page while the destination loads keeps the clicked tab active', async ({ page }) => {
    await page.goto(TAB_A_URL);
    await expect(workspaceTabs(page)).toHaveCount(1);
    await page.goto(TAB_B_URL);
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(2);
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');

    // Hold tab A's response so tab B (outgoing) stays alive after the click.
    await page.route(
      (url) => url.pathname.endsWith('/task-detail.html') && url.searchParams.get('task_id') === 'T001',
      async (route) => {
        await new Promise((resolve) => setTimeout(resolve, DESTINATION_DELAY_MS));
        await route.continue().catch(() => {});
      },
    );

    // Arm the late bootstrap render on the still-alive OUTGOING page. The
    // query is reordered so the href really changes while the normalized
    // dedupe key stays this page's own.
    await page.evaluate(
      ({ delay, key }) => {
        window.setTimeout(() => {
          window.sessionStorage.setItem(key, window.location.href);
          const reordered = [...new URLSearchParams(window.location.search).entries()].reverse();
          window.history.replaceState(null, '', window.location.pathname + '?' + new URLSearchParams(reordered).toString());
        }, delay);
      },
      { delay: LATE_REPLACE_STATE_DELAY_MS, key: FIRED_ON_KEY },
    );
    await tabs.nth(0).click();
    // Negative assertion: the timer (200ms) plus the settle timer (0ms) have
    // fired by now, and the delayed route keeps the outgoing page the document.
    await page.waitForTimeout(LATE_REPLACE_STATE_DELAY_MS + SETTLE_WINDOW_MS);

    // Proof the replaceState ran on the outgoing page (tab B), not the destination.
    const firedOn = await page.evaluate((key) => window.sessionStorage.getItem(key), FIRED_ON_KEY);
    expect(firedOn).toContain('task_id=T002');

    const state = (await readWorkspaceTabState(page)) as { activeIndex: number };
    expect(state.activeIndex).toBe(0);

    // Once the delayed response lands, the clicked tab must be the active one.
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true', { timeout: 10_000 });
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'false');
  });
});
