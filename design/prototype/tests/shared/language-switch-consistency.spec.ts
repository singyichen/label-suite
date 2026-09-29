/**
 * Shared language-switch consistency across sidebar consumer pages: the
 * mobile toggle must stay in sync with the desktop one, and admin nav labels
 * must remain translatable. The source-level contracts this file used to hold
 * (shared-API delegation, the user-management i18n key, the assets/tokens.css
 * serif fallback stack) moved to tests-node/shared-page-contracts.test.mjs
 * under issue #1059 — they read files from disk and render nothing.
 *
 * Traceability: specs/shared/008-sidebar-navbar-shared/spec.md
 *   FR-009, FR-009A, FR-009B, SC-006, SC-006A, FR-021, SC-014
 */
import { test, expect } from '@playwright/test';

const mobileSidebarPages = [
  '/pages/dashboard/dashboard.html',
  '/pages/admin/user-management.html',
  '/pages/admin/role-settings.html',
];

test.describe('Prototype global language switch implementation', () => {
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
    // whether page-level override source code exists.
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
});
