/*
 * Traceability: issue #1463 (prototype fix, no canonical spec change);
 *   specs/admin/006-user-management/spec.md (user-management page),
 *   design/system/MASTER.md §Modals (shared .modal-title).
 *
 * TDD Red. Contract:
 *   1. Dark theme on user-management: `#pageSizeSelect` text/background contrast >= 4.5 and
 *      its text colour equals `#roleFilter`'s (1440x900 and 390x844).
 *   2. en mode: the disable-confirm sentence and the page-size options contain no CJK while the
 *      target name stays in the <strong>; zh keeps the Chinese copy.
 *   3. role-settings: `#dirtyModalTitle` is an <h2> (not <h3>) and its font-size matches the
 *      shared `.modal-title` rule.
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

const USER_MGMT = '/pages/admin/user-management.html';
const ROLE_SETTINGS = '/pages/admin/role-settings.html';
const CJK = /[㐀-鿿＀-￯　-〿]/;

type Rgb = [number, number, number];
function parseRgb(v: string): Rgb {
  const m = v.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
  expect(m, `not an rgb() value: ${v}`).not.toBeNull();
  return [Number(m![1]), Number(m![2]), Number(m![3])];
}
function luminance([r, g, b]: Rgb): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

async function setLang(page: Page, lang: 'en' | 'zh') {
  await page.addInitScript((l) => localStorage.setItem('labelsuite.lang', l), lang);
}

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];

test.describe('user-management dark-mode page-size select (#1463)', () => {
  for (const vp of VIEWPORTS) {
    test(`#pageSizeSelect is readable and matches #roleFilter text colour at ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto(USER_MGMT);
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      const read = (sel: string) =>
        page.locator(sel).evaluate((el) => {
          const cs = getComputedStyle(el);
          return { color: cs.color, bg: cs.backgroundColor };
        });
      const size = await read('#pageSizeSelect');
      const role = await read('#roleFilter');
      const ratio = contrast(parseRgb(size.color), parseRgb(size.bg));
      expect(ratio, `page-size ${size.color} on ${size.bg}`).toBeGreaterThanOrEqual(4.5);
      expect(size.color, 'page-size text colour should equal filter-select text colour').toBe(role.color);
    });
  }
});

test.describe('user-management i18n (#1463)', () => {
  test('en: disable confirmation and page-size options contain no CJK', async ({ page }) => {
    await setLang(page, 'en');
    await page.goto(USER_MGMT);
    await page.locator('#userTableBody .mini-btn-danger:not([disabled])').first().click();
    await expect(page.locator('#disableModal')).toBeVisible();
    const text = (await page.locator('#disableConfirmText').textContent()) ?? '';
    const name = (await page.locator('#disableTargetName').textContent()) ?? '';
    expect(name.trim().length).toBeGreaterThan(0);
    expect(text).toContain(name);
    expect(text, `disableConfirmText: ${text}`).not.toMatch(CJK);
    const options = await page.locator('#pageSizeSelect option').allTextContents();
    expect(options.length).toBeGreaterThan(0);
    for (const o of options) expect(o, `option "${o}"`).not.toMatch(CJK);
  });

  test('zh: copy stays Chinese and the target name stays in <strong>', async ({ page }) => {
    await setLang(page, 'zh');
    await page.goto(USER_MGMT);
    await page.locator('#userTableBody .mini-btn-danger:not([disabled])').first().click();
    await expect(page.locator('#disableModal')).toBeVisible();
    await expect(page.locator('#disableConfirmText')).toContainText('確定要停用');
    const strong = page.locator('#disableConfirmText strong');
    await expect(strong).toHaveCount(1);
    expect(((await strong.textContent()) ?? '').trim().length).toBeGreaterThan(0);
    await expect(page.locator('#pageSizeSelect option').first()).toHaveText('20 筆/頁');
  });

  test('toggling language keeps the disable target name intact', async ({ page }) => {
    await setLang(page, 'zh');
    await page.goto(USER_MGMT);
    await page.locator('#userTableBody .mini-btn-danger:not([disabled])').first().click();
    const before = ((await page.locator('#disableTargetName').textContent()) ?? '').trim();
    await page.evaluate(() => (window as any).LabelSuiteSharedSidebar.applyGlobalLanguage('en', {}));
    await page.evaluate(() => (window as any).applyLang('en'));
    await expect(page.locator('#disableConfirmText strong')).toHaveCount(1);
    await expect(page.locator('#disableTargetName')).toHaveText(before);
  });
});

test.describe('role-settings dirty modal title (#1463)', () => {
  test('#dirtyModalTitle is an h2 sized like shared .modal-title', async ({ page }) => {
    await page.goto(ROLE_SETTINGS);
    const result = await page.locator('#dirtyModalTitle').evaluate((el) => {
      const clone = document.createElement('h3');
      clone.className = 'modal-title';
      clone.textContent = 'x';
      el.parentElement!.appendChild(clone);
      const reference = getComputedStyle(clone).fontSize;
      clone.remove();
      return { tag: el.tagName, fontSize: getComputedStyle(el).fontSize, reference };
    });
    expect(result.tag).toBe('H2');
    expect(result.fontSize).toBe(result.reference);
  });
});
