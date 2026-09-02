import { test, expect } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

/* Reviewer rows on the annotation list (spec 015 v4.2.0, FR-055).
 *
 * v3.0.0 split this page by run_type: dry_run rendered an expandable
 * multi-annotator comparison, official_run rendered one row per sample with
 * its own approve/reject pair and a toolbar submit. v3.9.0 then defined the
 * review unit as `sample_id × annotator_id × run_type` and v4.0.0 collapsed
 * the workspace onto a single card, which leaves the list as the last place
 * still branching on run_type.
 *
 * v4.2.0 finishes the job: one row IS one review unit. A sample marked by
 * three annotators produces three rows, in BOTH run types, each carrying that
 * annotator's own answer and its own REVIEW_UNIT_STATUS. The expand control
 * is gone (there is nothing left to expand into), and so are the list-level
 * decisions -- the workspace's Bypass row is the single decision surface
 * since FR-053, so a second one here could only contradict it.
 *
 * Stats still reuse the workspace algorithm (annotation-workspace.data.js),
 * so list and workspace numbers can never drift. */

/* T001 ships 5 dataset records and REVIEWER_MOCK_ROWS gives each 3
 * annotators, so the flattened list is 15 units -- one page at pageSize 20.
 *
 * issue #596 (FR-093): a reviewer's list now carries only the units the
 * system assigned to THEM, so 15 is no longer what any one reviewer sees.
 * The default identity is reviewer_wang, and T001's 15 units spread over the
 * 4-strong demo roster give it:
 *   dry_run (per_sample): sent-001 and sent-005 whole -> 6 units, three
 *     annotators each, which is where the per-unit row shape stays visible.
 *   official_run (per_unit): one unit each from sent-001 / sent-002 /
 *     sent-003 / sent-005 -> 4 units, never two from the same sample.
 * The row shape is still identical in both run types -- one row IS one
 * review unit. What differs is which units land on one reviewer, and that
 * is the FR-093 assignment granularity, not a run_type branch in the list. */
const ASSIGNED_UNITS = { dry_run: 6, official_run: 4 } as const;

test.describe('One row per review unit', () => {
  for (const runType of ['dry_run', 'official_run'] as const) {
    test(`${runType}: the reviewer's assigned units render one row each`, async ({ page }) => {
      await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: runType }));

      await expect(page.getByTestId('ws-sample-item')).toHaveCount(ASSIGNED_UNITS[runType]);

      const first = page.getByTestId('ws-sample-item').first();
      await expect(first).toContainText('sent-001');
      await expect(first.getByTestId('list-review-annotator')).toHaveText(
        runType === 'dry_run' ? 'kioleemg12' : '113450022'
      );
    });

    test(`${runType}: pagination counts review units, not samples`, async ({ page }) => {
      await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: runType }));

      await expect(page.locator('#paginationInfo')).toContainText(`共 ${ASSIGNED_UNITS[runType]} 筆`);
    });
  }

  /* dry_run assigns a whole sample to one reviewer, so this is the run type
     where a sample's three units still arrive together and the per-unit row
     shape is observable end to end. */
  test('dry_run: an assigned sample brings all three of its annotators, in order', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'dry_run' }));

    const rows = page.getByTestId('ws-sample-item');
    for (let i = 0; i < 3; i += 1) {
      await expect(rows.nth(i)).toContainText('sent-001');
    }
    await expect(rows.nth(0).getByTestId('list-review-annotator')).toHaveText('kioleemg12');
    await expect(rows.nth(1).getByTestId('list-review-annotator')).toHaveText('113450022');
    await expect(rows.nth(2).getByTestId('list-review-annotator')).toHaveText('tony0950127');
    await expect(rows.nth(3)).toContainText('sent-005');
  });

  /* official_run spreads unit-by-unit, so the same reviewer never holds two
     annotators of one sample -- each row is a different sample, and the
     annotator column is what says which unit of it this row is. */
  test('official_run: per-unit assignment never repeats a sample', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'official_run' }));

    const rows = page.getByTestId('ws-sample-item');
    const expected = [
      ['sent-001', '113450022'],
      ['sent-002', 'kioleemg12'],
      ['sent-003', 'tony0950127'],
      ['sent-005', '113450022'],
    ] as const;
    for (let i = 0; i < expected.length; i += 1) {
      await expect(rows.nth(i)).toContainText(expected[i][0]);
      await expect(rows.nth(i).getByTestId('list-review-annotator')).toHaveText(expected[i][1]);
    }
  });

  test("dry_run: the row shows that annotator's own answer, not the sample's", async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'dry_run' }));

    // sent-001 ships positive / negative / positive.
    const rows = page.getByTestId('ws-sample-item');
    await expect(rows.nth(0).getByTestId('list-review-answer')).toHaveText('positive');
    await expect(rows.nth(1).getByTestId('list-review-answer')).toHaveText('negative');
    await expect(rows.nth(2).getByTestId('list-review-answer')).toHaveText('positive');
  });

  test("official_run: the row shows that annotator's own answer, not the sample's first", async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'official_run' }));

    // sent-001 ships positive / negative / positive; this reviewer holds the
    // 113450022 unit, so the row must read that annotator's 'negative'.
    await expect(
      page.getByTestId('ws-sample-item').first().getByTestId('list-review-answer')
    ).toHaveText('negative');
  });

  test("dry_run: 編輯 opens the workspace addressed to that row's annotator", async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'dry_run' }));

    await page.getByTestId('ws-sample-item').nth(1).getByRole('button', { name: '編輯' }).click();

    await expect(page).toHaveURL(/annotation-workspace\.html/);
    await expect(page).toHaveURL(/sample_id=sent-001/);
    await expect(page).toHaveURL(/run_type=dry_run/);
    await expect(page).toHaveURL(/annotator_id=113450022/);
  });

  test("official_run: 編輯 opens the workspace addressed to that row's annotator", async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'official_run' }));

    await page.getByTestId('ws-sample-item').nth(1).getByRole('button', { name: '編輯' }).click();

    await expect(page).toHaveURL(/annotation-workspace\.html/);
    await expect(page).toHaveURL(/sample_id=sent-002/);
    await expect(page).toHaveURL(/run_type=official_run/);
    await expect(page).toHaveURL(/annotator_id=kioleemg12/);
  });

  test('the retired expand control and detail rows are gone in both run types', async ({ page }) => {
    for (const runType of ['dry_run', 'official_run'] as const) {
      await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: runType }));

      await expect(page.getByTestId('list-review-expand')).toHaveCount(0);
      await expect(page.getByTestId('list-review-annotator-row')).toHaveCount(0);
    }
  });
});

test.describe('Review unit status replaces the annotator completion tri-state', () => {
  test('an unreviewed unit reads 待審', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'dry_run' }));

    await expect(page.getByTestId('ws-sample-item').first().locator('.status-badge')).toHaveText('待審');
  });

  test('the status filter offers every REVIEW_UNIT_STATUS state', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'dry_run' }));

    /* issue #596 (FR-055): the five-state list collapsed onto the three
       review-unit states -- the per-decision 已同意 / 已修改 pair was never a
       unit state. That the menu is DERIVED from REVIEW_UNIT_STATUS rather
       than hardcoded is pinned in issue-596-list-three-status.spec.ts. */
    const options = page.locator('#statusFilter option');
    await expect(options).toHaveCount(4); // all + 3 states
    await expect(options).toHaveText([
      '全部審核狀態', '待審', '爭議中', '已定稿',
    ]);
  });

  test('filtering by a state no unit is in empties the table', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'dry_run' }));

    await page.locator('#statusFilter').selectOption('pending');
    await expect(page.getByTestId('ws-sample-item')).toHaveCount(ASSIGNED_UNITS.dry_run);

    await page.locator('#statusFilter').selectOption('disputed');
    await expect(page.getByTestId('ws-sample-item')).toHaveCount(0);
    await expect(page.locator('#emptyState')).toBeVisible();
  });

  test('the annotator view keeps its own completion tri-state filter', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'annotator', run_type: 'dry_run' }));

    await expect(page.locator('#statusFilter option')).toHaveText([
      '全部完成狀態', '已提交', '已儲存', '待處理',
    ]);
  });
});

test.describe('List-level decisions are retired', () => {
  for (const runType of ['dry_run', 'official_run'] as const) {
    test(`${runType}: no approve/reject on the row and no toolbar submit`, async ({ page }) => {
      await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: runType }));

      await expect(page.getByTestId('list-review-row-approve')).toHaveCount(0);
      await expect(page.getByTestId('list-review-row-reject')).toHaveCount(0);
      await expect(page.locator('#submitReviewBtn')).toHaveCount(0);

      const row = page.getByTestId('ws-sample-item').first();
      await expect(row.getByRole('button', { name: '編輯' })).toBeVisible();
      await expect(row.getByRole('button')).toHaveCount(1);
    });
  }
});

test.describe('Label distribution stats survive as read-only context', () => {
  test('both run types show the column, with the sample stat on each of its units', async ({ page }) => {
    for (const runType of ['dry_run', 'official_run'] as const) {
      await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: runType }));

      await expect(page.locator('#taskTable thead')).toContainText('標記分布統計');
      // Pinned fixture: T001 sent-001 ships positive/negative/positive, and
      // all three of its units report that same cross-annotator distribution.
      /* The distribution is cross-annotator, so it is the same string on
         every unit of sent-001 -- FR-093 only changes how many of those
         units this reviewer holds (all three in dry_run, one in
         official_run). */
      const stats = page.getByTestId('list-review-stats');
      const sent001Units = runType === 'dry_run' ? 3 : 1;
      for (let i = 0; i < sent001Units; i += 1) {
        await expect(stats.nth(i)).toHaveText('positive×2 · negative×1');
      }
    }
  });

  test('multi-output task stats stay prefixed per output type', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T010', role: 'reviewer', run_type: 'dry_run' }));

    const stats = page.getByTestId('list-review-stats').first();
    await expect(stats).toContainText('實體辨識');
    await expect(stats).toContainText('關係識別');
    await expect(stats).toContainText('×');
  });

  test('single_dim stats and per-row deviation colors follow the shared algorithm', async ({ page }) => {
    // T004 read-001 ships scores 4 / 4 / 3 -> mean 3.67, std 0.47; the
    // 3-score row deviates by more than 1std but less than 1.5std (blue).
    await page.goto(buildListUrl({ task_id: 'T004', role: 'reviewer', run_type: 'dry_run' }));

    await expect(page.getByTestId('list-review-stats').first()).toHaveText('mean : 3.67 , std : 0.47');

    const rows = page.getByTestId('ws-sample-item');
    await expect(rows.nth(0).locator('.annotator-result-tag')).toHaveClass(/result-tag-green/);
    await expect(rows.nth(2).locator('.annotator-result-tag')).toHaveClass(/result-tag-blue/);
  });

  test('multi_dim stats keep the legacy multi-line block and bracketed answers', async ({ page }) => {
    // T005 mt-002 ships fluency 3/3/4, adequacy 4/4/4, coherence 3/3/3.
    // issue #596 (FR-093): dry_run assigns whole samples round-robin over the
    // roster, and mt-002 (the second of mt-001..mt-005) lands on reviewer_li,
    // whose list is therefore exactly that sample's three units.
    await page.goto(
      buildListUrl({ task_id: 'T005', role: 'reviewer', run_type: 'dry_run', reviewer_id: 'reviewer_li' })
    );

    const stats = page.getByTestId('list-review-stats').nth(0);
    await expect(stats).toContainText('mean [3.33, 4.00, 3.00]');
    await expect(stats).toContainText('std [0.47, 0.00, 0.00]');
    await expect(stats).toContainText('±1.5std fluency : 2.626~4.040');

    const rows = page.getByTestId('ws-sample-item');
    await expect(rows.nth(0).getByTestId('list-review-answer')).toHaveText('[3, 4, 3]');
  });
});

test.describe('Localization', () => {
  test('English localizes the reviewer columns and the review status filter', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'dry_run' }));

    await page.locator('#langToggle').click();

    const thead = page.locator('#taskTable thead');
    await expect(thead).toContainText('Label Distribution');
    await expect(thead).toContainText('Annotator');
    await expect(thead).toContainText('Review Status');
    await expect(page.locator('#statusFilter option')).toHaveText([
      'All review statuses', 'Pending review', 'Disputed', 'Finalized',
    ]);
  });

  test('the annotator view keeps the original columns and no review controls', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'annotator', run_type: 'dry_run' }));

    await expect(page.locator('#taskTable thead')).not.toContainText('標記分布統計');
    await expect(page.getByTestId('list-review-annotator')).toHaveCount(0);
    await expect(page.locator('#submitReviewBtn')).toHaveCount(0);
  });
});
