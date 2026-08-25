import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, patchDataFile } from './_workspace-helpers';

/* Issue #195 / F-11 (WCAG 2.1 AA 2.4.3): role="dialog" modals never moved
 * keyboard focus -- open didn't move focus in, Tab wasn't trapped, and
 * close never returned focus to the trigger. These specs implement the
 * A11Y-01 acceptance scenario from
 * docs/product/e2e/issue-180/phase3-drafts/w6-resilience-a11y.md
 * (#wsGuidelineModal), now enabled by the shared LabelSuiteModalFocus
 * helper (pages/shared/modal-focus.js) wired into this workspace's modals.
 *
 * A11Y-02 (#riskModal / #deleteTaskModal in task-management pages) is
 * deferred to a follow-up PR -- see issue #195 PR discussion for the
 * single-purpose / file-count split rationale.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-066, FR-020A, AC-5.3
 */

test.describe('Guideline modal keyboard focus management (A11Y-01)', () => {
  test.beforeEach(async ({ page }) => {
    // None of the 13 illustrative seeds set forceShowGuideline (issue #184
    // precedent); stub it at runtime rather than editing a fixture file.
    await patchDataFile(
      page,
      'task-detail.data.js',
      `window.LabelSuiteTaskDetailData.profiles.T001.forceShowGuideline = true;`
    );
  });

  test('focus moves to the first interactive element when the modal opens', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));

    await expect(page.getByTestId('ws-guideline-modal')).toBeVisible();
    await expect(page.getByTestId('ws-guideline-modal-confirm')).toBeFocused();
  });

  test('Tab and Shift+Tab stay trapped inside the modal', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));

    const confirmBtn = page.getByTestId('ws-guideline-modal-confirm');
    await expect(confirmBtn).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(confirmBtn).toBeFocused();
    await expect(page.getByTestId('lang-toggle')).not.toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(confirmBtn).toBeFocused();
  });

  test('Escape closes the modal and returns focus to the workspace root', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));

    const modal = page.getByTestId('ws-guideline-modal');
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(modal).toBeHidden();
    await expect(page.getByTestId('ws-root')).toBeFocused();
  });

  test('confirming the modal returns focus to the workspace root', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));

    const modal = page.getByTestId('ws-guideline-modal');
    await modal.getByTestId('ws-guideline-modal-confirm').click();

    await expect(modal).toBeHidden();
    await expect(page.getByTestId('ws-root')).toBeFocused();
  });
});

test.describe('Guideline image preview modal keyboard focus management', () => {
  test('focus moves in on open and returns to the triggering file item on close', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
    await dismissGuidelineModal(page);

    const trigger = page.getByTestId('ws-guideline-file-item').first();
    await trigger.click();

    const imageModal = page.getByTestId('ws-guideline-image-modal');
    await expect(imageModal).toBeVisible();
    await expect(page.getByTestId('ws-guideline-image-modal-close')).toBeFocused();

    await page.keyboard.press('Escape');

    await expect(imageModal).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});
