import { test, expect } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

/* Text snippet clamp + expand toggle (issue #188, spec 015 FR-007I).
 *
 * `.text-snippet` used to disable truncation outright (`overflow: visible;
 * text-overflow: clip`) so long-text tasks (free-text QA/summary/multi-turn,
 * e.g. seeds T009/T012/T013) rendered their full original text and blew up
 * row height. This suite pins the fix: a fixed-line CSS clamp by default,
 * plus a per-row "expand full text" toggle for rows long enough to overflow
 * it -- and confirms the toggle doesn't fight the row's own click-to-open
 * navigation (FR-008 area).
 *
 * T009 ('sum-001'..) and T001 ('sent-001') already exist as seeds: T009's
 * summarization input text is long enough to overflow a 3-line clamp,
 * T001's classification sentence is not. */

test.describe('Text snippet truncation with expand toggle (issue #188)', () => {
  test('a long-text row clamps by default and renders an expand toggle', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T009' }));

    const row = page.getByTestId('ws-sample-item').filter({ hasText: 'sum-001' });
    const content = row.locator('.text-snippet-content');
    await expect(content).toBeVisible();

    const clamped = await content.evaluate((el) => getComputedStyle(el).webkitLineClamp !== 'none');
    expect(clamped).toBe(true);

    await expect(row.getByTestId('list-text-toggle')).toBeVisible();
    await expect(row.getByTestId('list-text-toggle')).toHaveText('展開全文');
  });

  test('a short-text row does not render a toggle', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001' }));

    const row = page.getByTestId('ws-sample-item').filter({ hasText: 'sent-001' });
    await expect(row.getByTestId('list-text-toggle')).toHaveCount(0);
  });

  test('the toggle expands and re-collapses the row text without navigating', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T009' }));

    const row = page.getByTestId('ws-sample-item').filter({ hasText: 'sum-001' });
    const toggle = row.getByTestId('list-text-toggle');
    const content = row.locator('.text-snippet-content');

    await toggle.click();
    await expect(content).toHaveClass(/expanded/);
    await expect(toggle).toHaveText('收合');
    await expect(page).toHaveURL(/annotation-list\.html/);

    await toggle.click();
    await expect(content).not.toHaveClass(/expanded/);
    await expect(toggle).toHaveText('展開全文');
  });

  test('row click still opens the workspace in the annotator view', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T009' }));

    const row = page.getByTestId('ws-sample-item').filter({ hasText: 'sum-001' });
    await row.locator('td').first().click();

    await expect(page).toHaveURL(/annotation-workspace\.html/);
    await expect(page).toHaveURL(/sample_id=sum-001/);
  });

  test('row click still opens the workspace in the reviewer view', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T009', role: 'reviewer' }));

    const row = page.getByTestId('ws-sample-item').first();
    await row.locator('td').first().click();

    await expect(page).toHaveURL(/annotation-workspace\.html/);
  });
});
