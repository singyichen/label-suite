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
 * annotators, so the flattened list is 15 units -- one page at pageSize 20. */
const T001_UNITS = 15;

test.describe('One row per review unit, identical in both run types', () => {
  for (const runType of ['dry_run', 'official_run'] as const) {
    test(`${runType}: 5 samples × 3 annotators renders ${T001_UNITS} rows`, async ({ page }) => {
      await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: runType }));

      await expect(page.getByTestId('ws-sample-item')).toHaveCount(T001_UNITS);

      const first = page.getByTestId('ws-sample-item').first();
      await expect(first).toContainText('sent-001');
      await expect(first.getByTestId('list-review-annotator')).toHaveText('kioleemg12');
    });

    test(`${runType}: consecutive rows carry the same sample and different annotators`, async ({ page }) => {
      await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: runType }));

      const rows = page.getByTestId('ws-sample-item');
      for (let i = 0; i < 3; i += 1) {
        await expect(rows.nth(i)).toContainText('sent-001');
      }
      await expect(rows.nth(0).getByTestId('list-review-annotator')).toHaveText('kioleemg12');
      await expect(rows.nth(1).getByTestId('list-review-annotator')).toHaveText('113450022');
      await expect(rows.nth(2).getByTestId('list-review-annotator')).toHaveText('tony0950127');
      await expect(rows.nth(3)).toContainText('sent-002');
    });

    test(`${runType}: the row shows that annotator's own answer, not the sample's`, async ({ page }) => {
      await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: runType }));

      // sent-001 ships positive / negative / positive.
      const rows = page.getByTestId('ws-sample-item');
      await expect(rows.nth(0).getByTestId('list-review-answer')).toHaveText('positive');
      await expect(rows.nth(1).getByTestId('list-review-answer')).toHaveText('negative');
      await expect(rows.nth(2).getByTestId('list-review-answer')).toHaveText('positive');
    });

    test(`${runType}: 編輯 opens the workspace addressed to that row's annotator`, async ({ page }) => {
      await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: runType }));

      await page.getByTestId('ws-sample-item').nth(1).getByRole('button', { name: '編輯' }).click();

      await expect(page).toHaveURL(/annotation-workspace\.html/);
      await expect(page).toHaveURL(/sample_id=sent-001/);
      await expect(page).toHaveURL(new RegExp(`run_type=${runType}`));
      await expect(page).toHaveURL(/annotator_id=113450022/);
    });

    test(`${runType}: pagination counts review units, not samples`, async ({ page }) => {
      await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: runType }));

      await expect(page.locator('#paginationInfo')).toContainText(`共 ${T001_UNITS} 筆`);
    });
  }

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

    const options = page.locator('#statusFilter option');
    await expect(options).toHaveCount(6); // all + 5 states
    await expect(options).toHaveText([
      '全部審核狀態', '待審', '已同意', '已修改', '爭議中', '已定稿',
    ]);
  });

  test('filtering by a state no unit is in empties the table', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'dry_run' }));

    await page.locator('#statusFilter').selectOption('pending');
    await expect(page.getByTestId('ws-sample-item')).toHaveCount(T001_UNITS);

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
      const stats = page.getByTestId('list-review-stats');
      for (let i = 0; i < 3; i += 1) {
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
    await page.goto(buildListUrl({ task_id: 'T005', role: 'reviewer', run_type: 'dry_run' }));

    // mt-002 is the second sample, so its units start at index 3.
    const stats = page.getByTestId('list-review-stats').nth(3);
    await expect(stats).toContainText('mean [3.33, 4.00, 3.00]');
    await expect(stats).toContainText('std [0.47, 0.00, 0.00]');
    await expect(stats).toContainText('±1.5std fluency : 2.626~4.040');

    const rows = page.getByTestId('ws-sample-item');
    await expect(rows.nth(3).getByTestId('list-review-answer')).toHaveText('[3, 4, 3]');
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
      'All review statuses', 'Pending review', 'Approved', 'Modified', 'Disputed', 'Finalized',
    ]);
  });

  test('the annotator view keeps the original columns and no review controls', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'annotator', run_type: 'dry_run' }));

    await expect(page.locator('#taskTable thead')).not.toContainText('標記分布統計');
    await expect(page.getByTestId('list-review-annotator')).toHaveCount(0);
    await expect(page.locator('#submitReviewBtn')).toHaveCount(0);
  });
});
