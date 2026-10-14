/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-014l (issue #1375)
 *
 * Regression: the post-skeleton renderOverview() (setTimeout 560ms in
 * showOverviewWithSkeleton) re-runs renderSettingsEditState(), which rebuilds the
 * item-pair label inputs via renderSchemaFields(). If the user is already in
 * settings edit and focused in a label input, the late re-render destroys the
 * focused node, so focus and keystrokes are lost.
 *
 * Deterministic: the skeleton is awaited first, then renderOverview() is called
 * explicitly to stand in for the late re-render (a real page code path).
 */
import { test, expect } from '../fixtures';
import { openSettingsSection } from './_task-detail-settings-helpers';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html?task_role=project_leader&task_id=T011';
const PANEL_LOAD_TIMEOUT = 15000;

test.describe('Task detail: settings edit survives a re-render (#1375)', () => {
  test('a renderOverview() re-render keeps the focused item-pair label input intact', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await expect(page.locator('#loadingSkeleton')).toBeHidden();
    await openSettingsSection(page, 'labeling');
    await expect(page.locator('#statusBadge')).toContainText('草稿', { timeout: PANEL_LOAD_TIMEOUT });
    await page.locator('#settingsEditBtn').click();

    const input = page.getByTestId('item-pair-label-input-1');
    await input.click();
    const handle = await input.elementHandle();
    expect(handle).not.toBeNull();

    await page.evaluate(() => (window as unknown as { renderOverview: () => void }).renderOverview());

    expect(await handle!.evaluate((n) => n.isConnected)).toBe(true);
    expect(await handle!.evaluate((n) => n === document.activeElement)).toBe(true);

    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('前提');
    await expect(page.getByTestId('item-pair-label-input-1')).toHaveValue('前提');
  });
});
