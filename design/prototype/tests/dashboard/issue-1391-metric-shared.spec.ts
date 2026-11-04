/**
 * Shared .metric component extraction (issue #1391, PR-A, zero behaviour change).
 * Design-system contract: design/system/MASTER.md (not a feature-spec FR).
 *
 * Two parts:
 *  - Computed-style guard: pins the main-branch look of .metric, .metric span
 *    and .metric strong. Expected to PASS both before (Red) and after (Green).
 *  - Stylesheet request: pages/shared/metric.css must be fetched with 200.
 *    This is the Red assertion on the browser side.
 */
import { test, expect } from '../fixtures';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';

test.describe('Shared .metric component', () => {
  test('requests pages/shared/metric.css with status 200', async ({ page }) => {
    const statuses: number[] = [];
    page.on('response', (res) => {
      if (new URL(res.url()).pathname.endsWith('/pages/shared/metric.css')) {
        statuses.push(res.status());
      }
    });
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    expect(statuses, 'metric.css was never requested').not.toHaveLength(0);
    expect(statuses.every((s) => s === 200)).toBe(true);
  });

  test('computed styles of .metric are unchanged', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.locator('.scenario-pill[data-scenario="super_admin_data"]').click();
    const metric = page.locator('.metric', { has: page.locator('strong#adminTotalUsersValue') });
    await expect(metric).toBeVisible();

    const box = await metric.evaluate((el) => {
      const cs = getComputedStyle(el);
      const probe = document.createElement('div');
      probe.style.cssText = 'background: var(--color-white); border-radius: var(--radius-lg);';
      document.body.appendChild(probe);
      const p = getComputedStyle(probe);
      const expected = { background: p.backgroundColor, radius: p.borderTopLeftRadius };
      probe.remove();
      return {
        padding: cs.padding,
        radius: cs.borderTopLeftRadius,
        background: cs.backgroundColor,
        borderWidth: cs.borderTopWidth,
        borderStyle: cs.borderTopStyle,
        expected,
      };
    });
    expect(box.padding).toBe('16px');
    expect(box.radius).toBe('12px');
    expect(box.radius).toBe(box.expected.radius);
    expect(box.background).toBe(box.expected.background);
    expect(box.borderWidth).toBe('1px');
    expect(box.borderStyle).toBe('solid');

    const span = await metric.locator('span').evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        display: cs.display,
        fontSize: cs.fontSize,
        textTransform: cs.textTransform,
        fontWeight: cs.fontWeight,
        marginBottom: cs.marginBottom,
        letterSpacing: cs.letterSpacing,
      };
    });
    expect(span).toEqual({
      display: 'block',
      fontSize: '11px',
      textTransform: 'uppercase',
      fontWeight: '600',
      marginBottom: '4px',
      letterSpacing: '0.44px', // 0.04em * 11px
    });

    const strong = await metric.locator('strong').evaluate((el) => {
      const cs = getComputedStyle(el);
      const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
      return {
        display: cs.display,
        fontSizeRem: parseFloat(cs.fontSize) / rootPx,
        fontWeight: cs.fontWeight,
        lineHeightRatio: parseFloat(cs.lineHeight) / parseFloat(cs.fontSize),
      };
    });
    expect(strong.display).toBe('block');
    expect(strong.fontSizeRem).toBeCloseTo(1.35, 5);
    expect(strong.fontWeight).toBe('700');
    expect(strong.lineHeightRatio).toBeCloseTo(1.2, 5);
  });
});
