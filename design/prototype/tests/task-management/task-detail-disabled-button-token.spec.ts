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

  /* #1348: the publish action area uses a neutral disabled style (opacity 1, grey
     background, dashed border) scoped to #publishActionRow; the site-wide token is unchanged. */
  test('overview publish action .btn, disabled for a reviewer, uses the neutral action-area style (#1348)', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T002&task_role=reviewer`);
    const btn = page.locator('#publishActionRow .btn:disabled').first();
    await expect(btn).toBeAttached({ timeout: PANEL_LOAD_TIMEOUT });

    const style = await disabledStyle(btn);
    expect.soft(style.opacity).toBe('1');
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

  test('reviewer disabled CTA stays hoverable for its tooltip (AC-3.72): hit element or ancestor carries the button title', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T002&task_role=reviewer`);
    const btn = page.locator('#publishActionRow .btn:disabled').first();
    await expect(btn).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    await btn.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const result = await btn.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      const row = document.getElementById('publishActionRow');
      const buttonTitle = el.getAttribute('title') || '';
      const titles: string[] = [];
      for (let n: Element | null = hit; n && n !== row; n = n.parentElement) {
        titles.push(n.getAttribute('title') || '');
      }
      return { buttonTitle, hitTag: hit ? hit.tagName : null, titles };
    });

    expect(result.buttonTitle).not.toBe('');
    expect(result.titles, `elementFromPoint hit <${result.hitTag}> without the tooltip title`).toContain(result.buttonTitle);
  });
});
