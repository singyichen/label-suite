/*
 * Issue #1402 (Traceability: specs/task-management/014-task-detail/spec.md
 * FR-010t, AC-3.10): the Overview annotators condition (originally #stopAnnotatorPill, now the
 * `li.next-step-cond[data-cond="annotators"]` row of #nextStepCard, issue #1403) must judge "annotators
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

test.describe('annotators condition row follows active annotator members (issue #1402, retargeted by issue #1403)', () => {
  test('T001 draft (3 active annotators vs min 3) shows the annotators row as met', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_role=project_leader&task_id=T001`);
    const row = page.locator('#nextStepCard li.next-step-cond[data-cond="annotators"]');
    await expect(row).toHaveAttribute('data-status', 'met');
    await expect(row.locator('.next-step-cond-icon')).toHaveText('✓');
    await expect(row).toContainText('3');
  });

  test('disabling an active annotator (active < min) flips the row to unmet and matches the FR-010t gap', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_role=project_leader&task_id=T001`);
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });

    await rerenderOverview(page);
    const row = page.locator('#nextStepCard li.next-step-cond[data-cond="annotators"]');
    await expect(row).toHaveAttribute('data-status', 'met');

    // T001 seed: 3 active annotators vs min 3; disabling one opens a gap of 1.
    await disableMember(page, 'Alex Wang');
    await rerenderOverview(page);

    await expect(row).toHaveAttribute('data-status', 'unmet');
    await expect(row.locator('.next-step-cond-icon')).toHaveText('○');
    await expect(row.locator('.next-step-cond-value')).toContainText('還差 1 位');

    // The FR-010t publish gate agrees with the row. The button is now disabled up front (FR-027(4)), so
    // force the native click through to prove the handler's own check (kept unchanged) reports the same gap.
    const btn = page.locator('#publishDryRunBtn');
    await expect(btn).toBeDisabled();
    await btn.evaluate((el) => {
      (el as HTMLButtonElement).disabled = false;
      (el as HTMLButtonElement).click();
    });
    await expect(page.locator('#toastMsg')).toContainText('標記員還差 1 位');
  });
});
