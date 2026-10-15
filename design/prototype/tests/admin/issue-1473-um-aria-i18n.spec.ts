/*
 * Traceability: issue #1473 (prototype fix, no canonical spec change);
 *   specs/admin/006-user-management/spec.md (user-management page).
 *
 * TDD Red. Contract: on user-management the aria-label of the search input (#searchInput),
 * the filter selects (#roleFilter / #statusFilter), the users table (table[role="table"])
 * and the audit drawer (#auditDrawer) follow the page language:
 *   - en mode: each aria-label is non-empty and contains no CJK.
 *   - zh mode: 搜尋使用者 / 角色篩選 / 狀態篩選 / 使用者列表 / 異動紀錄.
 *   - toggling the language at runtime (#langToggle) updates them in both directions.
 * #auditDrawer is aria-hidden, so the checks read attributes only (no visibility assertions).
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

const USER_MGMT = '/pages/admin/user-management.html';
const CJK = /[㐀-鿿＀-￯　-〿]/;

const TARGETS = [
  { name: 'search input', selector: '#searchInput', zh: '搜尋使用者' },
  { name: 'role filter', selector: '#roleFilter', zh: '角色篩選' },
  { name: 'status filter', selector: '#statusFilter', zh: '狀態篩選' },
  { name: 'users table', selector: 'table[role="table"]', zh: '使用者列表' },
  { name: 'audit drawer', selector: '#auditDrawer', zh: '異動紀錄' },
];

async function setLang(page: Page, lang: 'en' | 'zh') {
  await page.addInitScript((l) => localStorage.setItem('labelsuite.lang', l), lang);
}

test.describe('user-management control aria-label i18n (#1473)', () => {
  for (const t of TARGETS) {
    test(`en: ${t.name} aria-label is non-empty and contains no CJK`, async ({ page }) => {
      await setLang(page, 'en');
      await page.goto(USER_MGMT);
      const label = (await page.locator(t.selector).first().getAttribute('aria-label')) ?? '';
      expect(label.length, `${t.selector} has an aria-label`).toBeGreaterThan(0);
      expect(label, `${t.selector} aria-label: ${label}`).not.toMatch(CJK);
    });

    test(`zh: ${t.name} aria-label is ${t.zh}`, async ({ page }) => {
      await setLang(page, 'zh');
      await page.goto(USER_MGMT);
      await expect(page.locator(t.selector).first()).toHaveAttribute('aria-label', t.zh);
    });
  }

  test('runtime toggle zh -> en -> zh updates all five aria-labels', async ({ page }) => {
    await setLang(page, 'zh');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(USER_MGMT);
    for (const t of TARGETS) {
      await expect(page.locator(t.selector).first()).toHaveAttribute('aria-label', t.zh);
    }
    await page.locator('#langToggle').click();
    for (const t of TARGETS) {
      const label = (await page.locator(t.selector).first().getAttribute('aria-label')) ?? '';
      expect(label, `after toggle to en, ${t.selector}: ${label}`).not.toMatch(CJK);
      expect(label.length, `${t.selector} aria-label non-empty after toggle`).toBeGreaterThan(0);
    }
    await page.locator('#langToggle').click();
    for (const t of TARGETS) {
      await expect(page.locator(t.selector).first()).toHaveAttribute('aria-label', t.zh);
    }
  });
});
