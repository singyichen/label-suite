/*
 * Traceability: issue #1129 -- `.btn:disabled` must use the shared disabled-state token
 * (opacity 0.4) and stop swallowing pointer events; `.mini-btn:disabled` keeps its own 0.45.
 */
import { test, expect } from '../fixtures';
import { openSettingsSection } from './_task-detail-settings-helpers';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

async function disabledStyle(locator: import('@playwright/test').Locator) {
  return locator.evaluate((el) => {
    const s = getComputedStyle(el);
    return { opacity: s.opacity, pointerEvents: s.pointerEvents, cursor: s.cursor, transform: s.transform };
  });
}

test.describe('Task detail disabled .btn token (#1129)', () => {
  test('settings-tab Edit button, naturally disabled for a published task (T002), uses opacity 0.4 and pointer-events none', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T002&task_role=project_leader&tab=settings`);
    await openSettingsSection(page, 'labeling');
    const editBtn = page.locator('#settingsEditBtn');
    await expect(editBtn).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });
    await expect(editBtn).toBeDisabled();
    await expect(editBtn).toHaveClass(/\bbtn\b/);

    const style = await disabledStyle(editBtn);
    expect.soft(style.opacity).toBe('0.4');
    expect.soft(style.pointerEvents).toBe('none');
    expect(style.cursor).toBe('not-allowed');
    expect(style.transform).toBe('none');
  });

  test('overview publish action .btn, disabled for a reviewer, uses opacity 0.4 and pointer-events none', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T002&task_role=reviewer`);
    const btn = page.locator('#publishActionRow .btn:disabled').first();
    await expect(btn).toBeAttached({ timeout: PANEL_LOAD_TIMEOUT });

    const style = await disabledStyle(btn);
    expect.soft(style.opacity).toBe('0.4');
    expect.soft(style.pointerEvents).toBe('none');
    expect(style.cursor).toBe('not-allowed');
  });

  test('a real .btn forced into :disabled state gets the same token', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T001&task_role=project_leader&tab=settings`);
    await openSettingsSection(page, 'labeling');
    const editBtn = page.locator('#settingsEditBtn');
    await expect(editBtn).toBeEnabled({ timeout: PANEL_LOAD_TIMEOUT });
    await editBtn.evaluate((el) => ((el as HTMLButtonElement).disabled = true));

    const style = await disabledStyle(editBtn);
    expect.soft(style.opacity).toBe('0.4');
    expect.soft(style.pointerEvents).toBe('none');
  });

  test('.mini-btn:disabled keeps opacity 0.45 (out of scope for #1129)', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T002&task_role=project_leader&tab=members`);
    await page.locator('#tabMemberManagement').click();
    const mini = page.locator('.mini-btn').first();
    await expect(mini).toBeAttached({ timeout: PANEL_LOAD_TIMEOUT });
    await mini.evaluate((el) => ((el as HTMLButtonElement).disabled = true));

    const style = await disabledStyle(mini);
    expect(style.opacity).toBe('0.45');
    expect(style.pointerEvents).toBe('none');
    expect(style.cursor).toBe('not-allowed');
  });
});
