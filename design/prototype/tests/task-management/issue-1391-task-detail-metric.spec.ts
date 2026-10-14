/*
 * Traceability: issue #1391 PR-B -- the task-detail KPI cells (overview exec-round, annotation-progress,
 * work-log summary) adopt the shared MASTER "Metric KPI Tile" (pages/shared/metric.css, design/system/MASTER.md).
 * Design-system convergence only; no FR/AC is added or removed.
 *
 * Contract for Green: each KPI cell is an element with class `metric` whose direct children are
 * `<span id=...Label>` (label) and `<strong id=...Value>` (value). Element ids and data-testid values are preserved.
 * Fixture: T003 as project_leader (task_role explicit, per neighbouring specs).
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

const URL = '/pages/task-management/task-detail.html?task_id=T003&task_role=project_leader';

const OVERVIEW = [
  ['trialRound', 'overview'], ['currentAgreement', 'overview'], ['trialUsed', 'overview'], ['officialPool', 'overview'],
] as const;
const PROGRESS = ['Total', 'Completed', 'Rate', 'Speed', 'Eta', 'IAA'].map((k) => `progressMetric${k}`);
const WORKLOG = ['Hours', 'Annotated', 'Reviewed', 'Speed'].map((k) => `workLogSummary${k}`);

async function open(page: Page, tab?: string, panel = '#overviewPanel') {
  await page.goto(URL);
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: 15000 });
  await expect(page.locator('#loadingSkeleton')).toBeHidden({ timeout: 15000 });
  if (tab) await page.locator(tab).click();
  await expect(page.locator(panel)).toBeVisible();
}

async function assertStructure(page: Page, prefix: string) {
  const label = page.locator(`#${prefix}Label`);
  const value = page.locator(`#${prefix}Value`);
  await expect(label, `${prefix}Label`).toBeVisible();
  await expect(value, `${prefix}Value`).toBeVisible();
  expect(await label.evaluate((e) => e.tagName), `${prefix}Label tag`).toBe('SPAN');
  expect(await value.evaluate((e) => e.tagName), `${prefix}Value tag`).toBe('STRONG');
  const parentIsMetric = await label.evaluate((e) => !!e.parentElement?.classList.contains('metric'));
  expect(parentIsMetric, `${prefix}Label parent is .metric`).toBe(true);
  const sameParent = await value.evaluate((e, id) => e.parentElement === document.getElementById(id)?.parentElement, `${prefix}Label`);
  expect(sameParent, `${prefix} label/value share the .metric parent`).toBe(true);
}

async function assertMasterStyle(page: Page, prefix: string) {
  const cell = page.locator(`#${prefix}Label`).locator('xpath=..');
  const s = await cell.evaluate((el) => {
    const c = getComputedStyle(el);
    return { padding: c.paddingTop + '/' + c.paddingRight + '/' + c.paddingBottom + '/' + c.paddingLeft,
      border: c.borderTopWidth + ' ' + c.borderTopStyle, radius: c.borderTopLeftRadius, bg: c.backgroundColor };
  });
  expect(s, `${prefix} cell`).toEqual({ padding: '16px/16px/16px/16px', border: '1px solid', radius: '12px', bg: 'rgb(255, 255, 255)' });
  const l = await page.locator(`#${prefix}Label`).evaluate((el) => {
    const c = getComputedStyle(el);
    return { size: c.fontSize, weight: c.fontWeight, tt: c.textTransform };
  });
  expect(l, `${prefix}Label`).toEqual({ size: '11px', weight: '600', tt: 'uppercase' });
  const v = await page.locator(`#${prefix}Value`).evaluate((el) => {
    const c = getComputedStyle(el);
    return { size: c.fontSize, weight: c.fontWeight };
  });
  expect(v, `${prefix}Value`).toEqual({ size: '21.6px', weight: '700' });
}

test.describe('Issue #1391 -- task-detail KPI cells use the shared .metric tile', () => {
  test('overview: 4 cells keep data-testid and use .metric > span + strong with MASTER styles', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-testid="overview-metric"]')).toHaveCount(4);
    for (const [p] of OVERVIEW) {
      await assertStructure(page, p);
      await assertMasterStyle(page, p);
    }
  });

  test('annotation-progress: 6 plain cells use .metric; composite breakdown cell keeps label and counts', async ({ page }) => {
    await open(page, '#tabAnnotationProgress', '#annotationProgressPanel');
    for (const p of PROGRESS) {
      await assertStructure(page, p);
      await assertMasterStyle(page, p);
    }
    const breakdown = page.locator('[data-testid="review-progress-breakdown"]');
    await expect(breakdown).toBeVisible();
    await expect(breakdown).toHaveAttribute('role', 'group');
    await expect(breakdown.locator('#reviewProgressBreakdownLabel')).toBeVisible();
    for (const id of ['reviewFinalizedCount', 'reviewDisputedCount', 'reviewPendingArbitrationCount', 'reviewExceptionCount']) {
      await expect(breakdown.locator(`#${id}`), id).toBeVisible();
    }
  });

  test('work-log: 4 cells use .metric; avg-per-item sub-note is not a span', async ({ page }) => {
    await open(page, '#tabWorkLog', '#workLogPanel');
    for (const p of WORKLOG) {
      await assertStructure(page, p);
      await assertMasterStyle(page, p);
    }
    const tag = await page.locator('#workLogSummaryAvgPerItemValue').evaluate((e) => e.tagName);
    expect(tag).toBe('SMALL');
  });
});
