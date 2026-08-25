/*
 * Traceability: specs/task-management/010-task-list/spec.md
 *   FR-011b
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   SC-019
 */
import { test, expect } from '@playwright/test';

/* Issue #194: T003 is seeded as an in-progress official run in the
 * dashboard's annotator/reviewer assignment seeds
 * (pages/dashboard/dashboard.assignments.js -- LabelSuiteAssignmentSeeds),
 * but task-list.data.js hardcoded every seed task as status:'draft', so
 * task-list.html and task-detail.html both showed T003 as an untouched
 * draft -- directly contradicting the dashboard. task-list.data.js is the
 * single source of truth both pages render from, so correcting T003's
 * status/runType there fixes both pages at once.
 *
 * Only T003 is corrected: the other 12 seed tasks are relied on as draft
 * baselines by task-detail-stage-flow.spec.ts, task-list-run-materialization
 * .spec.ts, and task-detail-task-profiles.spec.ts, so this fix stays scoped
 * to the one task the issue reports instead of re-deriving status for every
 * seed task.
 *
 * The dashboard's own project-leader widget (dashboard.data.js
 * roleLists.projectLeader) is a separate, independently hardcoded array and
 * is the issue's reported entry point (Dashboard PL view -> task-list ->
 * task-detail), so its T003 entry's runType is corrected from 'dry_run' to
 * 'official_run' too, matching LabelSuiteAssignmentSeeds. */

test.describe('Issue #194: T003 status stays in sync', () => {
  test('dashboard project-leader card shows T003 as an official run, not a dry run', async ({ page }) => {
    await page.goto('/pages/dashboard/dashboard.html');
    await page.locator('.scenario-pill[data-scenario="project_leader"]').click();

    const card = page.locator('#plTaskList [data-example-task-id="T003"]');
    await expect(card).toContainText('正式標記');
    await expect(card).not.toContainText('試標');
  });

  test('task list shows T003 as an in-progress official run, not draft', async ({ page }) => {
    await page.goto('/pages/task-management/task-list.html?task_role=project_leader');

    const row = page.locator(
      '#taskTableBody tr[data-source-file="multi-label-hierarchical.json"]',
    );
    await expect(row).toContainText('正式標記中');
    await expect(row).toContainText('正式標記');
    await expect(row).not.toContainText('草稿');
  });

  test('task detail shows a coherent non-draft state for T003', async ({ page }) => {
    await page.goto('/pages/task-management/task-detail.html?task_id=T003');

    await expect(page.locator('#statusBadge')).toContainText('正式標記進行中');
    await expect(page.locator('#statusStepper .step-current .step-label-wrap')).toHaveText('正式標記中');

    // Editing the label settings is a draft-only action (isSettingsEditable());
    // a non-draft task must not offer it.
    await expect(page.locator('#settingsEditBtn')).toBeDisabled();

    // getTrialRounds() auto-derives one coherent round for any non-draft
    // status once trialRounds is empty (always true right after
    // resetTaskData()) -- no contradictory generic demo history is shown.
    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(1);
  });
});
