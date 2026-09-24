import { test, expect, type Page } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

/* issue #856: seedReviewFlowDemo()'s "seed once" marker
 * (`labelsuite.reviewFlowDemoSeed.v1`) was introduced at `7ffbbf3e` and never
 * bumped while the T014-T016 seed table kept changing underneath it (#815,
 * #843, #837/PR #855 -- dry-05's reviewer decision moved from the retired
 * `reject` to `bypass`). A browser that already holds the v1 marker short-
 * circuits seedReviewFlowDemo()'s early return
 * (annotation-workspace.data.js:3073) forever, so every later seed fix is
 * invisible to it -- a fresh browser (including every Playwright test) never
 * shows the bug, which is how it survived three seed-table rewrites unnoticed.
 *
 * Maintainer ruling (issue #856): bump the marker whenever the seed contract
 * changes. A browser carrying the OLD v1 marker must have its T014-T016
 * seed-related buckets cleared and reseeded on the current upgrade -- naively
 * bumping the marker without clearing first would make submitArbitration()
 * and the history-event appenders run a SECOND time on top of the stale data,
 * duplicating arbitration votes and history events. State the visitor left on
 * tasks OUTSIDE T014-T016 must never be touched by that clear+reseed.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-051 (seedReviewFlowDemo, review-flow demo Phase 2 slice C)
 */

const SEED_MARKER = 'labelsuite.reviewFlowDemoSeed.v1';
const SEED_MARKER_PREFIX = 'labelsuite.reviewFlowDemoSeed.';
const SUBMISSION_PREFIX = 'labelsuite.wsSubmissions.';
const ARBITRATION_PREFIX = 'labelsuite.wsArbitration.';

/* Realistic pre-issue-#837 shape for T014 dry-05's reviewer_wang decision,
 * reconstructed from `git show 0c9b9ad6` (the #837 commit that rewrote this
 * exact row from `rejectBy: 'reviewer_wang'` to `bypassBy: 'reviewer_wang'`):
 * the old seed row was
 *   { t: 'T014', r: 'dry_run', s: 'dry-05-pending-review', a: 'kioleemg12',
 *     v: 'positive', rev: { reviewer_wang: 'positive' }, rejectBy: 'reviewer_wang' }
 * which markSampleSubmitted()/labelPayload() turned into this stored entry
 * (decision 'reject' has no REVIEW_DECISION_EVENT_ACTION, so pre-#837 code
 * only ever appended the wrapper 'submitted' history event for it, never a
 * per-decision one -- see annotation-workspace.data.js:394-415).
 */
const STALE_DRY05_KEY = SUBMISSION_PREFIX + 'T014::reviewer::dry_run::kioleemg12::reviewer_wang';
const STALE_DRY05_ENTRY = {
  status: 'submitted',
  submittedAt: '2026-01-01T00:00:00.000Z',
  answers: {
    previewState: { single_label: { selected: 'positive' } },
    decisions: { single_label: 'reject' },
  },
  history: [
    {
      action: 'submitted',
      role: 'reviewer',
      actorId: 'reviewer_wang',
      at: '2026-01-01T00:00:00.000Z',
      summary: 'single_label · kioleemg12: reject — ',
      result_snapshot: null,
    },
  ],
};

/* A visitor's own state on T001 -- a task the seeder never touches (T014-T016
 * ONLY, per annotation-workspace.data.js:3065-3066) -- must survive the
 * upgrade untouched. */
const VISITOR_KEY = SUBMISSION_PREFIX + 'T001::annotator::official_run::kioleemg12::-';
const VISITOR_ENTRY = {
  status: 'saved',
  savedAt: '2026-01-01T00:00:00.000Z',
  answers: { previewState: { single_label: { selected: 'negative' } } },
  history: [
    { action: 'draft_saved', role: 'annotator', actorId: 'kioleemg12', at: '2026-01-01T00:00:00.000Z', summary: '' },
  ],
};

/* Simulates a browser that already ran the OLD (v1) seeder: the v1 marker is
 * present (so today's seedReviewFlowDemo() would short-circuit without an
 * upgrade path), plus the stale dry-05 reviewer entry and the unrelated
 * visitor record above.
 *
 * Guarded by a sessionStorage flag because page.addInitScript() replays on
 * EVERY navigation, including a later page.reload() within the same test
 * (issue #850's lesson) -- without the guard, a reload would re-clobber
 * whatever the app itself already wrote on the first load (e.g. the current
 * marker and the freshly reseeded buckets), making it impossible to observe
 * true reload idempotence. */
async function seedOldBrowser(page: Page) {
  await page.addInitScript(
    ([marker, dry05Key, dry05Entry, visitorKey, visitorEntry]) => {
      if (window.sessionStorage.getItem('e2e-856-old-browser-seeded')) return;
      window.sessionStorage.setItem('e2e-856-old-browser-seeded', '1');
      window.localStorage.setItem(marker, '2026-01-01T00:00:00.000Z');
      window.localStorage.setItem(dry05Key, dry05Entry);
      window.localStorage.setItem(visitorKey, visitorEntry);
    },
    [SEED_MARKER, STALE_DRY05_KEY, JSON.stringify(STALE_DRY05_ENTRY), VISITOR_KEY, JSON.stringify(VISITOR_ENTRY)]
  );
}

async function seedOldBrowserWithOneFailedSeedWrite(page: Page) {
  await page.addInitScript(
    ([marker, dry05Key, dry05Entry, submissionPrefix]) => {
      if (window.sessionStorage.getItem('e2e-856-failed-write-seeded')) return;
      window.sessionStorage.setItem('e2e-856-failed-write-seeded', '1');
      window.localStorage.setItem(marker, '2026-01-01T00:00:00.000Z');
      window.localStorage.setItem(dry05Key, dry05Entry);

      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function setItemWithOneSeedFailure(key: string, value: string): void {
        if (
          key.indexOf(submissionPrefix) === 0 &&
          !window.sessionStorage.getItem('e2e-856-seed-write-failed-once')
        ) {
          window.sessionStorage.setItem('e2e-856-seed-write-failed-once', '1');
          throw new DOMException('simulated seed write failure', 'QuotaExceededError');
        }
        originalSetItem.call(this, key, value);
      };
    },
    [SEED_MARKER, STALE_DRY05_KEY, JSON.stringify(STALE_DRY05_ENTRY), SUBMISSION_PREFIX]
  );
}

async function readDry05CurrentDecision(page: Page): Promise<unknown> {
  return page.evaluate(() => {
    const data = (window as unknown as {
      LabelSuiteAnnotationWorkspaceData: {
        readReviewerSubmissions: (
          taskId: string, runType: string, sampleId: string, identity: { annotatorId: string }
        ) => Array<{ reviewerId: string; answers?: { decisions?: Record<string, unknown> } }>;
      };
    }).LabelSuiteAnnotationWorkspaceData;
    const submissions = data.readReviewerSubmissions('T014', 'dry_run', 'dry-05-pending-review', { annotatorId: 'kioleemg12' });
    return submissions.find((s) => s.reviewerId === 'reviewer_li')?.answers?.decisions?.single_label;
  });
}

/* Sums the exact two counters issue #856 warns a naive marker bump would
 * duplicate -- history events (every submission bucket entry's `history`
 * array, across ALL T014-T016 buckets regardless of role) and arbitration
 * votes (every T014-T016 arbitration item's `votes` array). Deliberately NOT
 * a hardcoded literal: the baseline is measured from a fresh browser in the
 * same test, so this tracks whatever the CURRENT seed table produces. */
async function countReviewFlowDemoState(page: Page) {
  return page.evaluate(
    ({ submissionPrefix, arbitrationPrefix }) => {
      const isT014to16 = (bucketKey: string) => /^T01[4-6]::/.test(bucketKey);
      let historyEvents = 0;
      let submissionBuckets = 0;
      Object.keys(window.localStorage)
        .filter((key) => key.indexOf(submissionPrefix) === 0 && isT014to16(key.slice(submissionPrefix.length)))
        .forEach((key) => {
          submissionBuckets += 1;
          const bucket = JSON.parse(window.localStorage.getItem(key) || '{}');
          Object.values(bucket as Record<string, { history?: unknown[] }>).forEach((entry) => {
            historyEvents += Array.isArray(entry?.history) ? entry.history.length : 0;
          });
        });
      let arbitrationVotes = 0;
      let arbitrationItems = 0;
      Object.keys(window.localStorage)
        .filter((key) => key.indexOf(arbitrationPrefix) === 0 && isT014to16(key.slice(arbitrationPrefix.length)))
        .forEach((key) => {
          arbitrationItems += 1;
          const item = JSON.parse(window.localStorage.getItem(key) || '{}');
          arbitrationVotes += Array.isArray((item as { votes?: unknown[] }).votes)
            ? (item as { votes: unknown[] }).votes.length
            : 0;
        });
      return { historyEvents, submissionBuckets, arbitrationVotes, arbitrationItems };
    },
    { submissionPrefix: SUBMISSION_PREFIX, arbitrationPrefix: ARBITRATION_PREFIX }
  );
}

test.describe('issue #856: review demo seed marker upgrade', () => {
  test('baseline: a fresh browser derives dry-05 reviewer_li as bypass, not reject', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));
    expect(await readDry05CurrentDecision(page)).toBe('bypass');
  });

  test('an old browser holding the v1 marker and a stale reject decision upgrades to the current bypass seed', async ({ page }) => {
    await seedOldBrowser(page);
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));

    expect(await readDry05CurrentDecision(page)).toBe('bypass');
  });

  test('the upgrade bumps the stored marker to the current version', async ({ page }) => {
    await seedOldBrowser(page);
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));

    const markers = await page.evaluate(() =>
      Object.keys(window.localStorage).filter((key) => key.indexOf('labelsuite.reviewFlowDemoSeed.') === 0)
    );
    expect(markers).toContain(SEED_MARKER_PREFIX + 'v5');
  });

  test('the upgrade does not duplicate T014-T016 history events or arbitration votes versus a fresh browser', async ({ page, browser }) => {
    // Baseline: a genuinely fresh context/page, no marker at all -- measured
    // rather than hardcoded, so this test survives future seed-table edits.
    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();
    await freshPage.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));
    const baseline = await countReviewFlowDemoState(freshPage);
    await freshContext.close();
    // Sanity: the seed table does write history events and arbitration
    // votes, so a passing equality below isn't vacuously "both zero".
    expect(baseline.historyEvents).toBeGreaterThan(0);
    expect(baseline.arbitrationVotes).toBeGreaterThan(0);

    // Old browser: v1 marker + stale data already present before the app boots.
    await seedOldBrowser(page);
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));
    const afterUpgrade = await countReviewFlowDemoState(page);

    expect(afterUpgrade).toEqual(baseline);
  });

  test('the unrelated visitor record on a non-T014-T016 task (T001) is untouched by the upgrade', async ({ page }) => {
    await seedOldBrowser(page);
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));

    const visitor = await page.evaluate((key) => window.localStorage.getItem(key), VISITOR_KEY);
    expect(visitor).toBe(JSON.stringify(VISITOR_ENTRY));
  });

  test('a second reload after the upgrade does not reseed again (idempotent)', async ({ page }) => {
    await seedOldBrowser(page);
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));
    const afterUpgrade = await countReviewFlowDemoState(page);
    expect(await readDry05CurrentDecision(page)).toBe('bypass');

    await page.reload();

    const afterReload = await countReviewFlowDemoState(page);
    expect(afterReload).toEqual(afterUpgrade);
    expect(await readDry05CurrentDecision(page)).toBe('bypass');
  });

  test('a failed reseed does not commit v5 and retries on the next load', async ({ page }) => {
    await seedOldBrowserWithOneFailedSeedWrite(page);
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));

    let markers = await page.evaluate(() =>
      Object.keys(window.localStorage).filter((key) => key.indexOf('labelsuite.reviewFlowDemoSeed.') === 0)
    );
    expect(markers).not.toContain(SEED_MARKER_PREFIX + 'v5');
    expect(markers).toContain(SEED_MARKER);

    await page.reload();

    markers = await page.evaluate(() =>
      Object.keys(window.localStorage).filter((key) => key.indexOf('labelsuite.reviewFlowDemoSeed.') === 0)
    );
    expect(markers).toContain(SEED_MARKER_PREFIX + 'v5');
    expect(markers).not.toContain(SEED_MARKER);
    expect(await readDry05CurrentDecision(page)).toBe('bypass');
  });
});
