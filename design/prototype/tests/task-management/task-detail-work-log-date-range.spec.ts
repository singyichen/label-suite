/*
 * TDD Red (issue #1101, tasks.md 2.1). `work-log.html` still renders two
 * independent `type="date"` inputs (#workLogDateFrom / #workLogDateTo);
 * there is no `#workLogDateRangeTrigger` and `window.DateRangePicker` is not
 * loaded on `task-detail.html` at all (Green lands in tasks 2.4/2.5). Every
 * test below is written against the REAL shared component contract read
 * from `design/prototype/pages/shared/date-range-picker.js` (mount API,
 * markup, onChange semantics, STRINGS literals) and the integration
 * contract in `openspec/changes/1101-work-log-date-range-picker/design.md`
 * D4 -- not a guess -- and is expected to fail until Green wires the
 * component into this page.
 *
 * Traceability: openspec/changes/1101-work-log-date-range-picker/specs/
 *   task-management/014-task-detail/spec.md FR-007c (1)-(8) and its six
 *   Scenario blocks; FR-019 (`wl_from`/`wl_to` URL mapping, unchanged).
 *
 * Seed data (T001, DEFAULT_WORK_LOG_ENTRIES, task-detail.html):
 *   2026-04-19: Alex Wang (dry, annotated 72), Olivia Lin (dry, annotated 61)
 *   2026-04-20: Alex Wang (dry, annotated 55), Olivia Lin (dry, annotated 20)
 *   2026-04-21: Alex Wang (official, annotated 18), Olivia Lin (official,
 *               annotated 44), Mandy Chen (official, reviewed 7) -- Mandy
 *               is ROLE_SELF_EMAIL.reviewer, so a `reviewer` session only
 *               ever sees this one row.
 */
import { test, expect, type Page } from '@playwright/test';

declare global {
  interface Window {
    state?: Record<string, unknown>;
    renderWorkLog?: () => void;
  }
}

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;
const TRIGGER_ID = 'workLogDateRangeTrigger';
const POPOVER_ID = `${TRIGGER_ID}Popover`;
// design.md D2 / date-range-picker.js STRINGS.zh.placeholder.
const PLACEHOLDER_ZH = '選擇日期區間';
// STRINGS.en.placeholder.
const PLACEHOLDER_EN = 'Select date range';

async function gotoTaskDetail(page: Page, query: string) {
  await page.goto(`${TASK_DETAIL_URL}?${query}`);
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
}

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

function tableRows(page: Page) {
  return page.locator('#workLogTableBody tr');
}

function parseIso(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
}

/** Reads the popover's displayed year/month in either the zh format
 * (design.md D2 example: `2026年4月`) or the en format (date-range-picker.js
 * `viewYear + '-' + pad2(viewMonth)`, e.g. `2026-04`). */
async function readDisplayedYearMonth(page: Page): Promise<{ year: number; month: number }> {
  const text = (await popover(page).locator('.date-range-month-label').textContent()) ?? '';
  const zhMatch = text.match(/(\d+)\s*年\s*(\d+)\s*月/);
  if (zhMatch) return { year: Number(zhMatch[1]), month: Number(zhMatch[2]) };
  const enMatch = text.match(/^(\d{4})-(\d{2})$/);
  if (enMatch) return { year: Number(enMatch[1]), month: Number(enMatch[2]) };
  throw new Error(`unexpected month label text: ${text}`);
}

async function navigateToMonth(page: Page, targetYear: number, targetMonth: number) {
  const nextBtn = popover(page).locator('.date-range-nav-next');
  const prevBtn = popover(page).locator('.date-range-nav-prev');
  for (;;) {
    const { year, month } = await readDisplayedYearMonth(page);
    const diff = (targetYear - year) * 12 + (targetMonth - month);
    if (diff === 0) return;
    await (diff > 0 ? nextBtn : prevBtn).click();
  }
}

/** Opens the trigger (no-op if already open) and clicks one calendar day,
 * navigating the popover to that day's month first. */
async function openAndSelectDate(page: Page, isoDate: string) {
  if ((await trigger(page).getAttribute('aria-expanded')) !== 'true') {
    await trigger(page).click();
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');
  }
  const { year, month } = parseIso(isoDate);
  await navigateToMonth(page, year, month);
  await dayCell(page, isoDate).click();
}

/** Full two-click range selection (design.md D3 #2); a same-day range is
 * simply `fromIso === toIso`, clicking the same day cell twice. */
async function pickDateRange(page: Page, fromIso: string, toIso: string) {
  await openAndSelectDate(page, fromIso);
  await openAndSelectDate(page, toIso);
}

test.describe('Task detail work log date-range control (issue #1101)', () => {
  test.describe('AC1: single control replaces the two separate date fields', () => {
    test('the old from/to inputs are gone; a single #workLogDateRangeTrigger exists in the filter row', async ({ page }) => {
      await gotoTaskDetail(page, 'task_id=T001&task_role=project_leader&tab=work-log');

      await expect(page.locator('#workLogDateFrom')).toHaveCount(0);
      await expect(page.locator('#workLogDateTo')).toHaveCount(0);
      await expect(trigger(page)).toBeVisible();
      await expect(trigger(page)).toHaveAttribute('aria-haspopup', 'dialog');
    });
  });

  test.describe('AC2: calendar range selection highlights the span and updates the trigger text', () => {
    test('selecting two different days highlights the full span and the trigger shows YYYY-MM-DD ～ YYYY-MM-DD', async ({ page }) => {
      await gotoTaskDetail(page, 'task_id=T001&task_role=project_leader&tab=work-log');
      await pickDateRange(page, '2026-04-05', '2026-04-15');

      await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
      await expect(triggerText(page)).toHaveText('2026-04-05 ～ 2026-04-15');

      await trigger(page).click();
      await navigateToMonth(page, 2026, 4);
      await expect(dayCell(page, '2026-04-05')).toHaveClass(/is-range-start/);
      await expect(dayCell(page, '2026-04-15')).toHaveClass(/is-range-end/);
      await expect(popover(page).locator('.date-range-day.is-in-range')).toHaveCount(9);
    });

    test('selecting the same day twice produces a same-day range', async ({ page }) => {
      await gotoTaskDetail(page, 'task_id=T001&task_role=project_leader&tab=work-log');
      await pickDateRange(page, '2026-04-19', '2026-04-19');

      await expect(triggerText(page)).toHaveText('2026-04-19 ～ 2026-04-19');
    });
  });

  test.describe('AC3: incomplete selection does not apply', () => {
    test('picking only one date does not change the rendered work-log table or summary', async ({ page }) => {
      await gotoTaskDetail(page, 'task_id=T001&task_role=project_leader&tab=work-log');
      const rowsBefore = await tableRows(page).count();
      const annotatedBefore = await page.locator('#workLogSummaryAnnotatedValue').textContent();

      await openAndSelectDate(page, '2026-04-20');

      await expect(popover(page)).toBeVisible();
      await expect(tableRows(page)).toHaveCount(rowsBefore);
      await expect(page.locator('#workLogSummaryAnnotatedValue')).toHaveText(annotatedBefore ?? '');
    });
  });

  test.describe('AC4: reversed click order normalizes to a valid from<=to range', () => {
    test('clicking the later date first then the earlier date filters as if selected in order', async ({ page }) => {
      await gotoTaskDetail(page, 'task_id=T001&task_role=project_leader&tab=work-log');
      await pickDateRange(page, '2026-04-20', '2026-04-19');

      await expect(triggerText(page)).toHaveText('2026-04-19 ～ 2026-04-20');
      await expect(tableRows(page)).toHaveCount(4);
    });
  });

  test.describe('AC5: boundary inclusion and clear', () => {
    test('applying a range includes both the start and end date in the filtered rows', async ({ page }) => {
      await gotoTaskDetail(page, 'task_id=T001&task_role=project_leader&tab=work-log');
      await pickDateRange(page, '2026-04-19', '2026-04-20');

      await expect(tableRows(page)).toHaveCount(4);
      await expect(tableRows(page).filter({ hasText: '2026-04-19' })).toHaveCount(2);
      await expect(tableRows(page).filter({ hasText: '2026-04-20' })).toHaveCount(2);
      await expect(tableRows(page).filter({ hasText: '2026-04-21' })).toHaveCount(0);
    });

    test('clicking clear restores the unfiltered (all-dates) result set', async ({ page }) => {
      await gotoTaskDetail(page, 'task_id=T001&task_role=project_leader&tab=work-log');
      await pickDateRange(page, '2026-04-20', '2026-04-21');
      await expect(tableRows(page)).toHaveCount(5);

      await trigger(page).click();
      await popover(page).locator('.date-range-clear').click();

      await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
      await expect(triggerText(page)).toHaveText(PLACEHOLDER_ZH);
      await expect(tableRows(page)).toHaveCount(7);
    });
  });

  test.describe('AC6: combines with other active filters (AND)', () => {
    test('date range combines with the stage filter', async ({ page }) => {
      await gotoTaskDetail(page, 'task_id=T001&task_role=project_leader&tab=work-log');
      await page.locator('#workLogStageSelect').selectOption('official');
      await pickDateRange(page, '2026-04-20', '2026-04-21');

      // Only the 2026-04-21 entries are 'official'; the 2026-04-20 entries
      // are 'dry' and must be excluded even though they are in range.
      await expect(tableRows(page)).toHaveCount(3);
      await expect(tableRows(page).filter({ hasText: '2026-04-20' })).toHaveCount(0);
      await expect(page.locator('#workLogSummaryAnnotatedValue')).toHaveText('62');
    });

    test('date range combines with the member filter for project_leader', async ({ page }) => {
      await gotoTaskDetail(page, 'task_id=T001&task_role=project_leader&tab=work-log');
      await page.locator('#workLogMemberSelect').selectOption('alex.wang@labelsuite.io');
      await pickDateRange(page, '2026-04-19', '2026-04-20');

      await expect(tableRows(page)).toHaveCount(2);
      await expect(tableRows(page).filter({ hasText: 'Alex Wang' })).toHaveCount(2);
      await expect(page.locator('#workLogSummaryAnnotatedValue')).toHaveText('127');
    });
  });

  test.describe('AC7: changing the date range resets pagination to page 1', () => {
    test('the active page is reset to 1 and wl_page is dropped from the URL', async ({ page }) => {
      await gotoTaskDetail(page, 'task_id=T001&task_role=project_leader&tab=work-log');
      await page.evaluate(() => {
        const state = window.state as Record<string, number>;
        state.wlPageSize = 2;
        window.renderWorkLog?.();
      });
      await page.locator('#wlNextPageBtn').click();
      expect(new URL(page.url()).searchParams.get('wl_page')).toBe('2');

      await pickDateRange(page, '2026-04-19', '2026-04-19');

      expect(new URL(page.url()).searchParams.get('wl_page')).toBeNull();
      await expect(page.locator('#wlPaginationControls .page-btn.active')).toHaveText('1');
    });
  });

  test.describe('AC8: wl_from/wl_to URL writeback and restore', () => {
    test('completing a range writes wl_from/wl_to via replaceState without adding a history entry', async ({ page }) => {
      await gotoTaskDetail(page, 'task_id=T001&task_role=project_leader&tab=work-log');
      const historyLengthBefore = await page.evaluate(() => window.history.length);

      await pickDateRange(page, '2026-04-19', '2026-04-20');

      expect(new URL(page.url()).searchParams.get('wl_from')).toBe('2026-04-19');
      expect(new URL(page.url()).searchParams.get('wl_to')).toBe('2026-04-20');
      expect(await page.evaluate(() => window.history.length)).toBe(historyLengthBefore);
    });

    test('a direct link carrying both wl_from and wl_to restores the same visible range and filtered results', async ({ page }) => {
      await gotoTaskDetail(
        page,
        'task_id=T001&task_role=project_leader&tab=work-log&wl_from=2026-04-19&wl_to=2026-04-20',
      );

      await expect(triggerText(page)).toHaveText('2026-04-19 ～ 2026-04-20');
      await expect(tableRows(page)).toHaveCount(4);
    });
  });

  test.describe('AC9: one-sided URL compatibility (open-ended range)', () => {
    test('only wl_from filters as an open-ended-to-the-future range', async ({ page }) => {
      await gotoTaskDetail(page, 'task_id=T001&task_role=project_leader&tab=work-log&wl_from=2026-04-20');

      const text = (await triggerText(page).textContent())?.trim() ?? '';
      expect(text).toContain('2026-04-20');
      expect(text).not.toBe(PLACEHOLDER_ZH);
      // entry.date < wl_from excluded: only 2026-04-20 and 2026-04-21 remain.
      await expect(tableRows(page)).toHaveCount(5);
    });

    test('only wl_to filters as an open-ended-from-the-past range', async ({ page }) => {
      await gotoTaskDetail(page, 'task_id=T001&task_role=project_leader&tab=work-log&wl_to=2026-04-20');

      const text = (await triggerText(page).textContent())?.trim() ?? '';
      expect(text).toContain('2026-04-20');
      expect(text).not.toBe(PLACEHOLDER_ZH);
      // entry.date > wl_to excluded: only 2026-04-19 and 2026-04-20 remain.
      await expect(tableRows(page)).toHaveCount(4);
    });
  });

  test.describe('AC10: reviewer role boundary is unaffected', () => {
    test('the member filter stays hidden and the date-range control filters the reviewer-own-only data', async ({ page }) => {
      await gotoTaskDetail(page, 'task_id=T001&task_role=reviewer&tab=work-log');

      await expect(page.locator('#workLogMemberFilterWrap')).toHaveClass(/hidden/);
      await expect(page.locator('#workLogMemberSelect')).toBeHidden();
      await expect(trigger(page)).toBeVisible();

      // Mandy (the reviewer self) only has a 2026-04-21 entry; a range that
      // excludes it must empty the table.
      await pickDateRange(page, '2026-04-19', '2026-04-20');
      await expect(page.locator('#workLogEmptyState')).not.toHaveClass(/hidden/);

      // A range that includes 2026-04-21 shows exactly that one row.
      await pickDateRange(page, '2026-04-21', '2026-04-21');
      await expect(tableRows(page)).toHaveCount(1);
      await expect(tableRows(page)).toContainText('Mandy Chen');
    });
  });

  test.describe('AC11: zh-TW and English placeholder text', () => {
    test('zh-TW placeholder text appears when no range is selected', async ({ page }) => {
      await gotoTaskDetail(page, 'task_id=T001&task_role=project_leader&tab=work-log');
      await expect(triggerText(page)).toHaveText(PLACEHOLDER_ZH);
    });

    test('English placeholder text appears when no range is selected', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('labelsuite.lang', 'en');
      });
      await gotoTaskDetail(page, 'task_id=T001&task_role=project_leader&tab=work-log');
      await expect(triggerText(page)).toHaveText(PLACEHOLDER_EN);
    });
  });

  test.describe('AC12: keyboard operability', () => {
    test('Enter opens the control, arrow keys + Enter pick a range, and focus returns to the trigger', async ({ page }) => {
      await gotoTaskDetail(page, 'task_id=T001&task_role=project_leader&tab=work-log');

      await trigger(page).focus();
      await page.keyboard.press('Enter');
      await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');

      const focusedDay = popover(page).locator('.date-range-day[tabindex="0"]');
      await expect(focusedDay).toBeFocused();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');

      await expect(popover(page)).toBeHidden();
      await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
      await expect(trigger(page)).toBeFocused();
      await expect(triggerText(page)).not.toHaveText(PLACEHOLDER_ZH);
    });

    test('Escape discards an incomplete selection and returns focus to the trigger', async ({ page }) => {
      await gotoTaskDetail(page, 'task_id=T001&task_role=project_leader&tab=work-log');

      await trigger(page).focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');
      await expect(popover(page)).toBeVisible();

      await page.keyboard.press('Escape');

      await expect(popover(page)).toBeHidden();
      await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
      await expect(triggerText(page)).toHaveText(PLACEHOLDER_ZH);
      await expect(trigger(page)).toBeFocused();
    });
  });

  test.describe('AC13: desktop and 375px viewport layout', () => {
    test('desktop: the open popover does not cause horizontal overflow', async ({ page }) => {
      await gotoTaskDetail(page, 'task_id=T001&task_role=project_leader&tab=work-log');
      await trigger(page).click();
      await expect(popover(page)).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test('at 375px viewport the control and its open popover stay within the horizontal viewport bounds', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 800 });
      await gotoTaskDetail(page, 'task_id=T001&task_role=project_leader&tab=work-log');
      await trigger(page).click();
      await expect(popover(page)).toBeVisible();

      const box = await popover(page).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(375);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
});
