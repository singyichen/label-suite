import { test, expect } from '@playwright/test';

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
    await page.goto('/pages/annotation/annotation-list.html?role=annotator&task_id=TASK-015-A2&run_type=dry_run&task_type=single_sentence_va_scoring');

    await expect(page.locator('#taskInfoCard')).toContainText('試標回合 R2');
    await expect(page.locator('#taskInfoCard')).toContainText('本回合清單 10 筆');
    await expect(page.locator('#sampleRows tr')).toHaveCount(5);
  });

  test('workspace sample list keeps the same dry-run round context', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-workspace.html?role=annotator&task_id=TASK-015-A2&run_type=dry_run&task_type=single_sentence_va_scoring&sample_id=A2-001');

    await expect(page.locator('#sampleListTitle')).toHaveText('標記清單 · 試標回合 R2');
    await expect(page.locator('#sampleListCount')).toHaveText('10 筆');
    await expect(page.locator('#sampleList .sample-item')).toHaveCount(5);
  });

  test('annotation list respects a materialized zero-count context', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-list.html?role=annotator&task_id=TASK-015-A2&run_type=dry_run&task_type=single_sentence_va_scoring');

    await page.evaluate(() => {
      type AnnotationListWindow = Window & {
        MATERIALIZED_RUN_CONTEXT: Record<string, { round: number | null; total: number }>;
        parseContext: () => { role: string; runType: string; taskId: string; taskType: string; subType: string };
        renderTaskInfo: (context: { role: string; runType: string; taskId: string; taskType: string; subType: string }) => void;
      };
      const annotationWindow = window as unknown as AnnotationListWindow;
      annotationWindow.MATERIALIZED_RUN_CONTEXT['TASK-015-A2'].total = 0;
      annotationWindow.renderTaskInfo(annotationWindow.parseContext());
    });

    await expect(page.locator('#taskInfoCard')).toContainText('本回合清單 0 筆');
  });

  test('workspace sample list respects a materialized zero-count context', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-workspace.html?role=annotator&task_id=TASK-015-A2&run_type=dry_run&task_type=single_sentence_va_scoring&sample_id=A2-001');

    await page.evaluate(() => {
      type AnnotationWorkspaceWindow = Window & {
        MATERIALIZED_RUN_CONTEXT: Record<string, { round: number | null; total: number }>;
        renderSampleListHeader: () => void;
      };
      const workspaceWindow = window as unknown as AnnotationWorkspaceWindow;
      workspaceWindow.MATERIALIZED_RUN_CONTEXT['TASK-015-A2'].total = 0;
      workspaceWindow.renderSampleListHeader();
    });

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
