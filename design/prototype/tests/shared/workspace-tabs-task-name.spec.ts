/* Red tests for issue #1103 (specs/shared/019-workspace-tabs/spec.md
 * FR-010 / AC-1.6) -- a task-detail workspace tab's title collapses to its
 * bare stage text (e.g. "試標 R1") once the user navigates to ANY page that
 * does not itself provide `window.LabelSuiteTaskListData` (e.g.
 * account/profile.html), because `resolveWorkspaceTaskName()`
 * (sidebar.js:~804) only ever reads the CURRENT page's own data global and
 * `computeWorkspaceTabLabel()` (sidebar.js:~820) falls back to nothing when
 * that lookup returns ''. Two different task-detail tabs opened at the same
 * stage (e.g. T001 and T002, both dry-run round 1) become visually
 * indistinguishable the moment the user visits such a page.
 *
 * No implementation exists yet for persisting/resolving a task-detail tab's
 * name independently of the currently-mounted page's own data global.
 * Every test below is expected to FAIL against current
 * `design/prototype/pages/shared/sidebar.js` on `origin/main`.
 *
 * Deviation from the task brief: both task-detail tabs below are opened at
 * the SAME stage (ap_stage=r1 for both T001 and T002) rather than T001's
 * dry-run vs T002's own fixture runType ('dry_run' for T002, but
 * task-detail.html's ANNOTATION_PROGRESS_BY_TASK has no T001/T002 override,
 * so DEFAULT_ANNOTATION_PROGRESS -- which includes both an r1 round and an
 * official section -- applies to both ids regardless of runType; either
 * ap_stage value is valid for either task id per task-detail.html's own
 * URL_VIEW_STATE validator). Same-stage is deliberate: with differing
 * stage badges the stage text alone ("試標 R1" vs "正式") already
 * distinguishes the two tabs, which would mask the actual bug AC-1.6
 * exists to prevent -- it only manifests when two task-detail tabs share a
 * stage and must be told apart by task name alone.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import { workspaceTabs, setDesktopViewport, TAB_STORAGE_KEY } from './_workspace-tabs-helpers';

const TASK_DETAIL_T001_R1_URL = '/pages/task-management/task-detail.html?task_id=T001&ap_stage=r1';
const TASK_DETAIL_T002_R1_URL = '/pages/task-management/task-detail.html?task_id=T002&ap_stage=r1';
const PROFILE_URL = '/pages/account/profile.html';

// task-list.data.js (grep-verified): T001 / T002 names.
const TASK_NAME_ZH_T001 = '醫療文本情感分類';
const TASK_NAME_EN_T001 = 'Medical Text Sentiment Classification';
const TASK_NAME_ZH_T002 = '癌症歷程情緒多標籤分類';
const TASK_NAME_EN_T002 = 'Cancer Journey Emotion Multi-label Classification';

// Updated for issue #1099 G2 (MODIFIED FR-002): the mobile-only
// `workspace-tab-mobile-toggle`/`-mobile-dropdown`/`-mobile-item` widget
// these locators originally targeted is retired in favor of one shared
// overview-menu component (FR-023) used by both desktop and mobile --
// repointed to its testids so this file's own task-name-persistence
// assertions (unrelated to the widget itself) keep covering mobile parity.
// Mirrors workspace-tabs-overview-menu.spec.ts's own local
// selector-contract helpers (not exported from _workspace-tabs-helpers.ts,
// so each spec file in this family defines its own small locator functions
// over the same testids rather than importing across sibling spec files).
function mobileToggle(page: Page): Locator {
  return page.getByTestId('workspace-tab-overview-trigger');
}

function mobileDropdown(page: Page): Locator {
  return page.getByTestId('workspace-tab-overview-menu');
}

function mobileItems(page: Page): Locator {
  return mobileDropdown(page).getByTestId('workspace-tab-overview-item');
}

test.describe('Workspace tabs — FR-010/AC-1.6 task name persists across pages (desktop, zh)', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('both open task-detail tabs keep their own task name after navigating to a page with no task-list data, and stage badges stay correct', async ({ page }) => {
    await page.goto(TASK_DETAIL_T001_R1_URL);
    await expect(workspaceTabs(page)).toHaveCount(1);

    // Dedupe smoke (item 7): revisiting the same URL must reuse the tab,
    // not open a second one -- this family's own dedupe suite
    // (workspace-tabs-core.spec.ts AC-1.3) covers this exhaustively; this
    // is only a guard that fixing the name bug below doesn't regress it.
    await page.goto(TASK_DETAIL_T001_R1_URL);
    await expect(workspaceTabs(page)).toHaveCount(1);

    await page.goto(TASK_DETAIL_T002_R1_URL);
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(2);

    // Navigate to a page that provides NO window.LabelSuiteTaskListData at
    // all -- resolveWorkspaceTaskName() can only read the CURRENT page's
    // own data global, so both stored task-detail tabs become
    // unresolvable here. This is the bug under test.
    await page.goto(PROFILE_URL);
    await expect(tabs).toHaveCount(3);

    const t001Tab = tabs.nth(0);
    const t002Tab = tabs.nth(1);
    await expect(t001Tab).toHaveAttribute('aria-selected', 'false');
    await expect(t002Tab).toHaveAttribute('aria-selected', 'false');

    await expect(t001Tab).toContainText(TASK_NAME_ZH_T001);
    await expect(t002Tab).toContainText(TASK_NAME_ZH_T002);

    const t001Text = (await t001Tab.textContent()) ?? '';
    const t002Text = (await t002Tab.textContent()) ?? '';
    expect(t001Text).not.toBe(t002Text);

    // Stage badge preserved (item 5): folded in here rather than a
    // separate test -- both tabs were opened at ap_stage=r1 (dry_run
    // round 1), and the attribute must still reflect that after navigating
    // away to a different page kind.
    await expect(t001Tab).toHaveAttribute('data-stage-badge', 'dry_run');
    await expect(t002Tab).toHaveAttribute('data-stage-badge', 'dry_run');
  });
});

test.describe('Workspace tabs — FR-010/AC-1.6 task name persistence, mobile dropdown parity', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
  });

  test('mobile dropdown items show the same distinct task names after navigating to a page with no task-list data', async ({ page }) => {
    await page.goto(TASK_DETAIL_T001_R1_URL);
    await page.goto(TASK_DETAIL_T002_R1_URL);
    await page.goto(PROFILE_URL);

    await mobileToggle(page).click();
    const items = mobileItems(page);
    await expect(items).toHaveCount(3);

    await expect(items.nth(0)).toContainText(TASK_NAME_ZH_T001);
    await expect(items.nth(1)).toContainText(TASK_NAME_ZH_T002);
  });
});

test.describe('Workspace tabs — FR-010/AC-1.6 task name persists across a reload on a non-data page', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('reloading account/profile.html does not lose the stored task names', async ({ page }) => {
    await page.goto(TASK_DETAIL_T001_R1_URL);
    await page.goto(TASK_DETAIL_T002_R1_URL);
    await page.goto(PROFILE_URL);
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(3);

    await page.reload();

    await expect(tabs).toHaveCount(3);
    await expect(tabs.nth(0)).toContainText(TASK_NAME_ZH_T001);
    await expect(tabs.nth(1)).toContainText(TASK_NAME_ZH_T002);
  });
});

test.describe('Workspace tabs — FR-010/AC-1.6 task name translates through the shared language toggle', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('en: switching language via #langToggle before navigating to profile.html shows English task names', async ({ page }) => {
    await page.goto(TASK_DETAIL_T001_R1_URL);
    await page.goto(TASK_DETAIL_T002_R1_URL);
    // Toggle-then-navigate sequencing, matching
    // workspace-tabs-close-badge.spec.ts's own EN assertion: toggle while
    // still on a task-detail page, then navigate -- the destination page
    // mounts fresh already in English.
    await page.locator('#langToggle').click();
    await page.goto(PROFILE_URL);

    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(3);
    await expect(tabs.nth(0)).toContainText(TASK_NAME_EN_T001);
    await expect(tabs.nth(1)).toContainText(TASK_NAME_EN_T002);
  });
});

test.describe('Workspace tabs — FR-010/AC-1.6 safe fallback when a task name cannot be resolved at all', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('two task-detail tabs with no resolvable name are still distinguishable by taskId', async ({ page }) => {
    // Seeds two task-detail tab entries directly into sessionStorage for
    // fake task ids (T901/T902) that exist in no fixture on any page, so
    // resolveWorkspaceTaskName() cannot resolve a name for them no matter
    // which page is current -- isolating the fallback behavior from the
    // cross-page-persistence mechanism exercised by the tests above.
    const seededState = {
      tabs: [
        {
          dedupeKey: '/pages/task-management/task-detail.html?ap_stage=r1&task_id=T901',
          url: '/pages/task-management/task-detail.html?task_id=T901&ap_stage=r1',
          pageKind: 'task-detail',
          taskId: 'T901',
          mode: null,
          stageBadge: 'dry_run',
          stageRound: '1',
          lastActiveAt: 1,
        },
        {
          dedupeKey: '/pages/task-management/task-detail.html?ap_stage=r1&task_id=T902',
          url: '/pages/task-management/task-detail.html?task_id=T902&ap_stage=r1',
          pageKind: 'task-detail',
          taskId: 'T902',
          mode: null,
          stageBadge: 'dry_run',
          stageRound: '1',
          lastActiveAt: 2,
        },
      ],
      activeIndex: 1,
    };
    await page.addInitScript(
      ([key, state]) => {
        window.sessionStorage.setItem(key as string, JSON.stringify(state));
      },
      [TAB_STORAGE_KEY, seededState] as const
    );

    await page.goto(PROFILE_URL);
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(3);

    const fakeT901Tab = tabs.nth(0);
    const fakeT902Tab = tabs.nth(1);

    // The key assertion: the exact fallback format is not prescribed, but
    // each tab's own taskId must appear somewhere in its label so two such
    // tabs are not both rendered identically (currently both collapse to
    // the same bare "試標 R1" text with no distinguishing content at all).
    await expect(fakeT901Tab).toContainText('T901');
    await expect(fakeT902Tab).toContainText('T902');

    const fakeT901Text = (await fakeT901Tab.textContent()) ?? '';
    const fakeT902Text = (await fakeT902Tab.textContent()) ?? '';
    expect(fakeT901Text).not.toBe(fakeT902Text);
  });
});
