import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');

// Each entry lists the page shell plus the runtime modules it loads; the
// language-switch rules apply to their combined source.
const pagesNeedingUnifiedLanguageSwitch = [
  ['pages/dashboard/dashboard.html', 'pages/dashboard/dashboard.js'],
  ['pages/admin/user-management.html'],
  ['pages/admin/role-settings.html'],
  ['pages/account/profile.html'],
  ['pages/account/login.html'],
  ['pages/account/register.html'],
  ['pages/account/forgot-password.html'],
  ['pages/account/reset-password.html'],
];

const mobileSidebarPages = [
  '/pages/dashboard/dashboard.html',
  '/pages/admin/user-management.html',
  '/pages/admin/role-settings.html',
];

test.describe('Prototype global language switch implementation', () => {
  test('uses shared sidebar global language API across all pages', () => {
    for (const sourceFiles of pagesNeedingUnifiedLanguageSwitch) {
      const label = sourceFiles.join(' + ');
      const source = sourceFiles
        .map((relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8'))
        .join('\n');

      expect(source, `${label} should use shared applyGlobalLanguage`).toContain(
        'LabelSuiteSharedSidebar.applyGlobalLanguage('
      );
      expect(source, `${label} should not write html lang directly`).not.toContain(
        'document.documentElement.lang'
      );
      expect(source, `${label} should not persist language directly`).not.toContain(
        'LabelSuiteSharedSidebar.setStoredLang('
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

  test('keeps admin sidebar navigation labels translatable in both admin pages', () => {
    const navKeys = [
      'navDashboard',
      'navTaskManagement',
      'navAnnotation',
      'navDataset',
      'navAdmin',
      'navProfile',
    ];
    const adminPages = [
      'pages/admin/user-management.html',
      'pages/admin/role-settings.html',
    ];

    for (const relativePath of adminPages) {
      const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
      for (const navKey of navKeys) {
        expect(source, `${relativePath} should define ${navKey} in i18n`).toContain(`${navKey}:`);
        expect(source, `${relativePath} should update element ${navKey} in applyLang`).toContain(`'${navKey}'`);
      }
    }
  });

  test('translates disable modal title in user-management page', () => {
    const relativePath = 'pages/admin/user-management.html';
    const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

    expect(source).toContain('disableModalTitle:');
    expect(source).toContain("'disableModalTitle'");
  });

  test('uses full serif fallback stack in shared design tokens', () => {
    const source = fs.readFileSync(path.join(ROOT, 'assets/tokens.css'), 'utf8');

    expect(source).toContain(
      "--font-serif-display:  'Crimson Pro', 'Noto Serif TC', 'Source Han Serif TC', Georgia, serif;"
    );
  });
});
