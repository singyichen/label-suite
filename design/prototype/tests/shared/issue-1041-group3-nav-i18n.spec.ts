/**
 * L0 nav label i18n regression guard for the three pages/account and
 * pages/dataset consumer pages touched by issue #1041 group 3
 * (pages/account/profile.html, pages/dataset/dataset-analysis-detail.html,
 * pages/dataset/dataset-analysis-list.html).
 *
 * Group 3 removes each page's own now-redundant #navXxx label override in
 * favor of the shared sidebar component (pages/shared/sidebar.js) as the
 * sole source. Before that removal there was zero coverage asserting the
 * *rendered* nav text on these three pages in either language -- this test
 * establishes that baseline so the removal (a separate PR) cannot silently
 * regress it, mirroring the admin-pages case added in PR group 2
 * (issue #1018 precedent: "no coverage" already bit this branch once
 * during a similar removal).
 *
 * Traceability: specs/shared/008-sidebar-navbar-shared/spec.md
 *   FR-021, SC-014, AC-014.1
 */
import { test, expect } from '@playwright/test';

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

const pages = [
  { name: 'account/profile.html', url: '/pages/account/profile.html' },
  {
    name: 'dataset/dataset-analysis-detail.html',
    url: '/pages/dataset/dataset-analysis-detail.html?task_id=T102',
  },
  { name: 'dataset/dataset-analysis-list.html', url: '/pages/dataset/dataset-analysis-list.html' },
];

test.describe('Issue #1041 group 3 -- nav label i18n regression guard', () => {
  for (const { name, url } of pages) {
    test(`renders correct L0 nav label text in ${name} after a language switch`, async ({ page }) => {
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
    });
  }
});
