/*
 * Traceability: GitHub issue #1394 (prototype task-detail structure fixes), specs/task-management/014-task-detail/spec.md.
 * TDD Red. Contract the implementer must provide:
 *   F-3  no card-in-card: .round-history-panel, .member-entry-card, .phase-item are frameless
 *        (border 0, transparent background) inside their outer section.panel; #progressEmptyState
 *        is not a .panel (it keeps its inner .empty-state-panel).
 *   F-5  the five settings Edit controls use .btn-link (not .btn-secondary), styled by the class
 *        rather than by an [id$="EditBtn"] attribute selector.
 *   F-7  .kv-dl-row carries the 1px --color-border-muted separator; .kv-dl-key / .kv-dl-value carry none,
 *        so a wrapped value does not leave key and value separators at different heights.
 */
import { test, expect } from '../fixtures';
import type { Page, Locator } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;
const NO_BORDERS = ['0px', '0px', '0px', '0px'];
const TRANSPARENT = 'rgba(0, 0, 0, 0)';

async function open(page: Page, query: string) {
  await page.goto(`${TASK_DETAIL_URL}?${query}`);
  await page.locator('#loadingSkeleton').waitFor({ state: 'hidden', timeout: PANEL_LOAD_TIMEOUT });
}

const frame = (loc: Locator) =>
  loc.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      borders: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth],
      bg: cs.backgroundColor,
    };
  });

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

test.describe('issue #1394 F-3: no card-in-card on task-detail', () => {
  test('overview .round-history-panel has no frame', async ({ page }) => {
    await open(page, 'task_id=T003&task_role=project_leader');
    const el = page.locator('.round-history-panel');
    await el.first().waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
    const f = await frame(el.first());
    expect(f.borders, 'round-history-panel borders').toEqual(NO_BORDERS);
    expect(f.bg, 'round-history-panel background').toBe(TRANSPARENT);
    const outer = el.first().locator('xpath=ancestor::section[contains(concat(" ", normalize-space(@class), " "), " panel ")][1]');
    expect((await frame(outer)).borders, 'outer panel keeps its border').toEqual(['1px', '1px', '1px', '1px']);
  });

  test('both .member-entry-card on the member tab have no frame', async ({ page }) => {
    await open(page, 'task_id=T003&task_role=project_leader&tab=member-management');
    const cards = page.locator('.member-entry-card');
    await expect(cards).toHaveCount(2, { timeout: PANEL_LOAD_TIMEOUT });
    for (let i = 0; i < 2; i++) {
      const f = await frame(cards.nth(i));
      expect(f.borders, `member-entry-card #${i} borders`).toEqual(NO_BORDERS);
      expect(f.bg, `member-entry-card #${i} background`).toBe(TRANSPARENT);
    }
    const outer = cards.first().locator('xpath=ancestor::section[contains(concat(" ", normalize-space(@class), " "), " panel ")][1]');
    expect((await frame(outer)).borders, 'outer panel keeps its border').toEqual(['1px', '1px', '1px', '1px']);
  });

  test('a .phase-item in #roundProgressList has no frame', async ({ page }) => {
    await open(page, 'task_id=T003&task_role=project_leader&tab=annotation-progress');
    const item = page.locator('#roundProgressList .phase-item').first();
    await item.waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
    const f = await frame(item);
    expect(f.borders, 'phase-item borders').toEqual(NO_BORDERS);
    expect(f.bg, 'phase-item background').toBe(TRANSPARENT);
    const outer = item.locator('xpath=ancestor::section[contains(concat(" ", normalize-space(@class), " "), " panel ")][1]');
    expect((await frame(outer)).borders, 'outer panel keeps its border').toEqual(['1px', '1px', '1px', '1px']);
  });

  test('#progressEmptyState is not a .panel and keeps its inner empty-state-panel', async ({ page }) => {
    await open(page, 'task_id=T003&task_role=project_leader&tab=annotation-progress');
    const el = page.locator('#progressEmptyState');
    await el.waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
    const cls = (await el.getAttribute('class')) ?? '';
    expect(cls.split(/\s+/), 'progressEmptyState classes').not.toContain('panel');
    await expect(el.locator('.empty-state.empty-state-panel')).toHaveCount(1);
  });
});

test.describe('issue #1394 F-5: Edit buttons are .btn-link', () => {
  const IDS = ['overviewEditBtn', 'settingsEditBtn', 'guidelineEditBtn', 'samplingEditBtn', 'reviewEditBtn'];

  test('all five Edit buttons use btn-link, not btn-secondary, with link styling', async ({ page }) => {
    await open(page, 'task_id=T001&task_role=project_leader&tab=settings');
    const primary = await tokenValue(page, 'color', '--color-primary');
    for (const id of IDS) {
      const btn = page.locator(`#${id}`);
      await btn.waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
      const cls = ((await btn.getAttribute('class')) ?? '').split(/\s+/);
      expect(cls, `${id} has btn-link`).toContain('btn-link');
      expect(cls, `${id} lacks btn-secondary`).not.toContain('btn-secondary');
      const s = await btn.evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          borders: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth],
          bg: cs.backgroundColor,
          color: cs.color,
        };
      });
      expect(s.borders, `${id} borders`).toEqual(NO_BORDERS);
      expect(s.bg, `${id} background`).toBe(TRANSPARENT);
      expect(s.color, `${id} color is --color-primary`).toBe(primary);
    }
  });

  test('hover keeps a transparent background and underlines the text', async ({ page }) => {
    await open(page, 'task_id=T001&task_role=project_leader&tab=settings');
    const btn = page.locator('#overviewEditBtn');
    await expect(btn).toBeVisible();
    await btn.hover();
    const s = await btn.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, deco: cs.textDecorationLine };
    });
    expect(s.bg).toBe(TRANSPARENT);
    expect(s.deco).toContain('underline');
  });

  test('page source no longer styles Edit buttons through an [id$="EditBtn"] selector', async ({ page }) => {
    const res = await page.request.get(TASK_DETAIL_URL);
    expect(res.ok()).toBe(true);
    expect(await res.text()).not.toContain('[id$="EditBtn"]');
  });
});

test.describe('issue #1394 F-7: kv-dl separator is drawn on the whole row', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const [name, dl] of [['basic', '#basicInfoView'], ['sampling', '#samplingSummaryView']] as const) {
    test(`${name}: key and value share one separator y for a wrapped value`, async ({ page }) => {
      await open(page, 'task_id=T003&task_role=project_leader&tab=settings');
      const slug = name === 'basic' ? 'basic' : 'sampling';
      await page.locator(`#settingsTab-${slug}`).click();
      const view = page.locator(dl);
      await expect(view).toBeVisible();
      const muted = await tokenValue(page, 'borderTopColor', '--color-border-muted');

      const r = await view.evaluate((root) => {
        const rows = Array.from(root.querySelectorAll<HTMLElement>('.kv-dl-row'));
        const row = rows[0];
        const value = row.querySelector<HTMLElement>('.kv-dl-value')!;
        value.textContent = '很長的文字 long wrapped value '.repeat(6).slice(0, 120);
        const key = row.querySelector<HTMLElement>('.kv-dl-key')!;
        const sepBottom = (cell: HTMLElement) => {
          const own = parseFloat(getComputedStyle(cell).borderBottomWidth) > 0;
          return (own ? cell : row).getBoundingClientRect().bottom;
        };
        const cs = (el: HTMLElement) => getComputedStyle(el);
        return {
          keyY: sepBottom(key),
          valueY: sepBottom(value),
          valueLines: Math.round(value.getBoundingClientRect().height / parseFloat(cs(value).lineHeight)),
          keyBorder: cs(key).borderBottomWidth,
          valueBorder: cs(value).borderBottomWidth,
          rowBorder: cs(row).borderBottomWidth,
          rowBorderColor: cs(row).borderBottomColor,
          rowHeight: row.getBoundingClientRect().height,
        };
      });
      expect.soft(r.valueLines, 'value wraps to more than one line').toBeGreaterThan(1);
      expect.soft(r.keyBorder, 'key has no own border-bottom').toBe('0px');
      expect.soft(r.valueBorder, 'value has no own border-bottom').toBe('0px');
      expect.soft(r.rowBorder, 'row carries 1px separator').toBe('1px');
      expect.soft(r.rowBorderColor, 'row separator uses --color-border-muted').toBe(muted);
      expect.soft(r.rowHeight, 'row generates a box (not display: contents)').toBeGreaterThan(0);
      expect.soft(r.keyY, 'key and value separators resolve to the same y').toBeCloseTo(r.valueY, 1);
    });
  }
});
