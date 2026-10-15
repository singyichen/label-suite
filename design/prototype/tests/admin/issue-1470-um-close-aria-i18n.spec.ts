/*
 * Traceability: issue #1470 (prototype fix, no canonical spec change);
 *   specs/admin/006-user-management/spec.md (user-management page).
 *
 * TDD Red. Contract: on user-management the aria-label of the three modal close buttons
 * (#addModal / #editModal / #disableModal .modal-close) and #toastClose follow the page language:
 *   - en mode: no CJK in any of the four aria-labels.
 *   - zh mode: 關閉 / 關閉 / 關閉 / 關閉通知.
 *   - toggling the language at runtime (#langToggle) updates them in both directions.
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

const USER_MGMT = '/pages/admin/user-management.html';
const CJK = /[㐀-鿿＀-￯　-〿]/;

const TARGETS = [
  { name: 'addModal close', selector: '#addModal .modal-close', zh: '關閉' },
  { name: 'editModal close', selector: '#editModal .modal-close', zh: '關閉' },
  { name: 'disableModal close', selector: '#disableModal .modal-close', zh: '關閉' },
  { name: 'toast close', selector: '#toastClose', zh: '關閉通知' },
];

async function setLang(page: Page, lang: 'en' | 'zh') {
  await page.addInitScript((l) => localStorage.setItem('labelsuite.lang', l), lang);
}

test.describe('user-management close-button aria-label i18n (#1470)', () => {
  for (const t of TARGETS) {
    test(`en: ${t.name} aria-label contains no CJK`, async ({ page }) => {
      await setLang(page, 'en');
      await page.goto(USER_MGMT);
      const label = (await page.locator(t.selector).getAttribute('aria-label')) ?? '';
      expect(label.length, `${t.selector} has an aria-label`).toBeGreaterThan(0);
      expect(label, `${t.selector} aria-label: ${label}`).not.toMatch(CJK);
    });

    test(`zh: ${t.name} aria-label is ${t.zh}`, async ({ page }) => {
      await setLang(page, 'zh');
      await page.goto(USER_MGMT);
      await expect(page.locator(t.selector)).toHaveAttribute('aria-label', t.zh);
    });
  }

  test('runtime toggle zh -> en -> zh updates all close-button aria-labels', async ({ page }) => {
    await setLang(page, 'zh');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(USER_MGMT);
    for (const t of TARGETS) {
      await expect(page.locator(t.selector)).toHaveAttribute('aria-label', t.zh);
    }
    await page.locator('#langToggle').click();
    for (const t of TARGETS) {
      const label = (await page.locator(t.selector).getAttribute('aria-label')) ?? '';
      expect(label, `after toggle to en, ${t.selector}: ${label}`).not.toMatch(CJK);
      expect(label.length).toBeGreaterThan(0);
    }
    await page.locator('#langToggle').click();
    for (const t of TARGETS) {
      await expect(page.locator(t.selector)).toHaveAttribute('aria-label', t.zh);
    }
  });
});
