/**
 * Profile — button and role-chip drift (issue #1464).
 *
 * Red contract: profile.html must not re-declare button chrome that the shared
 * design system already owns, and its role chip must follow the shared sidebar
 * label instead of its own i18n copy.
 *   1. Every <button> inherits the page font (UA default Arial must not leak).
 *   2. .btn-primary resolves --color-on-cta on --color-cta in both themes.
 *   3. .btn-secondary has a 1px --color-border border in both themes.
 *   4. .btn-secondary carries no inline style attribute.
 *   5. #roleIndicator matches user-management.html and follows #langToggle.
 *
 * Traceability: specs/account/005-profile-settings/spec.md; issue #1464.
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

const PROFILE_URL = '/pages/account/profile.html';
const USER_MGMT_URL = '/pages/admin/user-management.html';

type Lang = 'zh' | 'en';
type Theme = 'light' | 'dark';

async function seed(page: Page, lang: Lang, superAdmin = false): Promise<void> {
  await page.addInitScript(
    ([l, sa]) => {
      localStorage.setItem('labelsuite.lang', l as string);
      if (sa) localStorage.setItem('labelsuite.systemRole', 'super_admin');
    },
    [lang, superAdmin] as const,
  );
}

async function setTheme(page: Page, theme: Theme): Promise<void> {
  if (theme === 'dark') {
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  }
}

// Resolves a custom property to a computed rgb() string by painting it onto a
// throwaway element, so it compares with getComputedStyle output.
function resolveToken(page: Page, token: string): Promise<string> {
  return page.evaluate((name) => {
    const probe = document.createElement('div');
    probe.style.color = `var(${name})`;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, token);
}

function cssOf(page: Page, selector: string, prop: string): Promise<string> {
  return page.evaluate(
    ([sel, p]) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`missing element: ${sel}`);
      return getComputedStyle(el).getPropertyValue(p).trim();
    },
    [selector, prop] as const,
  );
}

test.describe('Profile buttons — shared chrome (issue #1464)', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page, 'zh');
    await page.goto(PROFILE_URL);
  });

  test('every button inherits the body font-family, not the UA default', async ({ page }) => {
    const result = await page.evaluate(() => {
      const body = getComputedStyle(document.body).fontFamily;
      const buttons = Array.from(document.querySelectorAll('button')).map((b) => ({
        id: b.id || b.className || b.textContent?.trim() || '(button)',
        family: getComputedStyle(b).fontFamily,
      }));
      return { body, buttons };
    });
    expect(result.buttons.length).toBeGreaterThan(0);
    expect(result.body.split(',')[0].trim().replace(/["']/g, '')).not.toBe('Arial');
    for (const b of result.buttons) {
      expect(b.family, `button ${b.id}`).toBe(result.body);
    }
    expect(await cssOf(page, '#emailChangeBtn', 'font-family')).toBe(result.body);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`.btn-primary uses --color-on-cta on --color-cta (${theme})`, async ({ page }) => {
      await setTheme(page, theme);
      const onCta = await resolveToken(page, '--color-on-cta');
      const cta = await resolveToken(page, '--color-cta');
      expect(await cssOf(page, '#saveProfileBtn', 'color')).toBe(onCta);
      expect(await cssOf(page, '#saveProfileBtn', 'background-color')).toBe(cta);
    });

    test(`.btn-secondary has a 1px --color-border border (${theme})`, async ({ page }) => {
      await setTheme(page, theme);
      const border = await resolveToken(page, '--color-border');
      expect(await cssOf(page, '.btn-secondary', 'border-top-width')).toBe('1px');
      expect(await cssOf(page, '.btn-secondary', 'border-top-color')).toBe(border);
    });
  }

  test('.btn-secondary has no inline style attribute', async ({ page }) => {
    const style = await page.evaluate(
      () => document.querySelector('.btn-secondary')?.getAttribute('style') ?? null,
    );
    expect(style).toBeNull();
  });
});

test.describe('Profile role chip — shared label (issue #1464)', () => {
  const EXPECTED: Record<Lang, string> = { zh: '系統管理員', en: 'Super Admin' };

  async function chipText(page: Page, url: string): Promise<string> {
    await page.goto(url);
    return ((await page.locator('#roleIndicator').first().textContent()) ?? '').trim();
  }

  for (const lang of ['zh', 'en'] as const) {
    test(`super_admin chip matches user-management (${lang})`, async ({ page }) => {
      await seed(page, lang, true);
      const profileChip = await chipText(page, PROFILE_URL);
      const adminChip = await chipText(page, USER_MGMT_URL);
      expect(adminChip).toBe(EXPECTED[lang]);
      expect(profileChip).toBe(adminChip);
    });
  }

  test('chip follows #langToggle on profile', async ({ page }) => {
    await seed(page, 'zh', true);
    await page.goto(PROFILE_URL);
    await expect(page.locator('#roleIndicator')).toHaveText(EXPECTED.zh);
    await page.locator('#langToggle').click();
    await expect(page.locator('#roleIndicator')).toHaveText(EXPECTED.en);
    await page.locator('#langToggle').click();
    await expect(page.locator('#roleIndicator')).toHaveText(EXPECTED.zh);
  });
});
