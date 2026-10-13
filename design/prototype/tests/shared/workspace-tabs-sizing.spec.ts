/* Red tests for issue #1280 Group G1 (openspec/changes/
 * 1280-workspace-tab-kind-chip, specs/shared/019-workspace-tabs/spec.md
 * FR-010 visual sizing; pure style, no new FR/AC -- same precedent as the
 * #1099 G1 visual suite) -- the workspace tab becomes smaller and content
 * flexible:
 *
 *   - width: `flex: 1 1 0` clamped by --workspace-tab-min-width (104px) and
 *     --workspace-tab-max-width (220px); TAB_CAP (8) tabs therefore fit in one
 *     row without horizontal scrolling on a 1280px desktop viewport.
 *   - typography: .workspace-tab 12px / weight 500.
 *   - icon 14px, close button 16px.
 *   - the close button is `visibility: hidden` on an inactive tab and becomes
 *     visible on :hover or :focus-within; the active tab's close button is
 *     always visible. (visibility, not display: the box keeps its slot so
 *     hover does not shift the label.)
 *   - .workspace-tab-bar keeps gap 0, padding 0 and each tab's 1px right
 *     divider (issue #1143 contract) -- guards, they hold today.
 *
 * Geometry / computed-style assertions only; no hardcoded colors. Today the
 * tab is a fixed 180px wide, 13px, 16px icon, 18px always-visible close
 * button, so everything except the bar-spacing guards fails.
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { tabBar, workspaceTabs, closeButton, setDesktopViewport } from './_workspace-tabs-helpers';
import { buildWorkspaceUrl, skipGuidelineModal } from '../annotation/_workspace-helpers';

const MIN_WIDTH_PX = 104;
const TOLERANCE_PX = 1;

// Eight distinct dedupe keys (same set workspace-tabs-cap.spec.ts uses), so
// TAB_CAP (8) tabs are open and no LRU eviction happens.
const EIGHT_TAB_URLS = [
  '/pages/dashboard/dashboard.html',
  '/pages/task-management/task-list.html',
  '/pages/dataset/dataset-analysis-list.html',
  '/pages/admin/user-management.html',
  '/pages/task-management/task-new.html',
  buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'official_run' }),
  buildWorkspaceUrl({ task_id: 'T002', sample_id: 'emo-001', role: 'annotator', run_type: 'official_run' }),
  '/pages/task-management/task-detail.html?task_role=project_leader&task_id=T001&ap_stage=r1',
];

async function openEightTabs(page: Page): Promise<void> {
  for (const url of EIGHT_TAB_URLS) await page.goto(url);
  await expect(workspaceTabs(page)).toHaveCount(8);
}

/** Moves the pointer off the tab bar so no tab is :hover. */
async function parkPointer(page: Page): Promise<void> {
  await page.mouse.move(1, 1);
}

test.beforeEach(async ({ page }) => {
  await setDesktopViewport(page);
  await skipGuidelineModal(page);
});

test.describe('Workspace tabs sizing (#1280 G1) — width', () => {
  test('TAB_CAP (8) tabs sit in one row, each at least the 104px minimum, with no horizontal scrolling', async ({ page }) => {
    test.setTimeout(90_000);
    await openEightTabs(page);

    const tabs = workspaceTabs(page);
    const boxes = [];
    for (let i = 0; i < 8; i++) {
      const box = await tabs.nth(i).boundingBox();
      expect(box).not.toBeNull();
      boxes.push(box!);
    }
    for (const box of boxes) {
      expect(box.width).toBeGreaterThanOrEqual(MIN_WIDTH_PX - TOLERANCE_PX);
      expect(Math.abs(box.y - boxes[0].y)).toBeLessThanOrEqual(TOLERANCE_PX);
    }
    // Same row, strictly left-to-right.
    for (let i = 1; i < 8; i++) expect(boxes[i].x).toBeGreaterThan(boxes[i - 1].x);

    // 8 x 104px fits the 1280px desktop bar: nothing overflows.
    const overflow = await tabBar(page).evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('Workspace tabs sizing (#1280 G1) — typography and glyph sizes', () => {
  test('tab text is 12px / weight 500', async ({ page }) => {
    await page.goto(EIGHT_TAB_URLS[0]);
    await page.goto(EIGHT_TAB_URLS[1]);
    const tab = workspaceTabs(page).first();
    await expect(tab).toHaveCSS('font-size', '12px');
    await expect(tab).toHaveCSS('font-weight', '500');
  });

  test('the page-kind icon is 14px', async ({ page }) => {
    await page.goto(EIGHT_TAB_URLS[0]);
    await page.goto(EIGHT_TAB_URLS[1]);
    const icon = workspaceTabs(page).first().locator('svg.workspace-tab-icon');
    await expect(icon).toHaveCSS('width', '14px');
    await expect(icon).toHaveCSS('height', '14px');
  });

  test('the close button is 16px', async ({ page }) => {
    await page.goto(EIGHT_TAB_URLS[0]);
    await page.goto(EIGHT_TAB_URLS[1]);
    const close = closeButton(workspaceTabs(page).first());
    await expect(close).toHaveCSS('width', '16px');
    await expect(close).toHaveCSS('height', '16px');
  });

  test('tab padding is 6px 10px and the gap between icon, label and close is 6px', async ({ page }) => {
    await page.goto(EIGHT_TAB_URLS[0]);
    await page.goto(EIGHT_TAB_URLS[1]);
    const tab = workspaceTabs(page).first();

    await expect(tab).toHaveCSS('padding-top', '6px');
    await expect(tab).toHaveCSS('padding-bottom', '6px');
    await expect(tab).toHaveCSS('padding-left', '10px');
    await expect(tab).toHaveCSS('padding-right', '10px');
    await expect(tab).toHaveCSS('column-gap', '6px');
  });
});

test.describe('Workspace tabs sizing (#1280 G1) — close button visibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EIGHT_TAB_URLS[0]);
    await page.goto(EIGHT_TAB_URLS[1]); // tab 0 inactive, tab 1 active
    await expect(workspaceTabs(page)).toHaveCount(2);
    await parkPointer(page);
  });

  test('an inactive tab hides its close button (visibility: hidden) until hovered', async ({ page }) => {
    const inactive = workspaceTabs(page).nth(0);
    await expect(inactive).toHaveAttribute('aria-selected', 'false');
    await expect(closeButton(inactive)).toHaveCSS('visibility', 'hidden');

    await inactive.hover();
    await expect(closeButton(inactive)).toHaveCSS('visibility', 'visible');

    await parkPointer(page);
    await expect(closeButton(inactive)).toHaveCSS('visibility', 'hidden');
  });

  test('an inactive tab shows its close button while it holds focus (:focus-within)', async ({ page }) => {
    const inactive = workspaceTabs(page).nth(0);
    await expect(closeButton(inactive)).toHaveCSS('visibility', 'hidden');

    await inactive.focus();
    await expect(inactive).toBeFocused();
    await parkPointer(page); // rule out :hover as the cause
    await expect(closeButton(inactive)).toHaveCSS('visibility', 'visible');
  });

  test('the active tab keeps its close button visible without hover or focus', async ({ page }) => {
    const active = workspaceTabs(page).nth(1);
    await expect(active).toHaveAttribute('aria-selected', 'true');
    await parkPointer(page);
    await expect(closeButton(active)).toHaveCSS('visibility', 'visible');
  });

  test('hiding keeps the close button box (visibility, not display), so the label does not shift on hover', async ({ page }) => {
    const inactive = workspaceTabs(page).nth(0);
    const close = closeButton(inactive);
    await expect(close).toHaveCSS('visibility', 'hidden');
    await expect(close).not.toHaveCSS('display', 'none');
    const before = await close.boundingBox();
    expect(before).not.toBeNull();
    expect(before!.width).toBeGreaterThan(0);

    await inactive.hover();
    const after = await close.boundingBox();
    expect(after).not.toBeNull();
    expect(Math.abs(after!.x - before!.x)).toBeLessThanOrEqual(TOLERANCE_PX);
  });
});

test.describe('Workspace tabs sizing (#1280 G1) — bar spacing guards (issue #1143 contract unchanged)', () => {
  test('the bar keeps gap 0 / padding 0 and every tab keeps a 1px right divider', async ({ page }) => {
    await page.goto(EIGHT_TAB_URLS[0]);
    await page.goto(EIGHT_TAB_URLS[1]);
    const bar = tabBar(page);
    await expect(bar).toHaveCSS('column-gap', '0px');
    await expect(bar).toHaveCSS('padding-left', '0px');
    await expect(bar).toHaveCSS('padding-right', '0px');
    await expect(bar).toHaveCSS('padding-top', '0px');
    await expect(bar).toHaveCSS('padding-bottom', '0px');

    const tabs = workspaceTabs(page);
    for (let i = 0; i < 2; i++) {
      await expect(tabs.nth(i)).toHaveCSS('border-right-width', '1px');
      await expect(tabs.nth(i)).toHaveCSS('border-right-style', 'solid');
      await expect(tabs.nth(i)).not.toHaveCSS('border-right-color', 'rgba(0, 0, 0, 0)');
    }
  });
});
