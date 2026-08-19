import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, patchDataFile } from './_workspace-helpers';

/* Issue #184: the first-visit guideline gate modal was hollow --
 * (1) it rendered no guideline content, and (2) its "seen" flag was a
 * single GLOBAL localStorage key, never keyed by task and never gated by
 * the task's own "開始標記前強制顯示" setting
 * (task-detail.panels/overview.html #editForceGuidelineToggle ->
 * TaskProfile.forceShowGuideline). None of the 13 illustrative seeds set
 * forceShowGuideline, so these tests stub it at runtime via
 * patchDataFile() -- never edits a file under pages/. */

test.describe('Guideline gate modal (issue #184)', () => {
  test('force-show task renders the task guideline text on first entry', async ({ page }) => {
    await patchDataFile(
      page,
      'task-detail.data.js',
      `window.LabelSuiteTaskDetailData.profiles.T001.forceShowGuideline = true;`
    );

    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));

    const modal = page.getByTestId('ws-guideline-modal');
    await expect(modal).toBeVisible();
    // Same data source as the right-side 說明 tab: guidelineFiles[]'s
    // markdown entry content (task-detail.data.js DEFAULT_GUIDELINE_FILES).
    await expect(page.getByTestId('ws-guideline-modal-body')).toContainText('如何開始標記');
  });

  test('confirming the modal for task A does not suppress it for task B', async ({ page }) => {
    await patchDataFile(
      page,
      'task-detail.data.js',
      `window.LabelSuiteTaskDetailData.profiles.T001.forceShowGuideline = true;
       window.LabelSuiteTaskDetailData.profiles.T002.forceShowGuideline = true;`
    );

    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
    const modal = page.getByTestId('ws-guideline-modal');
    await expect(modal).toBeVisible();
    await page.getByTestId('ws-guideline-modal-confirm').click();
    await expect(modal).toBeHidden();

    await page.goto(buildWorkspaceUrl({ task_id: 'T002', sample_id: 'emo-001' }));
    await expect(modal).toBeVisible();
  });

  test('a task without force-show enabled never shows the modal', async ({ page }) => {
    // T003's seed profile has no forceShowGuideline flag at all -- default
    // false, no patch applied.
    await page.goto(buildWorkspaceUrl({ task_id: 'T003', sample_id: 'taxonomy-001' }));

    await expect(page.getByTestId('ws-guideline-modal')).toBeHidden();
  });
});
