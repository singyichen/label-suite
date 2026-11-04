/*
 * Traceability: specs/task-management/014-task-detail/spec.md FR-026 (1), FR-019 (section param); issue #1212.
 *
 * TDD Red (refactor, no spec change). Contract: every `.settings-section` panel in
 * task-detail.panels/settings.html carries `data-section="<slug>"`, and the section nav
 * looks panels up by that key -- not by DOM order (`panels[index]`).
 *
 * The panel fragment is intercepted and its five sections are reversed, so any
 * order-based matching shows the wrong panel for a given tab.
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

const SECTIONS = [
  { name: '基本資料', slug: 'basic', titleId: 'basicInfoTitle' },
  { name: '標記設定', slug: 'labeling', titleId: 'settingsSummaryTitle' },
  { name: '標記說明', slug: 'guideline', titleId: 'guidelineSectionTitle' },
  { name: '抽樣設定', slug: 'sampling', titleId: 'samplingTitle' },
  { name: '審核設定', slug: 'review', titleId: 'reviewSettingsTitle' },
] as const;

const SECTION_BLOCK = /<section class="panel settings-section"[\s\S]*?\n {2}<\/section>\n/g;

/** Serve settings.html with its five sections in reverse DOM order (content unchanged). */
async function reverseSettingsSections(page: Page) {
  await page.route('**/task-detail.panels/settings.html*', async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    const blocks = html.match(SECTION_BLOCK) ?? [];
    expect(blocks, 'settings.html should contain five .settings-section blocks').toHaveLength(5);
    const reversed = [...blocks].reverse();
    let i = 0;
    const body = html.replace(SECTION_BLOCK, () => reversed[i++]);
    await route.fulfill({ response, body });
  });
}

async function openSettings(page: Page, query = '') {
  await reverseSettingsSections(page);
  await page.goto(`${TASK_DETAIL_URL}?task_id=T001&tab=settings&task_role=project_leader${query}`);
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
  await expect(page.locator('#settingsPanel')).toBeVisible();
}

const panelOf = (page: Page, titleId: string) =>
  page.locator('#settingsPanel .settings-section').filter({ has: page.locator(`#${titleId}`) });

async function expectOnlyVisible(page: Page, slug: string, titleId: string) {
  const visible = page.locator('#settingsPanel .settings-section:visible');
  await expect(visible).toHaveCount(1);
  await expect(visible.locator(`#${titleId}`)).toBeVisible();
  await expect(visible).toHaveAttribute('data-section', slug);
}

test.describe('settings sections are keyed by data-section, not DOM order (#1212)', () => {
  test('every panel carries data-section matching its slug (even when DOM order is reversed)', async ({ page }) => {
    await openSettings(page);
    await expect(page.locator('#settingsPanel .settings-section')).toHaveCount(5);
    for (const s of SECTIONS) {
      await expect(panelOf(page, s.titleId)).toHaveAttribute('data-section', s.slug);
    }
  });

  test('clicking each nav tab shows the panel with the matching data-section and hides the others', async ({ page }) => {
    await openSettings(page);
    const nav = page.locator('#settingsSectionNav');
    for (const s of SECTIONS) {
      await nav.getByRole('tab', { name: s.name, exact: true }).click();
      await expectOnlyVisible(page, s.slug, s.titleId);
    }
  });

  test('?section=review restores the review panel', async ({ page }) => {
    await openSettings(page, '&section=review');
    await expect(page.locator('#settingsSectionNav').getByRole('tab', { name: '審核設定', exact: true }))
      .toHaveAttribute('aria-selected', 'true');
    await expectOnlyVisible(page, 'review', 'reviewSettingsTitle');
  });
});
