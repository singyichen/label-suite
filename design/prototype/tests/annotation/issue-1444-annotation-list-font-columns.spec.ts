import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { buildListUrl } from './_workspace-helpers';

/* The reviewer queue renders 9 columns (not the annotator's 5); the fix must
 * keep every one of them and make them fit. */
/* issue #1444: annotation-list.html did not reset form-control fonts (buttons,
 * inputs and selects fell back to the browser default, Arial) and the reviewer
 * queue's 操作 column overflowed .task-table-wrap at 1440px. */

const TASK_LIST_URL = '/pages/task-management/task-list.html';
const SELECTORS = {
  button: '#prevPageBtn',
  input: '#searchInput',
  select: '#statusFilter',
} as const;

async function fonts(page: Page): Promise<Record<string, string>> {
  return page.evaluate((sels: Record<string, string>) => {
    const out: Record<string, string> = {};
    for (const kind of Object.keys(sels)) {
      const el = document.querySelector(sels[kind]);
      out[kind] = el ? getComputedStyle(el).fontFamily : '<missing>';
    }
    return out;
  }, SELECTORS as Record<string, string>);
}

test.describe('annotation-list font reset (#1444)', () => {
  test('button, input and select use the same Inter font as task-list', async ({ page }) => {
    await page.goto(TASK_LIST_URL);
    const reference = await fonts(page);

    await page.goto(buildListUrl({ task_id: 'T016', role: 'reviewer', run_type: 'official_run' }));
    const actual = await fonts(page);

    for (const kind of Object.keys(SELECTORS)) {
      expect(reference[kind], `task-list ${kind} font`).toContain('Inter');
      expect(actual[kind], `annotation-list ${kind} font`).toBe(reference[kind]);
      expect(actual[kind], `annotation-list ${kind} font`).toContain('Inter');
      expect(actual[kind], `annotation-list ${kind} font`).not.toMatch(/Arial/i);
    }
  });
});

test.describe('annotation-list reviewer queue columns at 1440px (#1444)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('操作 column stays inside .task-table-wrap with all 9 reviewer columns kept', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T016', role: 'reviewer', run_type: 'official_run' }));

    const headers = page.locator('.task-table-wrap thead th');
    await expect(headers).toHaveText([
      'ID',
      '標記員',
      '審核狀態',
      '完成時間',
      '文本摘要',
      '標記結果',
      '標記分布統計',
      '處理狀況',
      '操作',
    ]);

    const wrap = page.locator('.task-table-wrap');
    const wrapBox = await wrap.boundingBox();
    const opBox = await headers.last().boundingBox();
    expect(wrapBox).not.toBeNull();
    expect(opBox).not.toBeNull();
    expect(opBox!.x + opBox!.width).toBeLessThanOrEqual(wrapBox!.x + wrapBox!.width + 1);

    const { scrollWidth, clientWidth } = await wrap.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
