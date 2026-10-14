/*
 * Issue #1402 (Traceability: specs/task-management/014-task-detail/spec.md
 * FR-010t, AC-3.10): the Overview #stopAnnotatorPill must judge "annotators
 * >= min" from the same derivation the FR-010t publish gate uses -- the count
 * of active annotator members (membership_status = active, task_role =
 * annotator) -- not from TASK_DATA.currentAnnotators, which
 * resetRunProgressData() nulls (so the pill always read "unmet").
 * The submitted-annotator count of computeIaaAlpha() has different semantics
 * and must not be used.
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

async function disableMember(page: Page, name: string) {
  await page.locator('#tabMemberManagement').click();
  await expect(page.locator('#memberManagementPanel')).not.toHaveClass(/hidden/);
  const row = page.locator('#memberTableBody tr').filter({ hasText: name });
  await row.locator('button:has-text("停用")').click();
  await page.locator('#memberActionConfirmBtn').click();
  await expect(row).toContainText('停用');
}

/* Member management does not re-render the overview itself; applyLang does. */
async function rerenderOverview(page: Page) {
  await page.locator('#tabOverview').click();
  await expect(page.locator('#overviewPanel')).not.toHaveClass(/hidden/);
  await page.evaluate(() => (window as any).applyLang('en'));
  await page.evaluate(() => (window as any).applyLang('zh'));
}

test.describe('annotator stop pill follows active annotator members (issue #1402)', () => {
  test('T014 (3 active annotators vs min 3) shows the annotator pill as met', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_role=project_leader&task_id=T014`);
    const pill = page.locator('#stopAnnotatorPill');
    await expect(pill).toContainText('標記者 ≥ 3');
    await expect(pill).toHaveClass(/\bpassed\b/);
    await expect(pill.locator('[data-stop-pill-cue]')).toHaveAttribute('data-state', 'met');
    await expect(pill.locator('.stop-pill-state')).toHaveText('已達標');
  });

  test('disabling an active annotator (active < min) flips the pill to unmet and matches the FR-010t gap', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_role=project_leader&task_id=T001`);
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });

    await rerenderOverview(page);
    const pill = page.locator('#stopAnnotatorPill');
    await expect(pill).toHaveClass(/\bpassed\b/);

    // T001 seed: 3 active annotators vs min 3; disabling one opens a gap of 1.
    await disableMember(page, 'Alex Wang');
    await rerenderOverview(page);

    await expect(pill).not.toHaveClass(/\bpassed\b/);
    await expect(pill.locator('[data-stop-pill-cue]')).toHaveAttribute('data-state', 'unmet');
    await expect(pill.locator('.stop-pill-state')).toHaveText('未達標');

    // The FR-010t publish gate agrees with the pill.
    await page.locator('#publishDryRunBtn').click();
    await expect(page.locator('#toastMsg')).toContainText('標記員還差 1 位');
  });
});
