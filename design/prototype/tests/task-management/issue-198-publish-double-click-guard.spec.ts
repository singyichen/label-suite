import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html?task_id=T001';

/* Issue #198: when data isolation is enabled (T001's default -- see
 * task-detail.html's DEFAULT_TASK_DATA.isolationEnabled), the publish
 * buttons' click handler skips the riskModal second confirmation and calls
 * publishDryRun()/publishOfficialRun() directly with no busy-flag / disabled
 * protection, so a rapid double-click created two trial rounds (or two
 * publish calls) instead of one.
 *
 * Both tests below invoke the (plain, non-module-script, therefore
 * window-global) publish functions directly twice back-to-back via
 * page.evaluate(), rather than DOM-dispatching two real clicks
 * (Promise.all([click(), click()])) as used for the other DUP-0x findings
 * (see w6-resilience-a11y.md DUP-01/DUP-03/DUP-04). Real DOM double-clicks
 * were tried first but proved unusable for both buttons in this suite's
 * execution environment: the actual gap between two CDP-dispatched clicks
 * is subject to the same test-runner CPU/scheduling jitter as the
 * pre-existing task-detail-stage-flow.spec.ts's own sequential clicks (R1
 * dry-run -> R2 dry-run -> official-run), so no fixed guard duration could
 * be found that reliably rejected the former while still admitting the
 * latter -- confirmed empirically across many repeated runs. Direct
 * back-to-back invocation instead exercises the exact same guarded
 * production function synchronously, which is what a genuinely
 * simultaneous double-activation looks like from the code's perspective,
 * without depending on real-world event-dispatch timing. */

/* Counts 'prototype_publish_success' analytics events for a given
 * target_status, by wrapping window.LabelSuiteAnalytics.track after page
 * load. Implementation-agnostic: it measures how many times the publish
 * logic actually ran, regardless of which guard mechanism blocks the
 * duplicate call. */
async function installPublishSuccessCounter(page: import('@playwright/test').Page, targetStatus: string) {
  await page.evaluate((status) => {
    const analytics = (window as unknown as { LabelSuiteAnalytics?: { track: (name: string, extra?: unknown) => void } }).LabelSuiteAnalytics;
    if (!analytics) return;
    (window as unknown as { __publishSuccessCount: number }).__publishSuccessCount = 0;
    const originalTrack = analytics.track;
    analytics.track = function (name: string, extra?: unknown) {
      const target = (extra as { target_status?: string } | undefined)?.target_status;
      if (name === 'prototype_publish_success' && target === status) {
        (window as unknown as { __publishSuccessCount: number }).__publishSuccessCount += 1;
      }
      return originalTrack.call(analytics, name, extra);
    };
  }, targetStatus);
}

function readPublishSuccessCount(page: import('@playwright/test').Page) {
  return page.evaluate(() => (window as unknown as { __publishSuccessCount?: number }).__publishSuccessCount ?? 0);
}

test.describe('Publish button double-click guard (issue #198)', () => {
  test('double-clicking 發布試標 with isolation enabled creates exactly one trial round', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL + '&status=draft');
    // T001's R1 scenario is scripted to fail (see getTrialRoundScenario), so
    // a successful single publish lands on dry_run_in_progress, not waiting_iaa_confirmation.
    await installPublishSuccessCounter(page, 'dry_run_in_progress');

    const dryRunBtn = page.locator('#publishDryRunBtn');
    await expect(dryRunBtn).toBeVisible();

    await page.evaluate(() => {
      const win = window as unknown as { publishDryRun: () => void };
      win.publishDryRun();
      win.publishDryRun();
    });

    // Settle before counting: if the guard ever regressed, a second
    // trial-round push/analytics event could land after the first
    // assertion below already resolves. Wait past the guard's cooldown
    // window so a regression is reliably caught instead of racing it.
    await page.waitForTimeout(1000);

    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(1);
    await expect(page.locator('#trialRoundsUsedValue')).toHaveText('1');
    expect(await readPublishSuccessCount(page)).toBe(1);
  });

  test('single click on 發布試標 still publishes a round (regression)', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL + '&status=draft');

    await page.locator('#publishDryRunBtn').click();

    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(1);
    await expect(page.locator('#trialRoundsUsedValue')).toHaveText('1');
  });

  test('double-clicking 發布正式標記 with isolation enabled results in exactly one publish', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL + '&status=waiting_iaa_confirmation');
    await installPublishSuccessCounter(page, 'official_run_in_progress');

    const officialRunBtn = page.locator('#publishOfficialRunBtn');
    await expect(officialRunBtn).toBeVisible();
    await officialRunBtn.scrollIntoViewIfNeeded();
    // A successful publish swaps this button out for #publishCompleteBtn (a
    // different, unrelated action) at the same screen position, so ANY
    // click-based double-dispatch (real mouse clicks, locator.click(), or
    // synthetic DOM events) resolves the first click's synchronous handler
    // -- including its re-render -- before a second event can ever be
    // dispatched, meaning a second click physically lands on the new
    // publishCompleteBtn rather than racing publishOfficialRun() a second
    // time. That makes DOM-dispatch unsuitable for proving this guard, so
    // invoke the (plain, non-module-script, therefore window-global)
    // publishOfficialRun() function directly twice back-to-back, mirroring
    // two rapid activations reaching the handler before either completes.
    await page.evaluate(() => {
      const win = window as unknown as { publishOfficialRun: () => void };
      win.publishOfficialRun();
      win.publishOfficialRun();
    });

    // Settle before counting: if the guard ever regressed, a second
    // publish/analytics event could land after the first assertion below
    // already resolves. Wait past the guard's cooldown window so a
    // regression is reliably caught instead of racing it.
    await page.waitForTimeout(1000);

    await expect(page.locator('#statusBadge')).toHaveText('正式標記進行中');
    expect(await readPublishSuccessCount(page)).toBe(1);
  });

  test('single click on 發布正式標記 still publishes (regression)', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL + '&status=waiting_iaa_confirmation');

    await page.locator('#publishOfficialRunBtn').click();

    await expect(page.locator('#statusBadge')).toHaveText('正式標記進行中');
  });
});
