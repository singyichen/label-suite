import { test, expect } from '@playwright/test';

/**
 * Red test for openspec/changes/1075-workspace-tabs-shared-008 FR-016H.
 *
 * Display/listing contract ONLY: the shortcut overview modal's "頁籤"
 * (tabs) section. The underlying Alt+1..8 / Alt+W trigger and
 * editable-target suppression behavior is owned by
 * specs/shared/019-workspace-tabs/spec.md FR-013 and already covered by
 * tests/shared/workspace-tabs-shortcuts.spec.ts -- not duplicated here.
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
 *   - Both rows live directly under the new section (not merged into one row),
 *     matching the existing FR-016E "one shortcut, one row" rule.
 *   - English translations (via `updateShortcutHelpLanguage()` / `shortcutI18n`)
 *     are not pinned to an exact string -- only required to contain "tab"
 *     (case-insensitive) in the title and each row's label, and "switch" /
 *     "close" respectively in the two row labels, consistent with how the
 *     three existing sections already re-translate under `#langToggle`.
 */
test.describe('Shortcut overview — workspace tabs section (FR-016H)', () => {
  async function openShortcutOverview(page: import('@playwright/test').Page) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/pages/dashboard/dashboard.html');
    await page.getByTestId('shortcut-help-button').click();
    await expect(page.locator('#shortcutHelpModal')).toBeVisible();
  }

  test('lists a distinct "頁籤" section with exactly two independent, non-merged rows', async ({ page }) => {
    await openShortcutOverview(page);

    const section = page.getByTestId('shortcut-help-section-tabs');
    await expect(section).toBeVisible();
    await expect(section.locator('#shortcutTabsTitle')).toContainText('頁籤');

    // Both rows must live under the new section and be genuinely separate
    // DOM rows -- not merged into a single row (FR-016H referencing FR-016E).
    await expect(section.locator('.shortcut-help-row')).toHaveCount(2);

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
  });
});
