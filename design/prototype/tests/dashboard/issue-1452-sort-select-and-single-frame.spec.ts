/**
 * Dashboard sort select token styling and single-frame user view (issue #1452)
 *
 *   - The annotator/reviewer sort <select> must look like the task-list
 *     filter-select: token radius, a visible border and token background
 *     (so dark mode does not render a white native control).
 *   - The user view must not nest a bordered .workflow-role-card inside a
 *     bordered .panel (card-in-card double frame).
 */
import { test, expect } from '../fixtures';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';

const SORT_TARGETS = [
  { scenario: 'annotator', selectId: 'annotatorSortSelect' },
  { scenario: 'reviewer', selectId: 'reviewerSortSelect' },
] as const;

for (const theme of ['light', 'dark'] as const) {
  test.describe(`dashboard sort select uses tokens, ${theme} theme (#1452)`, () => {
    for (const { scenario, selectId } of SORT_TARGETS) {
      test(`${scenario}: #${selectId} has token radius, border and background`, async ({ page }) => {
        await page.goto(`${DASHBOARD_URL}?scenario=${scenario}`);
        await page.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);
        const select = page.locator(`#${selectId}`);
        await expect(select).toBeVisible();

        const result = await page.evaluate((id) => {
          const el = document.getElementById(id) as HTMLElement;
          const probe = document.createElement('div');
          probe.style.background = 'var(--color-white)';
          probe.style.borderRadius = 'var(--radius-md)';
          document.body.appendChild(probe);
          const ps = getComputedStyle(probe);
          const cs = getComputedStyle(el);
          const out = {
            radius: cs.borderTopLeftRadius,
            borderTopWidth: cs.borderTopWidth,
            background: cs.backgroundColor,
            probeBackground: ps.backgroundColor,
            probeRadius: ps.borderTopLeftRadius,
          };
          probe.remove();
          return out;
        }, selectId);

        expect(parseFloat(result.radius)).toBeGreaterThan(0);
        expect(result.radius).toBe(result.probeRadius);
        expect(parseFloat(result.borderTopWidth)).toBeGreaterThan(0);
        expect(result.background).toBe(result.probeBackground);
      });
    }
  });
}

for (const theme of ['light', 'dark'] as const) {
  test(`user view has no bordered card inside a bordered panel, ${theme} theme (#1452)`, async ({ page }) => {
    await page.goto(`${DASHBOARD_URL}?scenario=user`);
    await page.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);
    await expect(page.locator('#userWorkflowTitle')).toBeVisible();

    const cards = page.locator('.workflow-role-card');
    expect(await cards.count()).toBeGreaterThanOrEqual(3);

    const doubleFramed = await page.evaluate(() => {
      const visibleBorder = (el: Element) => {
        const s = getComputedStyle(el);
        const color = s.borderTopColor;
        const transparent = color === 'transparent' || /rgba\(.*,\s*0\)$/.test(color);
        return parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none' && !transparent;
      };
      return Array.from(document.querySelectorAll('.workflow-role-card'))
        .filter((card) => visibleBorder(card))
        .filter((card) => {
          const panel = card.closest('.panel');
          return panel !== null && visibleBorder(panel);
        }).length;
    });

    expect(doubleFramed).toBe(0);
    await expect(page.locator('#userWorkflowTitle')).toBeVisible();
  });
}
