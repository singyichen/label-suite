/**
 * Shared language-switch consistency across sidebar consumer pages: every
 * page must delegate to the shared sidebar global language API (no direct
 * html[lang] writes or direct persistence), the mobile toggle must stay in
 * sync with the desktop one, and admin nav labels must remain translatable.
 * The final case pins the serif fallback stack in assets/tokens.css.
 *
 * Traceability: specs/shared/008-sidebar-navbar-shared/spec.md
 *   FR-009, FR-009A, FR-009B, SC-006, SC-006A
 * Traceability: design/system/MASTER.md (serif fallback stack — design-system
 * contract, not a feature-spec FR)
 *   §Typography
 */
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

  test('renders correct L0 nav label text in both admin pages after a language switch', async ({ page }) => {
    // issue #1041 FR-021/SC-014: the six #navXxx labels must render correctly
    // regardless of whether a consumer page still keeps its own i18n
    // override (admin pages' own overrides are removed in a later PR group,
    // not this one) -- this asserts the actual rendered contract, not
    // whether page-level override source code exists (AC-014.1).
    const adminPages = [
      '/pages/admin/user-management.html',
      '/pages/admin/role-settings.html',
    ];
    const zhLabels: Record<string, string> = {
      navDashboard: '儀表板',
      navTaskManagement: '任務管理',
      navAnnotation: '標記作業',
      navDataset: '資料集分析',
      navAdmin: '系統管理',
      navProfile: '個人設定',
    };
    const enLabels: Record<string, string> = {
      navDashboard: 'Dashboard',
      navTaskManagement: 'Task Management',
      navAnnotation: 'Annotation',
      navDataset: 'Dataset Analytics',
      navAdmin: 'System Administration',
      navProfile: 'Profile',
    };

    for (const url of adminPages) {
      await page.addInitScript(() => {
        window.localStorage.setItem('labelsuite.lang', 'zh');
      });
      await page.goto(url);

      for (const [navId, text] of Object.entries(zhLabels)) {
        await expect(page.locator(`#${navId}`)).toHaveText(text);
      }

      await page.locator('#langToggle').click();

      for (const [navId, text] of Object.entries(enLabels)) {
        await expect(page.locator(`#${navId}`)).toHaveText(text);
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
