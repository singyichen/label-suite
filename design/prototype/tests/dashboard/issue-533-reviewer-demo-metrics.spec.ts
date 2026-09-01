import { test, expect } from '@playwright/test';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';

/* Issue #533 -- Reviewer 總覽的三張指標卡（待審總數 / 今日已審核 / IAA 摘要）
 * 是寫死的 i18n 字串，而同一畫面下方的每一列任務摘要都已改由
 * computeReviewSummary() 即時推導（issue #501，spec 012 v2.10.0 FR-020）。
 * 兩種來源混在同一視圖裡卻沒有任何標示，讀者無從分辨哪些數字會隨審核動作
 * 更新、哪些永遠不動。
 *
 * 維護者裁定的方案是「先明示為示範靜態值」——不做跨任務彙總推導（分母定義、
 * 「今日」的時間基準、IAA 跨任務彙總語意都尚未定義），本次只把現況標示清楚。
 *
 * 標示必須是畫面上看得見的文字：只有 title/aria-label 解決不了「被讀成推導
 * 結果」這個痛點，因為誤讀發生在一般視覺讀者身上。
 *
 * Traceability: specs/dashboard/012-dashboard/spec.md FR-024、SC-028 */

const NOTE = '[data-testid="reviewer-metrics-demo-note"]';

test('Reviewer 總覽指標卡帶有畫面可見的示範靜態值標示（zh-TW）', async ({ page }) => {
  await page.goto(`${DASHBOARD_URL}?scenario=reviewer`);

  const note = page.locator(NOTE);
  await expect(note).toBeVisible();
  await expect(note).toHaveText(
    '示範用靜態值：這三張指標卡不由審核單位狀態推導，不會隨審核動作更新。'
  );
});

test('標示的英文文案帶有同一語意（en）', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('labelsuite.lang', 'en');
  });
  await page.goto(`${DASHBOARD_URL}?scenario=reviewer`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  await expect(page.locator(NOTE)).toHaveText(
    'Demo static values: these three metric cards are not derived from review-unit state and do not update as you review.'
  );
});

/* 標示屬於 Reviewer 的那一組指標卡，不得外溢到別的角色視圖。issue #533
 * 明確排除 Super Admin／Project Leader 的指標卡（那些卡片有各自的資料來源
 * 問題，不在本次範圍），也排除已完成推導的任務列摘要（issue #501）。 */
test('標示只出現一次，且落在 Reviewer 總覽面板的指標卡群組內', async ({ page }) => {
  await page.goto(`${DASHBOARD_URL}?scenario=reviewer`);

  await expect(page.locator(NOTE)).toHaveCount(1);

  const scopedToReviewerMetricsPanel = page.locator(
    '[data-testid="reviewer-view"] .panel:has(#reviewerPendingValue) ' + NOTE
  );
  await expect(scopedToReviewerMetricsPanel).toHaveCount(1);
});

test('切換到其他角色視圖時看不到這個標示', async ({ page }) => {
  for (const scenario of ['super_admin_data', 'project_leader', 'annotator']) {
    await page.goto(`${DASHBOARD_URL}?scenario=${scenario}`);
    await expect(page.locator(`#view-${scenario}`)).toBeVisible();
    await expect(page.locator(NOTE)).toBeHidden();
  }
});

/* 本次只加標示，三個數值字串一律不動——改數字會讓這個 PR 同時做兩件事，
 * 而且在跨任務彙總語意定案前，任何新數字一樣沒有來源可言。 */
test('三張指標卡的數值與標籤維持原樣（zh-TW）', async ({ page }) => {
  await page.goto(`${DASHBOARD_URL}?scenario=reviewer`);

  await expect(page.locator('#reviewerPendingLabel')).toHaveText('待審總數');
  await expect(page.locator('#reviewerPendingValue')).toHaveText('12 筆');
  await expect(page.locator('#reviewerTodayReviewedLabel')).toHaveText('今日已審核');
  await expect(page.locator('#reviewerTodayReviewedValue')).toHaveText('18 筆');
  await expect(page.locator('#reviewerIaaLabel')).toHaveText('IAA 摘要');
  await expect(page.locator('#reviewerIaaValue')).toHaveText('0.81');
});

test('三張指標卡的數值與標籤維持原樣（en）', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('labelsuite.lang', 'en');
  });
  await page.goto(`${DASHBOARD_URL}?scenario=reviewer`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  await expect(page.locator('#reviewerPendingLabel')).toHaveText('Pending Total');
  await expect(page.locator('#reviewerPendingValue')).toHaveText('12 Items');
  await expect(page.locator('#reviewerTodayReviewedLabel')).toHaveText('Reviewed Today');
  await expect(page.locator('#reviewerTodayReviewedValue')).toHaveText('18 Items');
  await expect(page.locator('#reviewerIaaLabel')).toHaveText('IAA Summary');
  await expect(page.locator('#reviewerIaaValue')).toHaveText('0.81');
});
