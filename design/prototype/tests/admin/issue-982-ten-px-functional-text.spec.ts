/**
 * Traceability: issue #982 — 8 spots of functional text at 10px, below the
 * design-system minimum --text-label (12px, design/prototype/assets/tokens.css:67,
 * design/system/MASTER.md:414). This file covers the 2 spots that live in
 * design/prototype/pages/admin/role-settings.html (inline <style>). Each
 * assertion reads the real rendered getComputedStyle() font-size — never the
 * CSS source text.
 *
 * Follow-up to issue #973, which fixed the same class of problem in
 * annotation-workspace.html.
 *
 * RED (current state): both assertions below FAIL because the inline
 * <style> still declares `font-size: 10px` for .task-role-badge and
 * .readonly-note. GREEN (after fix): each rule becomes
 * `font-size: var(--text-label)` (12px) and these assertions pass unchanged.
 *
 * Navigation matches the pre-existing role-settings test's plain goto
 * (tests/admin/role-settings.spec.ts:248) — both elements are present on
 * initial page load, no interaction required.
 */
import { test, expect } from '@playwright/test';

const ROLE_SETTINGS_URL = '/pages/admin/role-settings.html';
const EXPECTED_FONT_SIZE = '12px';

test.describe('Issue #982 — role-settings.html functional text at 10px', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROLE_SETTINGS_URL);
  });

  // #7: .task-role-badge (role-settings.html:209), the "需任務角色" pill shown
  // next to permission rows that require a scoped task role.
  test('renders .task-role-badge at the design-system label size', async ({ page }) => {
    const badge = page.locator('.task-role-badge').first();
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('需任務角色');
    await expect(badge).toHaveCSS('font-size', EXPECTED_FONT_SIZE);
  });

  // #8: .readonly-note (role-settings.html:225), the "（唯讀）" note attached
  // to a read-only permission cell.
  test('renders .readonly-note at the design-system label size', async ({ page }) => {
    const note = page.locator('#readonlyNote_task_detail_view');
    await expect(note).toBeVisible();
    await expect(note).toHaveText('（唯讀）');
    await expect(note).toHaveCSS('font-size', EXPECTED_FONT_SIZE);
  });
});
