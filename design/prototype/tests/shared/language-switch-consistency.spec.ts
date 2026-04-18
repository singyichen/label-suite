import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');

const pagesNeedingUnifiedLanguageSwitch = [
  'pages/dashboard/dashboard.html',
  'pages/admin/user-management.html',
  'pages/admin/role-settings.html',
  'pages/task-management/task-detail.html',
  'pages/account/profile.html',
  'pages/account/login.html',
  'pages/account/register.html',
  'pages/account/forgot-password.html',
  'pages/account/reset-password.html',
];

const mobileSidebarPages = [
  '/pages/dashboard/dashboard.html',
  '/pages/admin/user-management.html',
  '/pages/admin/role-settings.html',
];

test.describe('Prototype global language switch implementation', () => {
  test('uses shared sidebar global language API across all pages', () => {
    for (const relativePath of pagesNeedingUnifiedLanguageSwitch) {
      const fullPath = path.join(ROOT, relativePath);
      const source = fs.readFileSync(fullPath, 'utf8');

      expect(source, `${relativePath} should use shared applyGlobalLanguage`).toContain(
        'window.LabelSuiteSharedSidebar.applyGlobalLanguage('
      );
      expect(source, `${relativePath} should not write html lang directly`).not.toContain(
        'document.documentElement.lang'
      );
      expect(source, `${relativePath} should not persist language directly`).not.toContain(
        'window.LabelSuiteSharedSidebar.setStoredLang('
      );
    }
  });

  test('keeps mobile language toggle behavior consistent on sidebar pages', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    for (const url of mobileSidebarPages) {
      await page.addInitScript(() => {
        window.localStorage.setItem('labelsuite.lang', 'zh');
      });
      await page.goto(url);

      await expect(page.locator('#mobileLangLabel')).toHaveText('ZH');
      await page.locator('#mobileLangToggle').click();
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.locator('#langLabel')).toHaveText('EN');
      await expect(page.locator('#mobileLangLabel')).toHaveText('EN');
      await expect(page.locator('#mobileLangToggle')).toHaveAttribute('aria-label', 'Switch language');
    }
  });
});
