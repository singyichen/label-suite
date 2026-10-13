/*
 * Traceability: specs/task-management/014-task-detail/spec.md FR-026 (1); issue #1213.
 *
 * TDD Red. Contract for the settings section navigation (#settingsSectionNav, role=tablist):
 * 1. Home / End on a focused tab select + focus the first (basic) / last (review) section;
 *    arrow keys keep working.
 * 2. Exactly one #settingsSectionStatus: visually hidden yet readable by screen readers
 *    (not display:none / visibility:hidden / [hidden]), aria-live="polite". After every
 *    section switch (click, ArrowRight, Home, End) its text is `已切換到<new section label>`.
 * 3. Focus stays on the newly selected tab; tabpanels, tablist and tabs carry no aria-live.
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

const SECTIONS = [
  { name: '基本資料', slug: 'basic' },
  { name: '標記設定', slug: 'labeling' },
  { name: '標記說明', slug: 'guideline' },
  { name: '抽樣設定', slug: 'sampling' },
  { name: '審核設定', slug: 'review' },
] as const;

async function openSettings(page: Page) {
  await page.goto(`${TASK_DETAIL_URL}?task_id=T001&tab=settings&task_role=project_leader`);
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
  await expect(page.locator('#settingsPanel')).toBeVisible();
}

const tabOf = (page: Page, slug: string) => page.locator(`#settingsTab-${slug}`);

async function expectSelectedAndFocused(page: Page, slug: string) {
  await expect(tabOf(page, slug)).toHaveAttribute('aria-selected', 'true');
  await expect(tabOf(page, slug)).toBeFocused();
  await expect(page.locator('#settingsPanel .settings-section:visible')).toHaveAttribute('data-section', slug);
}

async function expectAnnounced(page: Page, label: string) {
  await expect(page.locator('#settingsSectionStatus')).toHaveText(`已切換到${label}`);
}

test.describe('settings section tabs keyboard + announcement (#1213)', () => {
  test('Home selects and focuses the first section, End the last, from first, middle and last tab', async ({ page }) => {
    await openSettings(page);
    const [first, , middle, , last] = SECTIONS;

    await tabOf(page, middle.slug).click();
    await page.keyboard.press('Home');
    await expectSelectedAndFocused(page, first.slug);

    await page.keyboard.press('End');
    await expectSelectedAndFocused(page, last.slug);

    await page.keyboard.press('Home');
    await expectSelectedAndFocused(page, first.slug);

    await tabOf(page, middle.slug).click();
    await page.keyboard.press('End');
    await expectSelectedAndFocused(page, last.slug);

    // existing arrow behaviour is preserved
    await page.keyboard.press('ArrowLeft');
    await expectSelectedAndFocused(page, 'sampling');
    await page.keyboard.press('ArrowRight');
    await expectSelectedAndFocused(page, 'review');
  });

  test('exactly one visually-hidden aria-live="polite" #settingsSectionStatus exists', async ({ page }) => {
    await openSettings(page);
    const status = page.locator('#settingsSectionStatus');
    await expect(status).toHaveCount(1);
    await expect(status).toHaveAttribute('aria-live', 'polite');
    await expect(status).not.toHaveAttribute('hidden', /.*/);
    const style = await status.evaluate((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { display: cs.display, visibility: cs.visibility, width: r.width, height: r.height };
    });
    expect(style.display).not.toBe('none');
    expect(style.visibility).not.toBe('hidden');
    // visually hidden: collapsed to (at most) a 1px box rather than laid out visibly
    expect(style.width).toBeLessThanOrEqual(1);
    expect(style.height).toBeLessThanOrEqual(1);
  });

  test('status announces 已切換到<label> after click, ArrowRight, Home and End', async ({ page }) => {
    await openSettings(page);

    await tabOf(page, 'review').click();
    await expectAnnounced(page, '審核設定');

    await page.keyboard.press('Home');
    await expectAnnounced(page, '基本資料');

    await page.keyboard.press('ArrowRight');
    await expectAnnounced(page, '標記設定');

    await page.keyboard.press('End');
    await expectAnnounced(page, '審核設定');

    await tabOf(page, 'guideline').click();
    await expectAnnounced(page, '標記說明');
  });

  test('focus stays on the selected tab and only the status element is a live region', async ({ page }) => {
    await openSettings(page);
    await tabOf(page, 'labeling').click();
    await page.keyboard.press('End');
    await expect(page.locator('#settingsSectionStatus')).toHaveText('已切換到審核設定');
    await expect(page.locator('#settingsTab-review')).toBeFocused();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('settingsTab-review');

    await expect(page.locator('#settingsPanel .settings-section[aria-live]')).toHaveCount(0);
    await expect(page.locator('#settingsSectionNav[aria-live]')).toHaveCount(0);
    await expect(page.locator('#settingsSectionNav [role="tab"][aria-live]')).toHaveCount(0);
  });
});
