import { test, expect } from '@playwright/test';

/**
 * Red test for openspec/changes/1075-workspace-tabs-shared-008 FR-016H,
 * MODIFIED by openspec/changes/1099-workspace-tabs-overview-menu's
 * specs/shared/008-sidebar-navbar-shared/spec.md delta (issue #1099 G3):
 * the "頁籤" section grows a THIRD row for the reopen-closed-tab shortcut
 * (FR-024A/FR-024B), going from "exactly two rows" to "exactly three".
 *
 * This file's own "lists a distinct 頁籤 section with exactly two
 * independent, non-merged rows" test was ALREADY PASSING before this
 * change (G2a/G2b's Green work only wired Alt+1..8/Alt+W, never touched
 * this modal). MODIFIED FR-016H's own text changes that count to three, so
 * this is a deliberate, explicit update to a previously-locked assertion
 * -- not a silent deletion (this project's "not a silent deletion"
 * convention, same as workspace-tabs-mobile.spec.ts's own retirement in
 * G2b): the row-count assertion is updated in place, and the two existing
 * rows' own assertions are left untouched below the update point.
 *
 * Display/listing contract ONLY: the shortcut overview modal's "頁籤"
 * (tabs) section. The underlying Alt+1..8 / Alt+W / Alt+Shift+T triggers
 * and editable-target suppression behavior are owned by
 * specs/shared/019-workspace-tabs/spec.md FR-013 (rows 1-2, already
 * covered by tests/shared/workspace-tabs-shortcuts.spec.ts) and FR-024A
 * (row 3, covered by tests/shared/workspace-tabs-overview-reopen-close-all
 * .spec.ts) -- not duplicated here.
 *
 * Selector contract for the Green implementer (design/prototype/pages/shared/sidebar.js
 * renderSidebar()'s shortcutHelpModal template), naming new DOM ids after the
 * existing shortcutWorkspace* / shortcutReview* convention:
 *   - New section container: `.shortcut-help-section` with
 *     `data-testid="shortcut-help-section-tabs"`, heading `id="shortcutTabsTitle"`
 *     (zh text must contain "頁籤").
 *   - Row 1 (switch to a tab by position): `.shortcut-help-row` with
 *     `data-testid="shortcut-tabs-switch-row"`, label `id="shortcutTabsSwitch"`
 *     (zh text must contain "切換" and "頁籤"), built via
 *     `keyGroup(['ALT', <some 1-8 representation>])` -- exactly 2
 *     `[data-testid="shortcut-keycap"]` children, first is the literal `ALT`
 *     keycap, second's text must contain both a "1" and an "8" digit (e.g.
 *     `keyGroup(['ALT', '1-8'])`).
 *   - Row 2 (close the active tab): `.shortcut-help-row` with
 *     `data-testid="shortcut-tabs-close-row"`, label `id="shortcutTabsClose"`
 *     (zh text must contain "關閉" and "頁籤"), built via
 *     `keyGroup(['ALT', 'W'])` -- exactly 2 `[data-testid="shortcut-keycap"]`
 *     children, literally `ALT` then `W`.
 *   - Row 3 (NEW, G3, FR-024A/FR-024B/MODIFIED FR-016H): reopen the most
 *     recently closed tab. `.shortcut-help-row` with
 *     `data-testid="shortcut-tabs-reopen-row"`, label
 *     `id="shortcutTabsReopen"` (zh text must contain "重開" and "頁籤"),
 *     built via `keyGroup(['ALT', 'SHIFT', 'T'])` -- exactly 3
 *     `[data-testid="shortcut-keycap"]` children, literally `ALT`, `SHIFT`,
 *     `T` as independent DOM elements (not merged into one string).
 *   - All three rows live directly under the section (not merged into one
 *     row), matching the existing FR-016E "one shortcut, one row" rule.
 *   - English translations (via `updateShortcutHelpLanguage()` / `shortcutI18n`)
 *     are not pinned to an exact string -- only required to contain "tab"
 *     (case-insensitive) in the title and each row's label, and "switch" /
 *     "close" / "reopen" respectively in the three row labels, consistent
 *     with how the existing sections already re-translate under `#langToggle`.
 */
test.describe('Shortcut overview — workspace tabs section (FR-016H)', () => {
  async function openShortcutOverview(page: import('@playwright/test').Page) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/pages/dashboard/dashboard.html');
    await page.getByTestId('shortcut-help-button').click();
    await expect(page.locator('#shortcutHelpModal')).toBeVisible();
  }

  test('lists a distinct "頁籤" section with exactly three independent, non-merged rows (MODIFIED FR-016H, issue #1099 G3)', async ({ page }) => {
    await openShortcutOverview(page);

    const section = page.getByTestId('shortcut-help-section-tabs');
    await expect(section).toBeVisible();
    await expect(section.locator('#shortcutTabsTitle')).toContainText('頁籤');

    // All three rows must live under the section and be genuinely separate
    // DOM rows -- not merged into a single row (FR-016H referencing FR-016E).
    // Was "exactly two" before issue #1099 G3 added the reopen row.
    await expect(section.locator('.shortcut-help-row')).toHaveCount(3);

    const switchRow = page.getByTestId('shortcut-tabs-switch-row');
    await expect(switchRow).toBeVisible();
    await expect(switchRow.locator('#shortcutTabsSwitch')).toContainText('切換');
    await expect(switchRow.locator('#shortcutTabsSwitch')).toContainText('頁籤');
    const switchKeycaps = switchRow.locator('[data-testid="shortcut-keycap"]');
    await expect(switchKeycaps).toHaveCount(2);
    await expect(switchKeycaps.nth(0)).toHaveText('ALT');
    await expect(switchKeycaps.nth(1)).toContainText('1');
    await expect(switchKeycaps.nth(1)).toContainText('8');

    const closeRow = page.getByTestId('shortcut-tabs-close-row');
    await expect(closeRow).toBeVisible();
    await expect(closeRow.locator('#shortcutTabsClose')).toContainText('關閉');
    await expect(closeRow.locator('#shortcutTabsClose')).toContainText('頁籤');
    const closeKeycaps = closeRow.locator('[data-testid="shortcut-keycap"]');
    await expect(closeKeycaps).toHaveCount(2);
    await expect(closeKeycaps.nth(0)).toHaveText('ALT');
    await expect(closeKeycaps.nth(1)).toHaveText('W');

    const reopenRow = page.getByTestId('shortcut-tabs-reopen-row');
    await expect(reopenRow).toBeVisible();
    await expect(reopenRow.locator('#shortcutTabsReopen')).toContainText('重開');
    await expect(reopenRow.locator('#shortcutTabsReopen')).toContainText('頁籤');
    const reopenKeycaps = reopenRow.locator('[data-testid="shortcut-keycap"]');
    await expect(reopenKeycaps).toHaveCount(3);
    await expect(reopenKeycaps.nth(0)).toHaveText('ALT');
    await expect(reopenKeycaps.nth(1)).toHaveText('SHIFT');
    await expect(reopenKeycaps.nth(2)).toHaveText('T');
  });

  test('translates the "頁籤" section title and both row labels through the shared language toggle', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/pages/dashboard/dashboard.html');

    // Toggle language before opening the modal -- matches the established
    // pattern in sidebar-shortcuts.spec.ts, and avoids #langToggle being
    // covered by the shortcut-help-backdrop once the modal is open.
    await page.locator('#langToggle').click();
    await page.getByTestId('shortcut-help-button').click();
    await expect(page.locator('#shortcutHelpModal')).toBeVisible();

    const section = page.getByTestId('shortcut-help-section-tabs');
    await expect(section.locator('#shortcutTabsTitle')).not.toContainText('頁籤');
    await expect(section.locator('#shortcutTabsTitle')).toContainText(/tab/i);

    const switchLabel = page.getByTestId('shortcut-tabs-switch-row').locator('#shortcutTabsSwitch');
    await expect(switchLabel).not.toContainText('切換');
    await expect(switchLabel).toContainText(/switch/i);
    await expect(switchLabel).toContainText(/tab/i);

    const closeLabel = page.getByTestId('shortcut-tabs-close-row').locator('#shortcutTabsClose');
    await expect(closeLabel).not.toContainText('關閉');
    await expect(closeLabel).toContainText(/close/i);
    await expect(closeLabel).toContainText(/tab/i);

    const reopenLabel = page.getByTestId('shortcut-tabs-reopen-row').locator('#shortcutTabsReopen');
    await expect(reopenLabel).not.toContainText('重開');
    await expect(reopenLabel).toContainText(/reopen/i);
    await expect(reopenLabel).toContainText(/tab/i);
  });
});
