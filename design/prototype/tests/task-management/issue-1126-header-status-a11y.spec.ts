/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-028, SC-019, AC-3.55, AC-3.57 (issue #1126)
 *
 * TDD Red. Issue #1126 rejudgment: the header status text (#taskHeaderStatus) is the
 * only stage text exposed to assistive tech; the overview stepper is illustrative and
 * stays aria-hidden. The dead statusHint code (setText target + i18n keys) is removed.
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;
const TASK_ID = 'T001';

async function openDetail(page: Page, query: string) {
  await page.goto(`${TASK_DETAIL_URL}?${query}${/role=/.test(query) ? '' : '&task_role=project_leader'}`);
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
}

const CASES = [
  { status: 'official_run_in_progress', text: '正式標記' },
  { status: 'dry_run_in_progress', text: '試標' },
];

test.describe('header status is the accessible stage text (issue #1126)', () => {
  for (const { status, text } of CASES) {
    test(`#taskHeaderStatus is in the accessibility tree for ${status}`, async ({ page }) => {
      await openDetail(page, `task_id=${TASK_ID}&status=${status}`);
      const el = page.locator('#taskHeaderStatus');
      await expect(el).toBeVisible();
      await expect(el).toContainText(text);

      const exposure = await el.evaluate((node) => {
        let hiddenAncestor = false;
        let hiddenCss = false;
        for (let n: Element | null = node; n; n = n.parentElement) {
          if (n.getAttribute('aria-hidden') === 'true') hiddenAncestor = true;
          const cs = getComputedStyle(n);
          if (cs.display === 'none' || cs.visibility === 'hidden') hiddenCss = true;
        }
        return { hiddenAncestor, hiddenCss, text: (node.textContent || '').trim() };
      });
      expect(exposure.hiddenAncestor).toBe(false);
      expect(exposure.hiddenCss).toBe(false);
      expect(exposure.text).toContain(text);

      const visible = (await el.innerText()).trim();
      expect(exposure.text).toBe(visible);
      await expect(page.locator('#taskHeader')).toMatchAriaSnapshot(`- paragraph: ${visible}`);
    });
  }

  test('overview stepper wrap stays aria-hidden with no aria-current or sr-only text', async ({ page }) => {
    await openDetail(page, `task_id=${TASK_ID}&status=official_run_in_progress`);
    const wrap = page.locator('.status-stepper-wrap');
    await wrap.waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
    await expect(wrap).toHaveAttribute('aria-hidden', 'true');
    await expect(wrap.locator('[aria-current]')).toHaveCount(0);
    await expect(wrap.locator('.sr-only')).toHaveCount(0);
  });

  test('dead statusHint code is removed from task-detail.html', async ({ page }) => {
    const res = await page.request.get(TASK_DETAIL_URL);
    expect(res.ok()).toBe(true);
    const src = await res.text();
    expect(src).not.toContain('id="statusHint"');
    expect(src).not.toContain('statusHint');
  });
});
