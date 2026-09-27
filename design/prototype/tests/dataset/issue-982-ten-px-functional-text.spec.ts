/**
 * Traceability: issue #982 — 8 spots of functional text at 10px, below the
 * design-system minimum --text-label (12px, design/prototype/assets/tokens.css:67,
 * design/system/MASTER.md:414). This file covers the 1 spot that lives in
 * design/prototype/pages/dataset/dataset-analysis-detail.html (inline <style>).
 * The assertion reads the real rendered getComputedStyle() font-size — never
 * the CSS source text.
 *
 * Follow-up to issue #973, which fixed the same class of problem in
 * annotation-workspace.html.
 *
 * RED (current state): the assertion below FAILS because the inline <style>
 * still declares `font-size: 10px` for .stats-summary-item-label. GREEN
 * (after fix): the rule becomes `font-size: var(--text-label)` (12px) and
 * this assertion passes unchanged.
 */
import { test, expect } from '@playwright/test';

const DETAIL_URL = '/pages/dataset/dataset-analysis-detail.html';
const EXPECTED_FONT_SIZE = '12px';

test.describe('Issue #982 — dataset-analysis-detail.html functional text at 10px', () => {
  // #6: .stats-summary-item-label (dataset-analysis-detail.html:208), the
  // stat-block caption ("Mean" / "SD" / "Median" / ...) rendered in the
  // single-dimension stats summary panel. T108 is a single_dim task, per the
  // pre-existing composite-badge test
  // (tests/dataset/dataset-analysis-detail-composite-badge.spec.ts:81), and
  // the stats tab navigation matches the pre-existing i18n test
  // (tests/dataset/dataset-analysis-detail-stats-i18n.spec.ts:17).
  test('renders .stats-summary-item-label at the design-system label size', async ({ page }) => {
    await page.goto(`${DETAIL_URL}?task_id=T108&tab=stats`);

    const label = page.locator('#statsSingleDimLblMean');
    await expect(label).toBeVisible();
    await expect(label).toHaveClass(/stats-summary-item-label/);
    await expect(label).toHaveCSS('font-size', EXPECTED_FONT_SIZE);
  });
});
