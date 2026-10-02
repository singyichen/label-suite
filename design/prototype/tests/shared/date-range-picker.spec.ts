/**
 * components-showcase.html — shared DateRangePicker component (issue #1101)
 *
 * TDD Red: `window.DateRangePicker` and its showcase demonstration block do
 * not exist yet. This file is written against the component contract in
 * openspec/changes/1101-work-log-date-range-picker/design.md (D1 mount API,
 * D2 markup, D3 interaction rules) before the Green implementation lands —
 * every test below is expected to fail until a Green engineer adds:
 *   - `design/prototype/pages/shared/date-range-picker.js` (+ .css)
 *   - a `<div class="component-card" id="comp-date-range-picker">` block on
 *     components-showcase.html containing the trigger button below and a
 *     `window.DateRangePicker.mount(trigger, { value: {from: null, to: null},
 *     lang: 'zh', onChange: fn })` call demonstrating it, per the task brief:
 *
 *     <button type="button" class="date-range-trigger" id="showcaseDateRangeTrigger"
 *             aria-haspopup="dialog" aria-expanded="false"
 *             aria-controls="showcaseDateRangeTriggerPopover">
 *       <span class="date-range-trigger-text">...</span>
 *     </button>
 *
 * Traceability:
 *   openspec/changes/1101-work-log-date-range-picker/specs/task-management/014-task-detail/spec.md
 *     FR-007c (1) 單一控制項與高亮, (2) 不完整選取不套用, (3) 反向選取正規化,
 *     (4) 包含邊界與清除, (7) 鍵盤操作與焦點
 *     — Scenario: 單一控制項取代兩個獨立欄位並清楚呈現已選範圍
 *     — Scenario: 不完整選取與反向選取
 *     — Scenario: 套用含邊界的區間並可清除
 *     — Scenario: 鍵盤操作與焦點回復
 *   design.md D3 — pure component-contract rules (roving tabindex, Esc
 *     discard, 375px RWD ceiling) not yet phrased as their own spec scenario.
 */
import { test, expect, type Page } from '@playwright/test';

const SHOWCASE_URL = '/components-showcase.html';
const TRIGGER_ID = 'showcaseDateRangeTrigger';
const POPOVER_ID = 'showcaseDateRangeTriggerPopover';
// design.md D2: placeholder when unselected (zh).
const PLACEHOLDER_TEXT = '選擇日期區間';

function trigger(page: Page) {
  return page.locator(`#${TRIGGER_ID}`);
}

function triggerText(page: Page) {
  return page.locator(`#${TRIGGER_ID} .date-range-trigger-text`);
}

function popover(page: Page) {
  return page.locator(`#${POPOVER_ID}`);
}

function dayCell(page: Page, isoDate: string) {
  return popover(page).locator(`.date-range-day[data-date="${isoDate}"]`);
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Reads the currently displayed year/month from the popover header label
 * (design.md D2 example: `2026年4月`). */
async function displayedYearMonth(page: Page): Promise<{ year: number; month: number }> {
  const text = await popover(page).locator('.date-range-month-label').textContent();
  const match = text?.match(/(\d+)\s*年\s*(\d+)\s*月/);
  if (!match) {
    throw new Error(`unexpected month label text: ${text}`);
  }
  return { year: Number(match[1]), month: Number(match[2]) };
}

async function openPopover(page: Page) {
  await trigger(page).click();
  await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');
}

test.describe('Shared DateRangePicker component (showcase demo)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SHOWCASE_URL);
  });

  test('popover is closed by default; clicking the trigger opens it and focuses a day cell', async ({ page }) => {
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(popover(page)).toBeHidden();

    await openPopover(page);

    await expect(popover(page)).toBeVisible();
    const focusedDay = popover(page).locator('.date-range-day[tabindex="0"]');
    await expect(focusedDay).toHaveCount(1);
    await expect(focusedDay).toBeFocused();
  });

  test('selecting two different days in the same month highlights the full range', async ({ page }) => {
    await openPopover(page);
    const { year, month } = await displayedYearMonth(page);
    const startDate = isoDate(year, month, 5);
    const endDate = isoDate(year, month, 15);

    await dayCell(page, startDate).click();
    // Only the start is set so far -- popover must stay open (AC: 不完整選取不套用).
    await expect(popover(page)).toBeVisible();

    await dayCell(page, endDate).click();
    // Completing the range commits it and closes the popover (design.md D3 #2).
    await expect(popover(page)).toBeHidden();

    // Re-open to inspect the committed highlight state.
    await openPopover(page);
    await expect(dayCell(page, startDate)).toHaveClass(/is-range-start/);
    await expect(dayCell(page, endDate)).toHaveClass(/is-range-end/);
    await expect(dayCell(page, startDate)).not.toHaveClass(/is-in-range/);
    await expect(dayCell(page, endDate)).not.toHaveClass(/is-in-range/);
    // Days 6–14 inclusive (9 days) lie strictly between the 5th and the 15th.
    await expect(popover(page).locator('.date-range-day.is-in-range')).toHaveCount(9);
  });

  test('selecting the same day twice produces a same-day range with no is-in-range days', async ({ page }) => {
    await openPopover(page);
    const { year, month } = await displayedYearMonth(page);
    const sameDate = isoDate(year, month, 10);

    await dayCell(page, sameDate).click();
    await expect(popover(page)).toBeVisible();
    await dayCell(page, sameDate).click();
    await expect(popover(page)).toBeHidden();

    await openPopover(page);
    await expect(dayCell(page, sameDate)).toHaveClass(/is-range-start/);
    await expect(dayCell(page, sameDate)).toHaveClass(/is-range-end/);
    await expect(popover(page).locator('.date-range-day.is-in-range')).toHaveCount(0);
  });

  test('picking only one date never fires onChange: trigger text stays at placeholder', async ({ page }) => {
    const initialText = await triggerText(page).textContent();
    expect(initialText?.trim()).toBe(PLACEHOLDER_TEXT);

    await openPopover(page);
    const { year, month } = await displayedYearMonth(page);
    await dayCell(page, isoDate(year, month, 8)).click();

    // Incomplete selection -- popover stays open and trigger text is untouched.
    await expect(popover(page)).toBeVisible();
    await expect(triggerText(page)).toHaveText(PLACEHOLDER_TEXT);
  });

  test('reversed selection (later date first) normalizes to from <= to in the trigger text', async ({ page }) => {
    await openPopover(page);
    const { year, month } = await displayedYearMonth(page);
    const earlier = isoDate(year, month, 5);
    const later = isoDate(year, month, 20);

    // Click the later date first, then the earlier one.
    await dayCell(page, later).click();
    await dayCell(page, earlier).click();
    await expect(popover(page)).toBeHidden();

    const text = (await triggerText(page).textContent())?.trim() ?? '';
    expect(text).toContain(earlier);
    expect(text).toContain(later);
    expect(text).toContain('～');
    expect(text.indexOf(earlier)).toBeLessThan(text.indexOf(later));
  });

  test('clear resets the trigger text to the placeholder and closes the popover', async ({ page }) => {
    await openPopover(page);
    const { year, month } = await displayedYearMonth(page);
    await dayCell(page, isoDate(year, month, 5)).click();
    await dayCell(page, isoDate(year, month, 15)).click();
    await expect(popover(page)).toBeHidden();
    await expect(triggerText(page)).not.toHaveText(PLACEHOLDER_TEXT);

    await openPopover(page);
    await popover(page).locator('.date-range-clear').click();

    await expect(popover(page)).toBeHidden();
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(triggerText(page)).toHaveText(PLACEHOLDER_TEXT);
  });

  test('keyboard flow: Enter opens, arrow keys move roving tabindex, Enter twice commits and returns focus', async ({ page }) => {
    await trigger(page).focus();
    await page.keyboard.press('Enter');
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(popover(page)).toBeVisible();

    const firstFocused = popover(page).locator('.date-range-day[tabindex="0"]');
    await expect(firstFocused).toHaveCount(1);
    const firstDate = await firstFocused.getAttribute('data-date');
    await expect(firstFocused).toBeFocused();

    await page.keyboard.press('ArrowRight');
    const afterRight = popover(page).locator('.date-range-day[tabindex="0"]');
    const afterRightDate = await afterRight.getAttribute('data-date');
    expect(afterRightDate).not.toBe(firstDate);
    await expect(afterRight).toBeFocused();
    // Roving tabindex: the previously focused day is no longer tabbable.
    await expect(dayCell(page, firstDate!)).toHaveAttribute('tabindex', '-1');

    await page.keyboard.press('ArrowDown');
    const afterDown = popover(page).locator('.date-range-day[tabindex="0"]');
    const afterDownDate = await afterDown.getAttribute('data-date');
    expect(afterDownDate).not.toBe(afterRightDate);
    await expect(afterDown).toBeFocused();
    await expect(dayCell(page, afterRightDate!)).toHaveAttribute('tabindex', '-1');

    // Commit the tentative start at the currently focused day.
    await page.keyboard.press('Enter');
    await expect(popover(page)).toBeVisible();

    // Move forward a couple of days and commit the end.
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');

    await expect(popover(page)).toBeHidden();
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger(page)).toBeFocused();
  });

  test('Escape discards an incomplete selection and returns focus to the trigger', async ({ page }) => {
    const initialText = await triggerText(page).textContent();

    await openPopover(page);
    const { year, month } = await displayedYearMonth(page);
    await dayCell(page, isoDate(year, month, 8)).click();
    await expect(popover(page)).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(popover(page)).toBeHidden();
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(triggerText(page)).toHaveText(initialText!.trim());
    await expect(trigger(page)).toBeFocused();
  });

  test('at 375px viewport the open popover stays within the horizontal viewport bounds', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(SHOWCASE_URL);

    await openPopover(page);

    const box = await popover(page).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  });
});
