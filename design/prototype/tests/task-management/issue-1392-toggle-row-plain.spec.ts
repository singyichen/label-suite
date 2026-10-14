/*
 * Traceability: specs/task-management/013-task-new/spec.md
 *   FR-004a (task-new Step 3 sampling / data isolation)
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-010o (task-detail sampling edit, data isolation toggle) (issue #1392)
 *
 * Regression: a .toggle-row nested inside a grey / bordered container
 * (.startup-section, .isolation-wrap) double-frames with its own 1px border,
 * padding and white background. The borderless look must come from the
 * `.toggle-row--plain` variant itself (not a page-level override), while the
 * default .toggle-row outside such containers keeps its border.
 */
import { test, expect } from '../fixtures';
import type { Locator } from '@playwright/test';
import { openSettingsSection } from './_task-detail-settings-helpers';

const TASK_NEW_URL = '/pages/task-management/task-new.html';
const TASK_DETAIL_URL = '/pages/task-management/task-detail.html?task_role=project_leader';

async function showTaskNewStep(page: import('@playwright/test').Page, step: number) {
  await page.goto(TASK_NEW_URL);
  await page.evaluate((s) => {
    (window as typeof window & { showStep: (n: number) => void }).showStep(s);
  }, step);
}

function css(locator: Locator, props: string[]) {
  return locator.evaluate(
    (el, ps) => {
      const cs = getComputedStyle(el);
      return Object.fromEntries(ps.map((p) => [p, cs.getPropertyValue(p)]));
    },
    props,
  );
}

test.describe('Toggle row plain variant (#1392)', () => {
  test('task-new step 3: isolation toggle row inside .startup-section is borderless', async ({ page }) => {
    await showTaskNewStep(page, 3);
    await expect(page.locator('#step3Panel')).toBeVisible();

    const row = page.locator('.toggle-row').filter({ has: page.locator('#isolationToggle') });
    const rowStyle = await css(row, ['border-top-width', 'padding-top', 'padding-left', 'background-color']);
    expect(rowStyle['border-top-width']).toBe('0px');
    expect(rowStyle['padding-top']).toBe('0px');
    expect(rowStyle['padding-left']).toBe('0px');
    expect(rowStyle['background-color']).toBe('rgba(0, 0, 0, 0)');

    const section = page.locator('.startup-section');
    expect((await css(section, ['border-top-width']))['border-top-width']).toBe('1px');
  });

  test('task-detail sampling edit: isolation row inside .isolation-wrap is borderless via variant', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await expect(page.locator('#loadingSkeleton')).toBeHidden();
    await openSettingsSection(page, 'sampling');
    await page.locator('#samplingEditBtn').click();
    await expect(page.locator('#samplingEditForm')).not.toHaveClass(/hidden/);

    const wrap = page.locator('.isolation-wrap');
    const row = wrap.locator('.toggle-row');
    await expect(row).toBeVisible();
    await expect(row).toHaveClass(/toggle-row--plain/);

    const rowStyle = await css(row, ['border-top-width', 'padding-top', 'padding-left', 'background-color']);
    expect(rowStyle['border-top-width']).toBe('0px');
    expect(rowStyle['padding-top']).toBe('0px');
    expect(rowStyle['padding-left']).toBe('0px');
    expect(rowStyle['background-color']).toBe('rgba(0, 0, 0, 0)');

    expect((await css(wrap, ['border-top-width']))['border-top-width']).toBe('1px');
  });

  test('default control: task-new force-guideline toggle row outside a grey container keeps its border', async ({ page }) => {
    await showTaskNewStep(page, 2);

    const row = page.locator('.toggle-row').filter({ has: page.locator('#forceGuidelineToggle') });
    expect((await css(row, ['border-top-width']))['border-top-width']).toBe('1px');
  });
});
