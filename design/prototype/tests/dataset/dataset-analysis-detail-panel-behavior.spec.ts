/**
 * Detail panel structure and load-error behavior (issue #183 audit).
 *
 * Before the fix the two panel-load catch paths rendered hardcoded Chinese
 * strings without a retry affordance, the tabs had no aria-controls/tabpanel
 * wiring, and the seven quality partials each hardcoded a "2 筆" count badge.
 *
 * Traceability: specs/dataset/017-dataset-analysis-detail/spec.md
 *   FR-005, FR-006, FR-008A, FR-019, FR-022, FR-035
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const DETAIL_URL = '/pages/dataset/dataset-analysis-detail.html';

async function useEnglish(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('labelsuite.lang', 'en');
  });
}

test.describe('Dataset detail — tabs and breadcrumb structure', () => {
  test('tabs are wired to their panels with aria-controls and tabpanel roles', async ({ page }) => {
    await page.goto(`${DETAIL_URL}?task_id=T001`);

    await expect(page.locator('#tabStats')).toHaveAttribute('aria-controls', 'statsPanel');
    await expect(page.locator('#tabQuality')).toHaveAttribute('aria-controls', 'qualityPanel');
    await expect(page.locator('#statsPanel')).toHaveAttribute('role', 'tabpanel');
    await expect(page.locator('#statsPanel')).toHaveAttribute('aria-labelledby', 'tabStats');
    await expect(page.locator('#qualityPanel')).toHaveAttribute('role', 'tabpanel');
    await expect(page.locator('#qualityPanel')).toHaveAttribute('aria-labelledby', 'tabQuality');
  });

  test('breadcrumb renders below the page header (task-detail convention)', async ({ page }) => {
    await page.goto(`${DETAIL_URL}?task_id=T001`);

    const headerFirst = await page.evaluate(() => {
      const breadcrumb = document.querySelector('.breadcrumb');
      const header = document.querySelector('.page-header');
      if (!breadcrumb || !header) return false;
      return Boolean(
        header.compareDocumentPosition(breadcrumb) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });
    expect(headerFirst).toBe(true);
  });
});

test.describe('Dataset detail — panel load errors', () => {
  test('quality partial failure renders a localized error with a retry action', async ({ page }) => {
    await page.route('**/dataset-analysis-detail.partials/quality-*.html', (route) =>
      route.abort(),
    );
    await page.goto(`${DETAIL_URL}?task_id=T001&tab=quality`);

    const error = page.locator('#qualityPanelMount .panel-load-error');
    await expect(error.locator('.panel-title')).toHaveText('資料載入失敗');
    await expect(error.locator('.panel-subtitle')).toHaveText(
      '無法載入此面板的內容，請稍後再試。',
    );
    await expect(error.locator('button')).toHaveText('重新載入');
  });

  test('stats partial failure renders the same error pattern in English mode', async ({ page }) => {
    await useEnglish(page);
    await page.route('**/dataset-analysis-detail.partials/stats-*.html', (route) =>
      route.abort(),
    );
    await page.goto(`${DETAIL_URL}?task_id=T001`);

    const error = page.locator('#statsPanelMount .panel-load-error');
    await expect(error.locator('.panel-title')).toHaveText('Failed to load data');
    await expect(error.locator('button')).toHaveText('Reload');
    await expect(error).not.toContainText(/[載入失敗請重新整理頁面]/);
  });

  test('the retry action reloads the page and recovers once the partial is reachable', async ({ page }) => {
    let failing = true;
    await page.route('**/dataset-analysis-detail.partials/quality-*.html', (route) => {
      if (failing) return route.abort();
      return route.fallback();
    });
    await page.goto(`${DETAIL_URL}?task_id=T001&tab=quality`);

    const retry = page.locator('#qualityPanelMount .panel-load-error button');
    await expect(retry).toBeVisible();
    failing = false;
    await retry.click();
    await expect(
      page.locator('#qualityPanelMount section[aria-labelledby="lowConsistencyTitle"]'),
    ).toBeVisible();
  });
});

test.describe('Dataset detail — low-consistency count badge', () => {
  test('derives the count from the mounted table rows instead of a hardcoded string', async ({ page }) => {
    await page.goto(`${DETAIL_URL}?task_id=T001&tab=quality`);

    const section = page.locator(
      '#qualityPanelMount section[aria-labelledby="lowConsistencyTitle"]',
    );
    const rowCount = await section.locator('tbody tr').count();
    expect(rowCount).toBeGreaterThan(0);
    await expect(section.locator('.panel-head-row .badge-neutral')).toHaveText(
      `${rowCount} 筆`,
    );
  });

  test('localizes the count badge in English mode', async ({ page }) => {
    await useEnglish(page);
    await page.goto(`${DETAIL_URL}?task_id=T001&tab=quality`);

    const section = page.locator(
      '#qualityPanelMount section[aria-labelledby="lowConsistencyTitle"]',
    );
    const rowCount = await section.locator('tbody tr').count();
    await expect(section.locator('.panel-head-row .badge-neutral')).toHaveText(
      `${rowCount} items`,
    );
  });
});
