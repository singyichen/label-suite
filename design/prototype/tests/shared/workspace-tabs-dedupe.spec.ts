/* Red tests for Workspace Tabs (specs/shared/019-workspace-tabs/spec.md),
 * issue #1075 sub-group G2a -- User Story 3 (AC-3.1 through AC-3.4): the
 * "頁面種類 → 去重鍵對照表" (spec 019 規格常數, FR-006), the single source
 * of truth for which pages dedupe by what key.
 *
 * No implementation exists yet (G2a is Red-only). Every test below is
 * expected to FAIL until a later G2a Green task adds a tab bar matching the
 * selector contract in `_workspace-tabs-helpers.ts`.
 */
import { test, expect } from '@playwright/test';
import { workspaceTabs, setDesktopViewport } from './_workspace-tabs-helpers';
import { buildWorkspaceUrl } from '../annotation/_workspace-helpers';

// T001 (task-list.data.js): nameZh '醫療文本情感分類'; its
// DEFAULT_ANNOTATION_PROGRESS seed has round 'r1' and an 'official' bucket,
// so both ap_stage values below are valid per task-detail.html's own
// URL_VIEW_STATE validator.
const TASK_DETAIL_R1_URL = '/pages/task-management/task-detail.html?task_id=T001&ap_stage=r1';
const TASK_DETAIL_OFFICIAL_URL = '/pages/task-management/task-detail.html?task_id=T001&ap_stage=official';

test.describe('Workspace tabs — AC-3.1 annotation-workspace dedupes by task id + mode', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('opening the same task\'s annotate-mode workspace twice (different sample_id/run_type) stays one tab', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'official_run' }));
    await expect(workspaceTabs(page)).toHaveCount(1);

    // A different entry link for the SAME task + mode, but a differing
    // run_type query value -- per spec 019 Q3, the dedupe key is task id +
    // mode only, so this must collapse into the existing tab, not open a
    // second one.
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'dry_run' }));
    await expect(workspaceTabs(page)).toHaveCount(1);
    await expect(workspaceTabs(page).nth(0)).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('Workspace tabs — AC-3.2 annotate vs review open separate tabs', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('the same task\'s annotate and review workspaces each get their own tab', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'official_run' }));
    await expect(workspaceTabs(page)).toHaveCount(1);

    // role=reviewer on the SAME task_id -- mode differs (annotate vs
    // review, spec 019 Q24 / WORKSPACE_PAGE_MODES), so this is a second,
    // independent tab rather than a dedupe hit on the one above.
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'official_run' }));
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(2);
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('Workspace tabs — AC-3.3 task-new is a singleton tab', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('triggering "create task" from two different entry points reuses the one task-new tab', async ({ page }) => {
    await page.goto('/pages/dashboard/dashboard.html');
    // Entry point 1: dashboard's leader-workflow CTA.
    await page.locator('#ctaLeaderBtn').click();
    await expect(page).toHaveURL(/task-management\/task-new\.html$/);
    let tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(2); // [dashboard, task-new*]
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');

    // Open a third, unrelated tab so task-new is no longer rightmost and no
    // longer active -- makes the dedupe-vs-append distinction unambiguous.
    await page.goto('/pages/task-management/task-list.html');
    tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(3); // [dashboard, task-new, task-list*]

    // Entry point 2: task-list's own "new task" CTA, a different button on
    // a different page than entry point 1.
    await page.locator('#newTaskBtn').click();
    await expect(page).toHaveURL(/task-management\/task-new\.html$/);
    tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(3); // unchanged -- switched, not duplicated (Q8)
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'false');
  });
});

test.describe('Workspace tabs — AC-3.4 task-detail dedupes by full normalized URL', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('the same task\'s r1 and official ap_stage each get their own task-detail tab', async ({ page }) => {
    await page.goto(TASK_DETAIL_R1_URL);
    await expect(workspaceTabs(page)).toHaveCount(1);

    // Differing ap_stage is part of task-detail's full-URL dedupe key
    // (spec 019 Q16) -- a second, independent tab, not a dedupe hit.
    await page.goto(TASK_DETAIL_OFFICIAL_URL);
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(2);
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');

    // Re-visiting the exact same ap_stage=official URL must still dedupe
    // (full-URL match), confirming the above wasn't appending on every nav.
    await page.goto(TASK_DETAIL_OFFICIAL_URL);
    await expect(tabs).toHaveCount(2);
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  });
});
