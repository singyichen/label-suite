/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-026 (1)(2)(5)(6), FR-019 (section param), FR-006, FR-003
 *   (openspec/changes/task-detail-overview-settings-split, tasks.md 2.1 + 2.2, issue #1199)
 *
 * TDD Red for G2. Contract the implementer must provide:
 *   #settingsSectionNav  the left section nav, role="tablist", five role="tab" children
 *                        (基本資料／標記設定／標記說明／抽樣設定／審核設定, in that order)
 *   each section is a role="tabpanel" inside #settingsPanel; exactly one is visible;
 *   each nav tab and each top-level tab carries aria-controls -> that panel's id
 *   section slugs: basic | labeling | guideline | sampling | review
 *   unsaved-change confirm: a visible role="dialog"/"alertdialog" (modal-focus.js, NOT
 *   window.confirm) with a 取消 button and a confirm button named 確認／放棄／離開／確定.
 * The five moved sections keep their existing element ids (see MOVED_IDS).
 */
import { test, expect, type Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;
const TASK_ID = 'T001';

const SECTIONS = [
  { name: '基本資料', slug: 'basic', titleId: 'basicInfoTitle' },
  { name: '標記設定', slug: 'labeling', titleId: 'settingsSummaryTitle' },
  { name: '標記說明', slug: 'guideline', titleId: 'guidelineSectionTitle' },
  { name: '抽樣設定', slug: 'sampling', titleId: 'samplingTitle' },
  { name: '審核設定', slug: 'review', titleId: 'reviewSettingsTitle' },
] as const;

/* Edit/save/cancel buttons, titles, key display ids and edit forms of the five moved panels. */
const MOVED_IDS = [
  'basicInfoTitle', 'overviewEditBtn', 'overviewCancelBtn', 'overviewSaveBtn', 'valueTaskName', 'overviewEditForm',
  'settingsSummaryTitle', 'settingsEditBtn', 'settingsCancelBtn', 'settingsSaveBtn', 'valueConfigTaskType', 'settingsEditForm',
  'guidelineSectionTitle', 'guidelineEditBtn', 'guidelineCancelBtn', 'guidelineSaveBtn', 'valueForceGuideline', 'guidelineEditForm',
  'samplingTitle', 'samplingEditBtn', 'samplingCancelBtn', 'samplingSaveBtn', 'valueSamplingValueControl', 'samplingEditForm',
  'reviewSettingsTitle', 'reviewEditBtn', 'reviewCancelBtn', 'reviewSaveBtn',
];

async function openDetail(page: Page, query: string) {
  await page.goto(`${TASK_DETAIL_URL}?${query}`);
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
}

const sectionNav = (page: Page) => page.locator('#settingsSectionNav');
const sectionTab = (page: Page, name: string) => sectionNav(page).getByRole('tab', { name, exact: true });
const visiblePanels = (page: Page) => page.locator('#settingsPanel [role="tabpanel"]:visible');
const params = (page: Page) => new URL(page.url()).searchParams;

async function openSettings(page: Page, extra = '') {
  await openDetail(page, `task_id=${TASK_ID}&tab=settings${extra}`);
  await expect(page.locator('#settingsPanel')).toBeVisible();
}

async function expectSection(page: Page, titleId: string) {
  await expect(visiblePanels(page)).toHaveCount(1);
  await expect(visiblePanels(page).locator(`#${titleId}`)).toBeVisible();
}

function confirmDialog(page: Page) {
  return page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible');
}

test.describe('task-detail settings tab section nav (FR-026 (1))', () => {
  test('left nav is a tablist with five tabs in fixed order; one panel visible at a time; click switches', async ({ page }) => {
    await openSettings(page);
    await expect(sectionNav(page)).toHaveAttribute('role', 'tablist');
    const names = (await sectionNav(page).getByRole('tab').allInnerTexts()).map((s) => s.trim());
    expect(names).toEqual(SECTIONS.map((s) => s.name));
    await expect(sectionTab(page, '基本資料')).toHaveAttribute('aria-selected', 'true');
    await expectSection(page, 'basicInfoTitle');

    for (const s of SECTIONS) {
      await sectionTab(page, s.name).click();
      await expect(sectionTab(page, s.name)).toHaveAttribute('aria-selected', 'true');
      await expectSection(page, s.titleId);
    }
  });

  test('ArrowDown/ArrowRight and ArrowUp/ArrowLeft move focus and selection between section tabs', async ({ page }) => {
    await openSettings(page);
    await sectionTab(page, '基本資料').focus();
    await page.keyboard.press('ArrowRight');
    await expect(sectionTab(page, '標記設定')).toBeFocused();
    await expect(sectionTab(page, '標記設定')).toHaveAttribute('aria-selected', 'true');
    await expectSection(page, 'settingsSummaryTitle');

    await page.keyboard.press('ArrowDown');
    await expect(sectionTab(page, '標記說明')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(sectionTab(page, '標記設定')).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(sectionTab(page, '基本資料')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(sectionTab(page, '審核設定')).toBeFocused();
    await expectSection(page, 'reviewSettingsTitle');
  });

  test('active nav item uses the resolved --color-white background and font-weight 600', async ({ page }) => {
    await openSettings(page);
    const expected = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.backgroundColor = 'var(--color-white)';
      document.body.appendChild(probe);
      const c = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return c;
    });
    const active = sectionTab(page, '基本資料');
    await expect(active).toBeVisible();
    const style = await active.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, weight: cs.fontWeight };
    });
    expect(style.bg).toBe(expected);
    expect(style.weight).toBe('600');
    const inactive = await sectionTab(page, '抽樣設定').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(inactive).not.toBe(expected);
  });

  test('section panels are 1px --color-border cards with --radius-lg and no box-shadow (FR-026 (6))', async ({ page }) => {
    await openSettings(page);
    const expected = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;border:1px solid var(--color-border);border-radius:var(--radius-lg)';
      document.body.appendChild(probe);
      const cs = getComputedStyle(probe);
      const r = { border: cs.borderTopColor, radius: cs.borderTopLeftRadius };
      probe.remove();
      return r;
    });
    for (const s of SECTIONS) {
      await sectionTab(page, s.name).click();
      const panel = visiblePanels(page);
      await expect(panel).toHaveCount(1);
      const style = await panel.evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          shadow: cs.boxShadow,
          widths: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth],
          color: cs.borderTopColor,
          radius: cs.borderTopLeftRadius,
        };
      });
      expect(style.shadow, s.name).toBe('none');
      expect(style.widths, s.name).toEqual(['1px', '1px', '1px', '1px']);
      expect(style.color, s.name).toBe(expected.border);
      expect(style.radius, s.name).toBe(expected.radius);
    }
  });

  test('moved element ids live inside the settings panel and no longer inside the overview panel', async ({ page }) => {
    await openSettings(page);
    for (const id of MOVED_IDS) {
      await expect(page.locator(`#settingsPanel #${id}`), `#${id} in settings`).toHaveCount(1);
      await expect(page.locator(`#overviewPanel #${id}`), `#${id} in overview`).toHaveCount(0);
    }
  });
});

test.describe('task-detail tab ARIA wiring (G1 deferred nit)', () => {
  test('every top-level tab has aria-controls pointing at a role=tabpanel', async ({ page }) => {
    await openDetail(page, `task_id=${TASK_ID}`);
    const tabs = page.getByRole('tablist', { name: 'Task detail tabs' }).getByRole('tab');
    const count = await tabs.count();
    expect(count).toBe(6);
    for (let i = 0; i < count; i++) {
      const tab = tabs.nth(i);
      const label = (await tab.innerText()).trim();
      const target = await tab.getAttribute('aria-controls');
      expect(target, `${label} aria-controls`).toBeTruthy();
      await expect(page.locator(`#${target}`), `${label} target`).toHaveAttribute('role', 'tabpanel');
    }
  });

  test('every section nav tab has aria-controls pointing at a role=tabpanel inside the settings panel', async ({ page }) => {
    await openSettings(page);
    const tabs = sectionNav(page).getByRole('tab');
    expect(await tabs.count()).toBe(5);
    for (const s of SECTIONS) {
      const target = await sectionTab(page, s.name).getAttribute('aria-controls');
      expect(target, `${s.name} aria-controls`).toBeTruthy();
      const panel = page.locator(`#settingsPanel #${target}`);
      await expect(panel, `${s.name} target`).toHaveAttribute('role', 'tabpanel');
      await expect(panel.locator(`#${s.titleId}`)).toHaveCount(1);
    }
  });
});

test.describe('task-detail settings tab URL sync (FR-019, FR-026 (2))', () => {
  test('clicking 抽樣設定 writes section=sampling, keeps task_id, adds no history entry', async ({ page }) => {
    await openSettings(page);
    const before = await page.evaluate(() => history.length);
    await sectionTab(page, '抽樣設定').click();
    await expect.poll(() => params(page).get('section')).toBe('sampling');
    expect(params(page).get('tab')).toBe('settings');
    expect(params(page).get('task_id')).toBe(TASK_ID);
    expect(await page.evaluate(() => history.length)).toBe(before);
  });

  test('reload of tab=settings&section=sampling restores 抽樣設定', async ({ page }) => {
    await openSettings(page, '&section=sampling');
    await expect(sectionTab(page, '抽樣設定')).toHaveAttribute('aria-selected', 'true');
    await expectSection(page, 'samplingTitle');
    await page.reload();
    await page.locator('#settingsPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
    await expect(sectionTab(page, '抽樣設定')).toHaveAttribute('aria-selected', 'true');
    await expectSection(page, 'samplingTitle');
  });

  test('invalid section falls back to 基本資料 and is removed from the URL', async ({ page }) => {
    await openSettings(page, '&section=bogus');
    await expect(sectionTab(page, '基本資料')).toHaveAttribute('aria-selected', 'true');
    await expectSection(page, 'basicInfoTitle');
    await expect.poll(() => params(page).has('section')).toBe(false);
  });

  test('the default section basic is never written to the URL', async ({ page }) => {
    await openSettings(page, '&section=review');
    await expect.poll(() => params(page).get('section')).toBe('review');
    await sectionTab(page, '基本資料').click();
    await expect(sectionTab(page, '基本資料')).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => params(page).has('section')).toBe(false);
    expect(params(page).get('tab')).toBe('settings');
  });

  test('switching to another top-level tab removes section', async ({ page }) => {
    await openSettings(page, '&section=review');
    await expect.poll(() => params(page).get('section')).toBe('review');
    await page.getByRole('tab', { name: '工時紀錄', exact: true }).click();
    await expect.poll(() => params(page).get('tab')).toBe('work-log');
    expect(params(page).has('section')).toBe(false);
    expect(params(page).get('task_id')).toBe(TASK_ID);
  });

  test('reviewer deep-linking tab=settings&section=review is not redirected', async ({ page }) => {
    await openDetail(page, `task_id=${TASK_ID}&task_role=reviewer&tab=settings&section=review`);
    await expect(page.locator('#settingsPanel')).toBeVisible();
    await expect(sectionTab(page, '審核設定')).toHaveAttribute('aria-selected', 'true');
    await expectSection(page, 'reviewSettingsTitle');
    expect(params(page).get('tab')).toBe('settings');
    expect(params(page).get('section')).toBe('review');
  });
});

test.describe('task-detail settings tab unsaved-change confirm (FR-026 (2))', () => {
  async function dirtyBasic(page: Page) {
    await openSettings(page);
    await page.locator('#overviewEditBtn').click();
    await expect(page.locator('#overviewEditForm')).toBeVisible();
    await page.locator('#editTaskNameInput').fill('Unsaved rename for #1199');
  }
  const confirmBtn = (page: Page) => confirmDialog(page).getByRole('button', { name: /^(確認|確定|放棄|離開)/ });

  test('switching section with unsaved changes: cancel keeps 基本資料 and URL; confirm switches', async ({ page }) => {
    await dirtyBasic(page);
    const urlBefore = page.url();

    await sectionTab(page, '抽樣設定').click();
    await expect(confirmDialog(page)).toHaveCount(1);
    await confirmDialog(page).getByRole('button', { name: '取消' }).click();
    await expect(confirmDialog(page)).toHaveCount(0);
    await expectSection(page, 'basicInfoTitle');
    await expect(page.locator('#editTaskNameInput')).toHaveValue('Unsaved rename for #1199');
    expect(page.url()).toBe(urlBefore);
    expect(params(page).has('section')).toBe(false);

    await sectionTab(page, '抽樣設定').click();
    await expect(confirmDialog(page)).toHaveCount(1);
    await confirmBtn(page).click();
    await expectSection(page, 'samplingTitle');
    await expect.poll(() => params(page).get('section')).toBe('sampling');
  });

  test('switching the top-level tab away from settings with unsaved changes: cancel stays, confirm leaves', async ({ page }) => {
    await dirtyBasic(page);
    const urlBefore = page.url();

    await page.getByRole('tab', { name: '工時紀錄', exact: true }).click();
    await expect(confirmDialog(page)).toHaveCount(1);
    await confirmDialog(page).getByRole('button', { name: '取消' }).click();
    await expect(page.getByRole('tab', { name: '設定', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#overviewEditForm')).toBeVisible();
    expect(page.url()).toBe(urlBefore);

    await page.getByRole('tab', { name: '工時紀錄', exact: true }).click();
    await expect(confirmDialog(page)).toHaveCount(1);
    await confirmBtn(page).click();
    await expect(page.getByRole('tab', { name: '工時紀錄', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => params(page).get('tab')).toBe('work-log');
  });

  test('switching section without unsaved changes opens no confirm dialog', async ({ page }) => {
    await openSettings(page);
    await page.locator('#overviewEditBtn').click();
    await expect(page.locator('#overviewEditForm')).toBeVisible();
    await sectionTab(page, '標記設定').click();
    await expect(confirmDialog(page)).toHaveCount(0);
    await expectSection(page, 'settingsSummaryTitle');
  });
});

test.describe('task-detail settings tab G2 review follow-ups (FR-026 (1)(2), FR-019, issue #1199)', () => {
  async function tokenValue(page: Page, prop: string, token: string) {
    return page.evaluate(([p, t]) => {
      const probe = document.createElement('div');
      (probe.style as unknown as Record<string, string>)[p] = `var(${t})`;
      document.body.appendChild(probe);
      const v = getComputedStyle(probe).getPropertyValue(p.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`));
      probe.remove();
      return v;
    }, [prop, token]);
  }

  test('section title plus edit link plus definition list follow the FR-026 (1) appearance via tokens', async ({ page }) => {
    await openSettings(page);
    const title = page.locator('#basicInfoTitle');
    const titleStyle = await title.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { size: cs.fontSize, weight: cs.fontWeight };
    });
    expect(titleStyle).toEqual({ size: '16px', weight: '600' });

    const edit = page.locator('#overviewEditBtn');
    const editStyle = await edit.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, borders: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth] };
    });
    expect(editStyle.borders, 'edit link has no button border').toEqual(['0px', '0px', '0px', '0px']);
    expect(editStyle.bg, 'edit link has no filled background').toBe('rgba(0, 0, 0, 0)');

    const dl = page.locator('#basicInfoView');
    const cols = await dl.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ')[0]);
    expect(cols).toBe('160px');
    const rowGap = await dl.evaluate((el) => getComputedStyle(el).rowGap);
    expect(rowGap).toBe('10px');

    const muted = await tokenValue(page, 'borderTopColor', '--color-border-muted');
    const sep = await page.locator('#basicInfoView .kv-dl-row .kv-dl-key').first().evaluate((el) => {
      const cs = getComputedStyle(el);
      return { width: cs.borderBottomWidth, color: cs.borderBottomColor };
    });
    expect(sep.width, 'row separator is 1px').toBe('1px');
    expect(sep.color, 'row separator uses --color-border-muted').toBe(muted);
  });

  test('a dirty Code panel draft counts as unsaved: section switch opens the leave modal and cancel keeps section and URL', async ({ page }) => {
    await openSettings(page, '&section=labeling');
    await page.locator('#settingsEditBtn').click();
    await expect(page.locator('#settingsEditForm')).toBeVisible();
    await page.locator('#codeEditor').fill('outputs: []\n');
    const urlBefore = page.url();

    await sectionTab(page, '抽樣設定').click();
    await expect(confirmDialog(page)).toHaveCount(1);
    await confirmDialog(page).getByRole('button', { name: '取消' }).click();
    await expect(confirmDialog(page)).toHaveCount(0);
    await expectSection(page, 'settingsSummaryTitle');
    await expect(page.locator('#codeEditor')).toHaveValue('outputs: []\n');
    expect(page.url()).toBe(urlBefore);
  });

  test('a dirty Code panel draft also guards the top-level tab switch to 概覽', async ({ page }) => {
    await openSettings(page, '&section=labeling');
    await page.locator('#settingsEditBtn').click();
    await expect(page.locator('#settingsEditForm')).toBeVisible();
    await page.locator('#codeEditor').fill('outputs: []\n');
    const urlBefore = page.url();

    await page.getByRole('tab', { name: '概覽', exact: true }).click();
    await expect(confirmDialog(page)).toHaveCount(1);
    await confirmDialog(page).getByRole('button', { name: '取消' }).click();
    await expect(page.getByRole('tab', { name: '設定', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#settingsEditForm')).toBeVisible();
    expect(page.url()).toBe(urlBefore);
  });

  test('section is restored only on the settings tab: tab=work-log&section=review drops section', async ({ page }) => {
    await openDetail(page, `task_id=${TASK_ID}&tab=work-log&section=review`);
    await expect(page.getByRole('tab', { name: '工時紀錄', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => params(page).has('section')).toBe(false);
    expect(params(page).get('tab')).toBe('work-log');
    await page.getByRole('tab', { name: '設定', exact: true }).click();
    await expect(sectionTab(page, '基本資料')).toHaveAttribute('aria-selected', 'true');
  });

  test('section without tab (default overview) is dropped from the URL', async ({ page }) => {
    await openDetail(page, `task_id=${TASK_ID}&section=review`);
    await expect.poll(() => params(page).has('section')).toBe(false);
    await expect(page.locator('#settingsPanel')).toBeHidden();
  });

  test('the leave alertdialog is described by its body text (aria-describedby -> #settingsLeaveBody)', async ({ page }) => {
    const modal = page.locator('#settingsLeaveModal');
    await openSettings(page);
    await expect(modal).toHaveAttribute('role', 'alertdialog');
    await expect(modal).toHaveAttribute('aria-describedby', 'settingsLeaveBody');
    await expect(page.locator('#settingsLeaveBody')).toHaveCount(1);
  });
});

test.describe('task-detail settings tab reviewer is read-only (FR-026 (5), FR-006)', () => {
  test('reviewer sees 設定, no 編輯 link in any section, and cannot enter edit mode', async ({ page }) => {
    await openDetail(page, `task_id=${TASK_ID}&task_role=reviewer`);
    await page.getByRole('tab', { name: '設定', exact: true }).click();
    await expect(page.locator('#settingsPanel')).toBeVisible();
    for (const s of SECTIONS) {
      await sectionTab(page, s.name).click();
      await expectSection(page, s.titleId);
      const panel = visiblePanels(page);
      await expect(panel.getByRole('button', { name: '編輯' }), s.name).toHaveCount(0);
      await expect(panel.getByRole('link', { name: '編輯' }), s.name).toHaveCount(0);
    }
    await expect(page.locator('#settingsPanel [id$="EditBtn"]')).toHaveCount(0);
    for (const id of ['overviewEditForm', 'settingsEditForm', 'guidelineEditForm', 'samplingEditForm']) {
      await expect(page.locator(`#settingsPanel #${id}`)).toBeHidden();
    }
  });
});

test.describe('task-detail settings tab narrow viewport (FR-026 (1), issue #406)', () => {
  test('375px: nav sits above content, scrolls horizontally, page does not overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await openSettings(page);
    /* The 560ms loading skeleton pushes the layout down; compare boxes only after it hides. */
    await expect(page.locator('#loadingSkeleton')).toBeHidden();
    const nav = sectionNav(page);
    await expect(nav).toBeVisible();
    const navBox = await nav.boundingBox();
    const panelBox = await visiblePanels(page).boundingBox();
    expect(navBox).not.toBeNull();
    expect(panelBox).not.toBeNull();
    expect(navBox!.y + navBox!.height).toBeLessThanOrEqual(panelBox!.y + 1);
    const overflowX = await nav.evaluate((el) => getComputedStyle(el).overflowX);
    expect(['auto', 'scroll']).toContain(overflowX);
    const doc = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(doc.scroll).toBeLessThanOrEqual(doc.client);
  });
});
