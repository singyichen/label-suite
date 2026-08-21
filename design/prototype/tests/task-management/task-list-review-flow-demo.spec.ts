import { expect, test } from '@playwright/test';

const TASK_LIST_URL =
  '/pages/task-management/task-list.html?task_role=super_admin';
const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

/* Review-flow demo seeds (T014-T017): four single_label sentiment tasks
   built from docs/product/task-configs/review-flow-*.json +
   docs/product/example-data/review-flow-*.json. T014 exercises the dry_run
   consensus path; T015-T017 exercise official_run reviewer variants. */
const DEMO_TASKS = [
  {
    id: 'T014',
    sourceFile: 'review-flow-dry-run.json',
    nameZh: '審核流程示範：試標',
    runBadge: '試標',
    runBadgeClass: '.badge-dry-run',
    statusBadge: '試標進行中',
  },
  {
    id: 'T015',
    sourceFile: 'review-flow-official-single.json',
    nameZh: '審核流程示範：正式標記（單一審核員）',
    runBadge: '正式標記',
    runBadgeClass: '.badge-official',
    statusBadge: '正式標記中',
  },
  {
    id: 'T016',
    sourceFile: 'review-flow-official-multi.json',
    nameZh: '審核流程示範：正式標記（三審核員多數決）',
    runBadge: '正式標記',
    runBadgeClass: '.badge-official',
    statusBadge: '正式標記中',
  },
  {
    id: 'T017',
    sourceFile: 'review-flow-official-tie.json',
    nameZh: '審核流程示範：正式標記（雙審核員平手）',
    runBadge: '正式標記',
    runBadgeClass: '.badge-official',
    statusBadge: '正式標記中',
  },
];

test.describe('Review-flow demo seeds (T014-T017)', () => {
  test('renders every demo row with source file, run badge, and status', async ({
    page,
  }) => {
    await page.goto(TASK_LIST_URL);

    for (const task of DEMO_TASKS) {
      const row = page.locator(
        `#taskTableBody tr[data-source-file="${task.sourceFile}"]`,
      );
      await expect(row).toBeVisible();
      await expect(row).toContainText(task.nameZh);
      await expect(row.locator('.output-type-tag')).toHaveText(['單一標籤']);
      await expect(row.locator(task.runBadgeClass)).toHaveText(task.runBadge);
      await expect(row).toContainText(task.statusBadge);
    }
  });

  test('resolves the T014 task-detail profile with 5 records and single_label outputs', async ({
    page,
  }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T014`);

    await expect(page.locator('#bcCurrent')).toHaveText('審核流程示範：試標', {
      timeout: PANEL_LOAD_TIMEOUT,
    });
    await expect(page.locator('#valueTaskType')).toHaveText('單一標籤');
    await expect(page.locator('#valueDatasetSummary')).toHaveText('5 筆');
    await expect(page.locator('#settingsConfigView')).toContainText(
      'positive, neutral, negative',
    );
    await expect(
      page.locator('#settingsConfigDynamicRows .kv-dl-row'),
    ).toHaveCount(1);
  });
});
