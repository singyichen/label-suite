/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-014 (guideline settings editability), FR-017a, SC-011, AC-3.43
 * Issue #1285 — TDD Red.
 *
 * Defect: isGuidelineEditable() only allows `draft`. Canonical contract: an active
 * project_leader in `waiting_iaa_confirmation` can edit and save ONLY the four
 * GUIDELINE_CONTENT_FIELDS (annotator/reviewer guideline text + assets) in the guideline
 * settings section. `force_guideline` stays draft-only; every other non-draft stage stays
 * fully disabled with the read-only "left draft" hint; reviewer has no edit button.
 * The prototype does not model guideline versions, so versioning is not tested here.
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { openSettingsSection } from './_task-detail-settings-helpers';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;
const WAITING_TASK = 'T002'; // waiting_iaa_confirmation
const DRAFT_TASK = 'T001';

async function openGuideline(page: Page, opts: { taskId: string; role: string; status?: string }) {
  const status = opts.status ? `&status=${opts.status}` : '';
  await page.addInitScript(() => window.localStorage.setItem('labelsuite.lang', 'zh'));
  await page.goto(`${TASK_DETAIL_URL}?task_id=${opts.taskId}&task_role=${opts.role}&tab=settings${status}`);
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
  await openSettingsSection(page, 'guideline');
}

test.describe('Guideline editable in waiting_iaa_confirmation (issue #1285)', () => {
  test('project_leader on T002 (waiting) can edit and save annotator/reviewer guideline text', async ({ page }) => {
    await openGuideline(page, { taskId: WAITING_TASK, role: 'project_leader' });

    await expect(page.locator('#guidelineEditBtn')).toBeEnabled();
    await expect(page.locator('#guidelineReadonlyHint')).toBeHidden();
    await expect(page.locator('#guidelineReadonlyHint')).toHaveText('');

    await page.locator('#guidelineEditBtn').click();
    await expect(page.locator('#guidelineEditForm')).not.toHaveClass(/hidden/);

    await page.locator('#editAnnotatorGuidelineTextInput').fill('issue-1285 annotator guideline text');
    await page.locator('#editReviewerGuidelineTextInput').fill('issue-1285 reviewer guideline text');
    await page.locator('#guidelineSaveBtn').click();

    await expect(page.locator('#toast')).toContainText('標記說明已更新');
    await expect(page.locator('#guidelineSummaryView')).not.toHaveClass(/hidden/);
    await expect(page.locator('#guidelineSummaryView')).toContainText('issue-1285 annotator guideline text');
    await expect(page.locator('#guidelineSummaryView')).toContainText('issue-1285 reviewer guideline text');
  });

  test('force_guideline toggle stays disabled (draft-only) while editing in waiting', async ({ page }) => {
    await openGuideline(page, { taskId: WAITING_TASK, role: 'project_leader' });
    await page.locator('#guidelineEditBtn').click();
    await expect(page.locator('#guidelineEditForm')).not.toHaveClass(/hidden/);
    await expect(page.locator('#editForceGuidelineToggle')).toBeDisabled();
    // the content fields stay editable in the same form
    await expect(page.locator('#editAnnotatorGuidelineTextInput')).toBeEnabled();
    await expect(page.locator('#editReviewerGuidelineTextInput')).toBeEnabled();
  });
});

test.describe('Guards that must stay green (issue #1285)', () => {
  for (const status of ['dry_run_in_progress', 'official_run_in_progress', 'completed']) {
    test(`project_leader on ${status} keeps the guideline edit button disabled with the left-draft hint`, async ({ page }) => {
      await openGuideline(page, { taskId: WAITING_TASK, role: 'project_leader', status });
      await expect(page.locator('#guidelineEditBtn')).toBeVisible();
      await expect(page.locator('#guidelineEditBtn')).toBeDisabled();
      const hint = page.locator('#guidelineReadonlyHint');
      await expect(hint).toBeVisible();
      await expect(hint).toContainText('草稿');
    });
  }

  test('reviewer on T002 (waiting) has no guideline edit button', async ({ page }) => {
    await openGuideline(page, { taskId: WAITING_TASK, role: 'reviewer' });
    await expect(page.locator('#guidelineEditBtn')).toHaveCount(0);
  });

  test('project_leader on T001 (draft) can edit and the force_guideline toggle is enabled', async ({ page }) => {
    await openGuideline(page, { taskId: DRAFT_TASK, role: 'project_leader' });
    await expect(page.locator('#guidelineEditBtn')).toBeEnabled();
    await expect(page.locator('#guidelineReadonlyHint')).toBeHidden();
    await page.locator('#guidelineEditBtn').click();
    await expect(page.locator('#guidelineEditForm')).not.toHaveClass(/hidden/);
    await expect(page.locator('#editForceGuidelineToggle')).toBeEnabled();
  });
});
