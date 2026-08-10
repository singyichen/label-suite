import { test, expect } from '@playwright/test';
import { buildListUrl, buildWorkspaceUrl, patchDataFile, skipGuidelineModal } from '../annotation/_workspace-helpers';

/* Materialized run context (spec 015): annotation list / workspace counts
 * come from task-detail run publish events (TaskProfile.materializedRuns),
 * not raw dataset size. T004 seeds a dry_run round R2 with a materialized
 * 10-item list while shipping 5 prototype records. The workspace column
 * title must stay a fixed 標記清單 with no run label suffix. */

test.describe('Run materialization cues', () => {
  test('draft task rows show that no annotation list has been created yet', async ({ page }) => {
    await page.goto('/pages/task-management/task-list.html?task_role=project_leader');

    const row = page.locator(
      '#taskTableBody tr[data-source-file="single-label.json"]',
    );
    await expect(row).toContainText('草稿');
    await expect(row).toContainText('未建立清單');
    await expect(row).not.toContainText('正式標記');
  });

  test('annotation list exposes the materialized dry-run round context', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T004', role: 'annotator', run_type: 'dry_run' }));

    const infoCard = page.getByTestId('list-task-info-card');
    await expect(infoCard).toContainText('試標回合 R2');
    await expect(infoCard).toContainText('共 10 筆資料');
    // Rendered rows stay the seed subset, not the materialized total.
    await expect(page.getByTestId('ws-sample-item')).toHaveCount(5);
  });

  test('workspace sample list keeps the materialized count but no run label in the title', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T004', sample_id: 'read-001', run_type: 'dry_run' }));

    // Spec 015: the column title is a fixed 標記清單 -- run labels such as
    // 試標回合 R{n} are forbidden there; only the count follows the
    // materialized run context.
    await expect(page.locator('#sampleListTitle')).not.toContainText('試標回合');
    await expect(page.locator('#sampleListCount')).toHaveText('10 筆');
    await expect(page.getByTestId('ws-sample-item')).toHaveCount(5);
  });

  test('annotation list respects a materialized zero-count context', async ({ page }) => {
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T004.materializedRuns.dry_run.total = 0;
    `);
    await page.goto(buildListUrl({ task_id: 'T004', role: 'annotator', run_type: 'dry_run' }));

    await expect(page.getByTestId('list-task-info-card')).toContainText('共 0 筆資料');
  });

  test('workspace sample list respects a materialized zero-count context', async ({ page }) => {
    await skipGuidelineModal(page);
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T004.materializedRuns.dry_run.total = 0;
    `);
    await page.goto(buildWorkspaceUrl({ task_id: 'T004', sample_id: 'read-001', run_type: 'dry_run' }));

    await expect(page.locator('#sampleListCount')).toHaveText('0 筆');
  });
});

test.describe('Task list clarified behavior', () => {
  test('delete action is only available to leaders/admins on draft tasks', async ({ page }) => {
    await page.goto('/pages/task-management/task-list.html?task_role=project_leader');

    const draftRow = page.locator(
      '#taskTableBody tr[data-source-file="single-label.json"]',
    );
    await expect(draftRow.getByRole('button', { name: '刪除' })).toBeVisible();

    // All seed tasks are draft baselines now, so a non-draft row is injected
    // at runtime to keep this scenario alive.
    await page.evaluate(() => {
      type TaskListWindow = Window & {
        TASKS: Array<Record<string, unknown>>;
        render: () => void;
      };
      const taskListWindow = window as unknown as TaskListWindow;
      taskListWindow.TASKS.push({
        id: 'EX-NONDRAFT',
        nameZh: '非草稿示例任務',
        nameEn: 'Non-draft example task',
        sourceFile: 'synthetic-non-draft.json',
        outputTypes: ['single_label'],
        runType: 'official_run',
        status: 'official_run_in_progress',
        updatedAt: '2026-07-29',
        canViewDetail: true,
        isMine: true,
        deletedAt: '',
      });
      taskListWindow.render();
    });

    const inProgressRow = page.locator(
      '#taskTableBody tr[data-source-file="synthetic-non-draft.json"]',
    );
    await expect(inProgressRow.getByRole('button', { name: '刪除' })).toHaveCount(0);

    await page.goto('/pages/task-management/task-list.html');
    const userDraftRow = page.locator(
      '#taskTableBody tr[data-source-file="single-label.json"]',
    );
    await expect(userDraftRow.getByRole('button', { name: '刪除' })).toHaveCount(0);
  });

  test('invalid query values are normalized out of the URL', async ({ page }) => {
    await page.goto('/pages/task-management/task-list.html?output_type=bad_type&run_stage=bad_stage&status=bad_status&limit=999&offset=-1');

    await expect(page).toHaveURL(/task-list\.html$/);
    await expect(page.locator('#outputTypeFilter')).toHaveValue('');
    await expect(page.locator('#runTypeFilter')).toHaveValue('');
    await expect(page.locator('#statusFilter')).toHaveValue('');
    await expect(page.locator('#pageSizeSelect')).toHaveValue('20');
  });

  test('load failure keeps the table header and shows retry action', async ({ page }) => {
    await page.goto('/pages/task-management/task-list.html?view=error');

    await expect(page.locator('#thTaskName')).toBeVisible();
    const errorRow = page.locator('#taskTableBody tr.error-row');
    await expect(errorRow).toContainText('任務列表載入失敗');
    await expect(errorRow.getByRole('button', { name: '重試' })).toBeVisible();
  });
});
