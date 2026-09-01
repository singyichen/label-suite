import { test, expect, type Page } from '@playwright/test';
import {
  buildWorkspaceUrl,
  skipGuidelineModal,
  patchDataFile,
  trackPageErrors,
  assertNoPageErrors,
} from './_workspace-helpers';

/* issue #578 / spec 015 v4.61.0 -- FR-088 標記耗時記錄與可見性.
 *
 * `lead_time` is page-visible time, deliberately NOT the wall-clock gap
 * between `started_at` and `at`. The number feeds difficulty analysis, so a
 * sample left open in a background tab over lunch must not read as a hard
 * sample. That is why AC-2.19's second AND is an inequality against the
 * wall-clock difference rather than an equality against a fixed figure: the
 * contract is "background time is excluded", not "the timer is accurate to
 * the millisecond".
 *
 * Everything runs on Playwright's fake clock. The autosave heartbeat on this
 * same page has a real/fake clock race on record (issue #524), so the clock
 * is installed and paused BEFORE navigation -- boot() then registers its own
 * timers on virtual time we control, and every advance below is a known
 * distance from boot.
 */

const TASK = 'T001';
const SAMPLE = 'sent-001';
const ANNOTATOR = 'kioleemg12';
const REVIEWER = 'reviewer-01';

const CLOCK_BASE = new Date('2026-08-31T09:00:00.000Z');
/* Pause a minute AFTER install, never at the same instant: pauseAt only ever
   moves virtual time forward, and the real milliseconds spent between the two
   calls had already carried the clock past CLOCK_BASE (issue #524). */
const CLOCK_PAUSE = new Date('2026-08-31T09:01:00.000Z');

const VISIBLE_BEFORE_MS = 10_000;
const BACKGROUND_MS = 60_000;
const VISIBLE_AFTER_MS = 5_000;

type HistoryEvent = { action: string; role: string; at: string; started_at?: string; lead_time?: number };

/* Playwright cannot background a tab, so the page's own visibility signal is
   swapped and the event the browser would have fired is dispatched. Both
   halves matter: an implementation listening only for `blur` would pass a
   blur-only test while still billing background time on a tab switch. */
async function setTabHidden(page: Page, hidden: boolean) {
  await page.evaluate((isHidden: boolean) => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => (isHidden ? 'hidden' : 'visible'),
    });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event(isHidden ? 'blur' : 'focus'));
  }, hidden);
}

async function readHistory(page: Page, role: 'annotator' | 'reviewer'): Promise<HistoryEvent[]> {
  return page.evaluate((viewerRole: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (window as any).LabelSuiteAnnotationWorkspaceData;
    return data.getSampleHistory('T001', 'official_run', 'sent-001', { annotatorId: 'kioleemg12' }, {
      role: viewerRole,
      actorId: viewerRole === 'reviewer' ? 'reviewer-01' : 'kioleemg12',
    });
  }, role);
}

/* Opens the sample, spends visible time, spends background time, comes back,
   and submits -- the one journey AC-2.19 describes. */
async function annotateAcrossABackgroundGap(page: Page) {
  await page.clock.install({ time: CLOCK_BASE });
  await page.clock.pauseAt(CLOCK_PAUSE);
  await skipGuidelineModal(page);
  /* Same strip issue-470's spec does: T001's records ship a gold_label
     output-role prefill, and while it is in place the answer chip does not
     take the annotator's own click -- the submit below would then bounce on
     請完成所有標記項目後再提交 and never write an event to measure. */
  await patchDataFile(
    page,
    'task-detail.data.js',
    `window.LabelSuiteTaskDetailData.profiles.T001.datasetRecords.forEach(function (r) { r.gold_label = null; });`
  );
  await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, annotator_id: ANNOTATOR }));

  await page.clock.fastForward(VISIBLE_BEFORE_MS);
  await setTabHidden(page, true);
  await page.clock.fastForward(BACKGROUND_MS);
  await setTabHidden(page, false);
  await page.clock.fastForward(VISIBLE_AFTER_MS);

  await page.getByTestId('ws-single-label-chip-positive').click();
  await page.getByTestId('ws-submit-btn').click();
}

test.describe('FR-088 標記耗時以頁面可見時間累計 (issue #578)', () => {
  test('AC-2.19: the submit event carries started_at and a lead_time that excludes the background gap', async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await annotateAcrossABackgroundGap(page);

    const events = await readHistory(page, 'reviewer');
    const submitted = events.find((event) => event.action === 'submitted' && event.role === 'annotator');
    expect(submitted).toBeTruthy();

    const leadTime = submitted?.lead_time;
    expect(typeof leadTime).toBe('number');
    expect(submitted?.started_at).toBeTruthy();

    const wallClock = new Date(String(submitted?.at)).getTime() - new Date(String(submitted?.started_at)).getTime();
    expect(wallClock).toBeGreaterThanOrEqual(VISIBLE_BEFORE_MS + BACKGROUND_MS + VISIBLE_AFTER_MS);
    /* AC-2.19 第二個 AND. */
    expect(leadTime as number).toBeLessThan(wallClock);
    /* AC-2.19 THEN: the 60s spent hidden is absent, not merely discounted. */
    expect(leadTime as number).toBeLessThan(BACKGROUND_MS);
    assertNoPageErrors(errors);
  });

  test('AC-3.49: the annotator view shows no lead time, the reviewer view does', async ({ page }) => {
    const errors = trackPageErrors(page);
    await annotateAcrossABackgroundGap(page);

    await page.getByTestId('ws-guideline-tab-history').click();
    await expect(page.getByTestId('ws-history-lead-time')).toHaveCount(0);

    await page.goto(
      buildWorkspaceUrl({
        task_id: TASK,
        sample_id: SAMPLE,
        role: 'reviewer',
        annotator_id: ANNOTATOR,
        reviewer_id: REVIEWER,
      })
    );
    await page.getByTestId('ws-guideline-tab-history').click();
    await expect(page.getByTestId('ws-history-lead-time').first()).toBeVisible();
    assertNoPageErrors(errors);
  });
});
