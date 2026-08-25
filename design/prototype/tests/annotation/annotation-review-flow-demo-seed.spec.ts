import { test, expect, type Page } from '@playwright/test';
import { buildListUrl, buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* Review-flow demo state seeder (spec 015, review-flow demo Phase 2 slice C).
 *
 * T014-T017's mock rows (slice B) only give the reviewer list a roster; every
 * unit still derives 待審 because nothing is submitted. This file pins the
 * boot-time seeder that stages the full review-flow demo: annotator
 * submissions, reviewer decisions and one arbitration per script, T014-T017
 * ONLY, guarded by the marker key `labelsuite.reviewFlowDemoSeed.v1` so a
 * reload never duplicates history events or refreshes timestamps.
 *
 * Expected status matrix (derived, not stored -- see getReviewUnitStatus):
 *   T014 dry_run  (min=1): dry-01 finalized x3 · dry-02 finalized/disputed/
 *     pending · dry-03 pending/disputed/pending · dry-04 finalized x3 (B via
 *     chen's arbitration) · dry-05 pending x3
 *   T015 official (min=1): finalized · disputed · finalized (arbitrated) ·
 *     pending · (ofs-05 absent)
 *   T016 official (min=3): finalized · approved · modified · finalized
 *     (majority convergence, no arbitration) · disputed (1/1/1 stalemate)
 *   T017 official (min=2): disputed (1:1 tie) · approved · modified ·
 *     finalized · pending
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-051, FR-059, FR-060, FR-061
 */

const SEED_MARKER = 'labelsuite.reviewFlowDemoSeed.v1';

async function expectBadges(page: Page, expected: string[]) {
  const rows = page.getByTestId('ws-sample-item');
  await expect(rows).toHaveCount(expected.length);
  for (let i = 0; i < expected.length; i += 1) {
    await expect(rows.nth(i).locator('.status-badge')).toHaveText(expected[i]);
  }
}

test.describe('T014 dry_run staged states', () => {
  test('the 15 review units derive the scripted five-state spread', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));

    await expectBadges(page, [
      // dry-01-all-agree: wang agreed with all three annotators
      '已定稿', '已定稿', '已定稿',
      // dry-02-one-divergent: A agreed, B changed by wang, C unreviewed
      '已定稿', '爭議中', '待審',
      // dry-03-dispute-open: only B reviewed (changed)
      '待審', '爭議中', '待審',
      // dry-04-dispute-resolved: B's dispute finalized by chen's arbitration
      '已定稿', '已定稿', '已定稿',
      // dry-05-pending-review: submitted, nobody reviewed yet
      '待審', '待審', '待審',
    ]);
  });

  test("dry-04's middle unit is finalized by arbitration, not by agreement", async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));

    const arb = await page.evaluate(() => {
      const data = (window as unknown as {
        LabelSuiteAnnotationWorkspaceData: {
          getArbitrationState: (
            taskId: string, runType: string, sampleId: string,
            identity: { annotatorId: string }
          ) => Record<string, { finalized_value?: unknown; finalized_by?: string }>;
        };
      }).LabelSuiteAnnotationWorkspaceData;
      return data.getArbitrationState('T014', 'dry_run', 'dry-04-dispute-resolved', { annotatorId: '113450022' });
    });
    expect(arb['single_label::single_label']?.finalized_by).toBe('reviewer_chen');
    expect(arb['single_label::single_label']?.finalized_value).toBe('negative');
  });
});

test.describe('T015 official_run single-reviewer staged states', () => {
  test('the four submitted samples derive finalized/disputed/finalized/pending', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T015', role: 'reviewer', run_type: 'official_run' }));

    await expectBadges(page, ['已定稿', '爭議中', '已定稿', '待審']);
  });
});

test.describe('T016 official_run min_reviewers=3 staged states', () => {
  test('quorum thresholds and majority convergence derive the scripted spread', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T016', role: 'reviewer', run_type: 'official_run' }));

    await expectBadges(page, ['已定稿', '已同意', '已修改', '已定稿', '爭議中']);
  });

  test('ofm-04 resolves by reviewer majority, without any arbitration record', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T016', role: 'reviewer', run_type: 'official_run' }));

    const probe = await page.evaluate(() => {
      const data = (window as unknown as {
        LabelSuiteAnnotationWorkspaceData: {
          getDisputeItems: (
            taskId: string, runType: string, sampleId: string,
            identity: { annotatorId: string }, outKeys: string[]
          ) => Array<{ annotatorValue: unknown; reviewerValues: Record<string, unknown> }>;
          resolveDisputeConvergence: (
            item: { annotatorValue: unknown; reviewerValues: Record<string, unknown> },
            reviewerCount: number
          ) => { converged: boolean; value?: unknown };
          getArbitrationState: (
            taskId: string, runType: string, sampleId: string,
            identity: { annotatorId: string }
          ) => Record<string, unknown>;
        };
      }).LabelSuiteAnnotationWorkspaceData;
      const identity = { annotatorId: 'kioleemg12' };
      const items = data.getDisputeItems('T016', 'official_run', 'ofm-04-majority-converged', identity, ['single_label']);
      return {
        convergence: items.length === 1 ? data.resolveDisputeConvergence(items[0], 3) : null,
        arbitration: data.getArbitrationState('T016', 'official_run', 'ofm-04-majority-converged', identity),
      };
    });
    expect(probe.convergence).toEqual({ converged: true, value: 'neutral' });
    expect(probe.arbitration).toEqual({});
  });
});

test.describe('T017 official_run min_reviewers=2 staged states', () => {
  test('the even tie stays disputed while full agreement finalizes', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T017', role: 'reviewer', run_type: 'official_run' }));

    await expectBadges(page, ['爭議中', '已同意', '已修改', '已定稿', '待審']);
  });
});

test.describe('arbitration entries on the staged disputes', () => {
  test('reviewer_chen gets exactly one 仲裁 entry on T017 (the tie)', async ({ page }) => {
    await page.goto(buildListUrl({
      task_id: 'T017', role: 'reviewer', run_type: 'official_run', reviewer_id: 'reviewer_chen',
    }));

    const entry = page.getByTestId('list-arbitrate-entry');
    await expect(entry).toHaveCount(1);
    await expect(entry).toHaveText('仲裁');
  });

  test('reviewer_wang, a dispute participant, never sees 仲裁 on T017', async ({ page }) => {
    await page.goto(buildListUrl({
      task_id: 'T017', role: 'reviewer', run_type: 'official_run', reviewer_id: 'reviewer_wang',
    }));

    await expect(page.getByTestId('ws-sample-item').first()).toBeVisible();
    await expect(page.getByTestId('list-arbitrate-entry')).toHaveCount(0);
  });

  test("reviewer_chen can arbitrate T016's stalemate (wang/li/lin all participated)", async ({ page }) => {
    await page.goto(buildListUrl({
      task_id: 'T016', role: 'reviewer', run_type: 'official_run', reviewer_id: 'reviewer_chen',
    }));

    await expect(page.getByTestId('list-arbitrate-entry')).toHaveCount(1);
  });
});

test.describe('workspace arbitration card on the T017 tie', () => {
  test('chen sees the A/B card with the tied values; wang keeps the plain review card', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({
      task_id: 'T017', sample_id: 'oft-01-even-tie', role: 'reviewer', run_type: 'official_run',
      annotator_id: 'kioleemg12', reviewer_id: 'reviewer_chen',
    }));

    await expect(page.getByTestId('ws-arbitration-card')).toBeVisible();
    const item = page.getByTestId('ws-arbitration-item');
    await expect(item).toHaveCount(1);
    await expect(item.getByTestId('ws-arbitration-choose-a')).toContainText('neutral');
    await expect(item.getByTestId('ws-arbitration-choose-b')).toContainText('positive');

    await page.goto(buildWorkspaceUrl({
      task_id: 'T017', sample_id: 'oft-01-even-tie', role: 'reviewer', run_type: 'official_run',
      annotator_id: 'kioleemg12', reviewer_id: 'reviewer_wang',
    }));
    await expect(page.getByTestId('ws-arbitration-card')).toHaveCount(0);
  });
});

test.describe('seeder idempotence', () => {
  test('a reload neither re-seeds nor mutates the stored demo state', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));

    const readStores = () =>
      page.evaluate((marker) => ({
        marker: window.localStorage.getItem(marker),
        // Submission buckets each live under their own key (issue #283);
        // serialize them all, sorted, so the comparison stays order-stable.
        submissions: Object.keys(window.localStorage)
          .filter((key) => key.indexOf('labelsuite.wsSubmissions.') === 0)
          .sort()
          .map((key) => key + '=' + window.localStorage.getItem(key))
          .join('\n'),
        // Arbitration items each live under their own key too (issue #319);
        // serialize them all, sorted, so the comparison stays order-stable.
        arbitration: Object.keys(window.localStorage)
          .filter((key) => key.indexOf('labelsuite.wsArbitration.') === 0)
          .sort()
          .map((key) => key + '=' + window.localStorage.getItem(key))
          .join('\n'),
      }), SEED_MARKER);

    const first = await readStores();
    expect(first.marker).toBeTruthy();
    // Non-empty guard: with per-bucket/per-item keys, "seeder wrote nothing"
    // would serialize to '' and trivially equal itself across reloads.
    expect(first.submissions).not.toBe('');
    expect(first.arbitration).not.toBe('');

    await page.reload();
    // Timestamps come from `new Date()` at seed time: a second seeding pass
    // (or a duplicated history event) would change the serialized stores.
    const second = await readStores();
    expect(second).toEqual(first);
  });

  test('seeding never touches tasks outside T014-T017', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));

    const foreignKeys = await page.evaluate(() => {
      const submissionBucketKeys = Object.keys(window.localStorage)
        .filter((key) => key.indexOf('labelsuite.wsSubmissions.') === 0)
        .map((key) => key.slice('labelsuite.wsSubmissions.'.length));
      const arbitrationItemKeys = Object.keys(window.localStorage)
        .filter((key) => key.indexOf('labelsuite.wsArbitration.') === 0)
        .map((key) => key.slice('labelsuite.wsArbitration.'.length));
      return submissionBucketKeys
        .concat(arbitrationItemKeys)
        .filter((key) => !/^T01[4-7]::/.test(key));
    });
    expect(foreignKeys).toEqual([]);
  });
});
