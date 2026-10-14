/*
 * TDD Red (issue #1395). In the work-log tab filter row the date-range
 * trigger (#workLogDateRangeTrigger, .date-range-trigger) renders 36px high
 * with a 4px radius, while the same-row select (#workLogStageSelect,
 * .input-select) renders ~45px high with an 8px radius. Both controls must
 * share the same height and corner radius at desktop and mobile widths.
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

const URL =
  '/pages/task-management/task-detail.html?task_id=T001&task_role=project_leader&tab=work-log';
const PANEL_LOAD_TIMEOUT = 15000;
const HEIGHT_TOLERANCE_PX = 0.5;

async function measure(page: Page, selector: string) {
  return page.locator(selector).evaluate((el) => ({
    height: el.getBoundingClientRect().height,
    radius: getComputedStyle(el).borderTopLeftRadius,
  }));
}

async function expectSameTokens(page: Page) {
  await page.goto(URL);
  const trigger = page.locator('#workLogDateRangeTrigger');
  await trigger.waitFor({ state: 'visible', timeout: PANEL_LOAD_TIMEOUT });
  await page.locator('#workLogStageSelect').waitFor({ state: 'visible', timeout: PANEL_LOAD_TIMEOUT });

  const triggerBox = await measure(page, '#workLogDateRangeTrigger');
  const selectBox = await measure(page, '#workLogStageSelect');

  expect.soft(
    Math.abs(triggerBox.height - selectBox.height),
    `trigger height ${triggerBox.height} vs select height ${selectBox.height}`,
  ).toBeLessThanOrEqual(HEIGHT_TOLERANCE_PX);
  expect.soft(triggerBox.radius, 'trigger vs select borderTopLeftRadius').toBe(selectBox.radius);
}

test.describe('Issue #1395 work-log date-range trigger matches select tokens', () => {
  test('desktop 1280x800: height and radius equal the stage select', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expectSameTokens(page);
  });

  test('mobile 390x844: height and radius equal the stage select', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expectSameTokens(page);
  });
});
