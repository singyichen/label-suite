/* Red tests for issue #1099 Group G1 (specs/shared/019-workspace-tabs/
 * spec.md FR-010; openspec/changes/1099-workspace-tabs-overview-menu/
 * design.md "G1 — 視覺對齊") -- visually aligning the workspace tab bar
 * with NoteCraft's tab style, per the maintainer's follow-up ruling that
 * the current active-tab color (`--color-surface`, Violet 50, full-ring
 * `border`) is "too jarring" and must become low-saturation/neutral
 * instead. G1 adds NO new FR/AC (pure style, per the issue and design.md's
 * own "G1 明確不做" scope boundary) -- every case below is a direct Red
 * test against design.md's locked G1 decisions, not against any new
 * Scenario text.
 *
 * None of the behavior below exists yet in
 * `design/prototype/pages/shared/sidebar.js` / `sidebar.css` on
 * `origin/main`: `.workspace-tab` has no fixed width
 * (`flex-shrink: 0` only), `.workspace-tab-label` has no CSS rule at all
 * (no truncation), `renderWorkspaceTabBar()` never sets `tabEl.title`,
 * no per-page-kind icon is ever inserted, `.workspace-tab.active` still
 * uses `background: var(--color-surface)` (`#F5F3FF` / `rgb(245, 243,
 * 255)`) plus a full `border-color: var(--color-border)` ring, and no
 * `.workspace-tab:hover`/`:focus-visible` rule exists. Confirmed by a
 * direct Playwright probe against the unmodified prototype dev server
 * before writing this file (see PR body for the probe output).
 *
 * NEW selector contract this file defines for the Green implementer
 * (mirrors `workspace-tabs-mobile.spec.ts`'s own precedent of a new file
 * introducing a fresh contract where none existed): the per-page-kind icon
 * `workspaceTabIconFor()` inserts into each tab (design.md G1) must carry
 * `class="workspace-tab-icon"` on its `<svg>` -- `.workspace-tab-close`
 * already renders its own unclassed `<svg>` for the close glyph, so a bare
 * `tab.locator('svg')` would ambiguously match both; `svg.workspace-tab-icon`
 * disambiguates. This mirrors the existing `class="nav-icon"` convention
 * `navItems` already uses for the L0 sidebar nav icons this feature reuses
 * (sidebar.js ~1472-1520).
 *
 * Case-by-case Red status (see PR body for the full probe transcript):
 *   - 1/2/3/6 (fixed width, `title` attribute, icons, hover/focus states)
 *     are brand new behavior and FAIL today.
 *   - 4 (active tab background != the old `rgb(245, 243, 255)`, border
 *     matches inactive) is today's targeted regression: it also FAILS,
 *     because today's code DOES use that exact violet and DOES add a
 *     border-color ring only on `.active`.
 *   - 5 (stage badge legibility after truncation) and 7 (375px no extra
 *     page-level horizontal overflow) already PASS against unmodified
 *     code today -- kept as locked-in regression guards per the G1 task
 *     brief (tasks.md 1.5/1.7), not dropped; each has its own comment
 *     explaining why it is a guard rather than new Red content.
 */
import { test, expect, type Locator } from '@playwright/test';
import { workspaceTabs, setDesktopViewport } from './_workspace-tabs-helpers';
import { buildWorkspaceUrl, skipGuidelineModal } from '../annotation/_workspace-helpers';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';
const TASK_LIST_URL = '/pages/task-management/task-list.html';
const DATASET_LIST_URL = '/pages/dataset/dataset-analysis-list.html';
const ANNOTATION_WORKSPACE_URL = buildWorkspaceUrl({
  task_id: 'T001',
  sample_id: 'sent-001',
  role: 'annotator',
  run_type: 'official_run',
});

// T016 (task-list.data.js, grep-verified) has this family's longest
// nameZh/nameEn -- the deliberately-long title this file truncates/
// ellipsizes against. ap_stage=official is always a valid URL_VIEW_STATE
// value (task-detail.html getProgressStageValues()), independent of which
// trial rounds a given task happens to have.
const LONG_TITLE_URL = '/pages/task-management/task-detail.html?task_id=T016&ap_stage=official';
const LONG_TITLE_STAGE_TEXT_ZH = '正式';
const LONG_TITLE_TASK_NAME_ZH = '審核流程示範：正式標記（輪派、仲裁與最終例外）';
const LONG_TITLE_LABEL_ZH = LONG_TITLE_STAGE_TEXT_ZH + ' ' + LONG_TITLE_TASK_NAME_ZH;

// Known current `--color-surface` (Violet 50) RGB -- the value the
// maintainer judged "too jarring" for an active tab (issue #1099 follow-up).
const OLD_ACTIVE_SURFACE_RGB = 'rgb(245, 243, 255)';

function labelOf(tab: Locator): Locator {
  return tab.locator('.workspace-tab-label');
}

function iconOf(tab: Locator): Locator {
  return tab.locator('svg.workspace-tab-icon');
}

async function computedWidthPx(locator: Locator): Promise<number> {
  return locator.evaluate((el) => parseFloat(getComputedStyle(el).width));
}

test.describe('Workspace tabs visual — fixed width and label truncation (G1)', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('every open tab has equal computed width regardless of label length, and the long-title tab ellipsizes', async ({ page }) => {
    await page.goto(DASHBOARD_URL); // short label
    await page.goto(TASK_LIST_URL); // short label
    await page.goto(DATASET_LIST_URL); // short label
    await page.goto(LONG_TITLE_URL); // deliberately long label

    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(4);

    const firstWidth = await computedWidthPx(tabs.nth(0));
    for (let i = 1; i < 4; i++) {
      const width = await computedWidthPx(tabs.nth(i));
      expect(width).toBe(firstWidth);
    }

    await expect(labelOf(tabs.nth(3))).toHaveCSS('text-overflow', 'ellipsis');
  });
});

test.describe('Workspace tabs visual — full label exposed via `title` attribute (G1)', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test("a truncated tab's title attribute equals its full, untruncated label text", async ({ page }) => {
    await page.goto(LONG_TITLE_URL);
    const tab = workspaceTabs(page).first();
    await expect(tab).toHaveAttribute('title', LONG_TITLE_LABEL_ZH);
  });
});

test.describe('Workspace tabs visual — per-page-kind icon (G1)', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
    await setDesktopViewport(page);
  });

  test('each tab has a page-kind icon, and the dashboard/task-management/annotation icons differ from each other', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_LIST_URL);
    await page.goto(ANNOTATION_WORKSPACE_URL);

    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(3);

    const dashboardIcon = iconOf(tabs.nth(0));
    const taskManagementIcon = iconOf(tabs.nth(1));
    const annotationIcon = iconOf(tabs.nth(2));
    await expect(dashboardIcon).toHaveCount(1);
    await expect(taskManagementIcon).toHaveCount(1);
    await expect(annotationIcon).toHaveCount(1);

    const dashboardIconHtml = await dashboardIcon.evaluate((el) => el.outerHTML);
    const taskManagementIconHtml = await taskManagementIcon.evaluate((el) => el.outerHTML);
    const annotationIconHtml = await annotationIcon.evaluate((el) => el.outerHTML);
    expect(dashboardIconHtml).not.toBe(taskManagementIconHtml);
    expect(dashboardIconHtml).not.toBe(annotationIconHtml);
    expect(taskManagementIconHtml).not.toBe(annotationIconHtml);
  });
});

test.describe('Workspace tabs visual — active tab uses a neutral surface, not a full ring (G1)', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('active tab border matches the inactive tab (no ring), and its background is distinguishable and not the old violet surface color', async ({ page }) => {
    await page.goto(DASHBOARD_URL); // index 0, becomes inactive
    await page.goto(TASK_LIST_URL); // index 1, active

    const tabs = workspaceTabs(page);
    const inactiveTab = tabs.nth(0);
    const activeTab = tabs.nth(1);
    await expect(inactiveTab).toHaveAttribute('aria-selected', 'false');
    await expect(activeTab).toHaveAttribute('aria-selected', 'true');

    // Only the rendered (top/right) border sides matter -- `border-bottom`
    // is `none` on both active and inactive today and stays that way, so a
    // `border-bottom-color` difference (currentColor-derived, never
    // painted) would be a false signal.
    const inactiveBorder = await inactiveTab.evaluate((el) => {
      const s = getComputedStyle(el);
      return { top: s.borderTopColor, right: s.borderRightColor };
    });
    const activeBorder = await activeTab.evaluate((el) => {
      const s = getComputedStyle(el);
      return { top: s.borderTopColor, right: s.borderRightColor };
    });
    expect(activeBorder).toEqual(inactiveBorder);

    const inactiveBg = await inactiveTab.evaluate((el) => getComputedStyle(el).backgroundColor);
    const activeBg = await activeTab.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(activeBg).not.toBe(inactiveBg);
    expect(activeBg).not.toBe(OLD_ACTIVE_SURFACE_RGB);
  });
});

test.describe('Workspace tabs visual — stage badge stays legible on a truncated tab (FR-010, G1)', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  // Judgment call (task brief item 5): this case already PASSES against
  // unmodified code today -- nothing currently truncates or hides the
  // label (no text-overflow/width rule exists yet, see the first describe
  // block above), and `[data-stage-badge]`'s color already differs from a
  // plain tab's color via the existing CSS rules (sidebar.css ~995-1001).
  // Kept as a locked-in regression guard (not dropped) because it is
  // exactly the scenario the fixed-width/ellipsis truncation above must
  // not break -- FR-010's "stays legible after truncation" requirement.
  test('a long-title, stage-badged tab keeps its badge color distinguishable and its label visible once truncated', async ({ page }) => {
    await page.goto(DASHBOARD_URL); // plain inactive baseline, index 0
    await page.goto(LONG_TITLE_URL); // stage-badged, long title, index 1
    await page.goto(TASK_LIST_URL); // active, index 2 -- keeps index 1 inactive like index 0

    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(3);
    const plainTab = tabs.nth(0);
    const badgeTab = tabs.nth(1);
    await expect(plainTab).toHaveAttribute('aria-selected', 'false');
    await expect(badgeTab).toHaveAttribute('aria-selected', 'false');
    await expect(badgeTab).toHaveAttribute('data-stage-badge', 'official_run');

    const plainColor = await plainTab.evaluate((el) => getComputedStyle(el).color);
    const badgeColor = await badgeTab.evaluate((el) => getComputedStyle(el).color);
    expect(badgeColor).not.toBe(plainColor);

    await expect(labelOf(badgeTab)).toBeVisible();
  });
});

test.describe('Workspace tabs visual — hover and keyboard-focus states are each distinguishable (G1)', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`${theme}: hover and focus-visible each differ from the default inactive tab, and from each other`, async ({ page }) => {
      await setDesktopViewport(page);
      await page.goto(DASHBOARD_URL); // index 0, inactive target
      await page.goto(TASK_LIST_URL); // index 1, active (isolates hover/focus from the active-state case in the describe block above)
      if (theme === 'dark') {
        await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      }

      const target = workspaceTabs(page).nth(0);
      const readState = () =>
        target.evaluate((el) => {
          const s = getComputedStyle(el);
          return { bg: s.backgroundColor, outlineStyle: s.outlineStyle };
        });

      const defaultState = await readState();

      await target.hover();
      const hoverState = await readState();
      await page.mouse.move(0, 0); // clear :hover before measuring focus, isolating the two states

      await target.focus();
      const focusState = await readState();
      await target.blur();

      // New Red content (item 6): no `.workspace-tab:hover` rule exists
      // today, so hover's background currently equals the default.
      expect(hoverState.bg).not.toBe(defaultState.bg);

      // Judgment call: this sub-assertion and the one below already PASS
      // today -- `.workspace-tab` has no explicit `outline`/`:focus-visible`
      // rule, so the browser's own default focus ring already makes
      // `outlineStyle` differ from the unfocused default, and that already
      // makes the hover/focus tuples distinguishable by coincidence. Kept
      // as locked-in regression guards: design.md G1 explicitly requires
      // Green to "確保 .workspace-tab.active 移除 border 後不會讓
      // :focus-visible 的 outline 被其他樣式蓋掉" (not accidentally break
      // the native ring while reworking the border/background rules).
      expect(focusState.outlineStyle).not.toBe(defaultState.outlineStyle);
      expect(hoverState.bg !== focusState.bg || hoverState.outlineStyle !== focusState.outlineStyle).toBe(true);
    });
  }
});

test.describe('Workspace tabs visual — 375px viewport: tab bar styling changes introduce no extra page-level horizontal overflow (G1)', () => {
  // Judgment call (task brief item 7): this case already PASSES today --
  // `.workspace-tab-bar` is `display: none` below 767px (sidebar.css
  // ~1021-1025; the mobile dropdown takes over instead, untouched by G1 per
  // design.md's own "G1 明確不做" scope boundary), so none of this group's
  // fixed-width/icon/truncation CSS can affect this viewport today. Kept as
  // a locked-in regression guard (tasks.md 1.7), not dropped, so a future
  // change that lets `.workspace-tab` rules leak into this breakpoint is
  // caught here.
  for (const lang of ['zh', 'en'] as const) {
    test(`${lang}: no page-level horizontal overflow with a long-title tab open`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(DASHBOARD_URL);
      if (lang === 'en') {
        await page.locator('#mobileLangToggle').click();
      }
      await page.goto(LONG_TITLE_URL);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
