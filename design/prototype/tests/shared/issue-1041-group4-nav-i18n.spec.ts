/**
 * L0 nav label i18n regression guard for the three pages/task-management
 * consumer pages touched by issue #1041 group 4 (pages/task-management/
 * task-detail.html, task-list.html, task-new.html).
 *
 * Group 4 removes each page's own now-redundant #navXxx label override in
 * favor of the shared sidebar component (pages/shared/sidebar.js) as the
 * sole source. Before that removal there was zero coverage asserting the
 * *rendered* nav text on these three pages in either language -- this test
 * establishes that baseline so the removal (a separate PR) cannot silently
 * regress it, mirroring the pattern added in PR group 3
 * (issue #1041 group 3: design/prototype/tests/shared/
 * issue-1041-group3-nav-i18n.spec.ts).
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
  {
    name: 'task-management/task-detail.html',
    url: '/pages/task-management/task-detail.html?task_id=T001',
  },
  { name: 'task-management/task-list.html', url: '/pages/task-management/task-list.html' },
  { name: 'task-management/task-new.html', url: '/pages/task-management/task-new.html' },
];

test.describe('Issue #1041 group 4 -- nav label i18n regression guard', () => {
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
