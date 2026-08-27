/* spec 015 FR-082 / AC-3.43 (issue #456 AC-5 + AC-8 fourth path) -- once a
 * review unit is done with, the workspace names the ways out.
 *
 * The reviewer's submit already worked: the decision persists, the banner
 * re-renders, a toast confirms it. What it never did was answer "so what
 * now?". The unit is finished and the page still shows the finished unit,
 * so the reviewer's only exits were browser-back or the breadcrumb -- and
 * neither of those is 下一個可處理單位, which is what a reviewer working a
 * queue actually wants next.
 *
 * Two design points the tests below pin deliberately:
 *
 *   1. The exits are derived from STATE, not raised by the submit EVENT.
 *      "this reviewer has already submitted this unit, or the unit is
 *      finalized" is a question the page can answer on any render, so the
 *      card survives a reload and shows up on an already-finished unit the
 *      reviewer merely revisits. A submit-time flag would do neither.
 *   2. 下一個可處理單位 is not 下一列. The next unit in buildUnits() order
 *      may be one this reviewer already finished; the CTA has to skip those
 *      and the finalized ones, or it hands the reviewer a locked page.
 *
 * T001 defaults to min_reviewers = 1 (no review-flow demo seed), so one
 * submitted review finalizes that unit -- the shortest honest route to the
 * 已定稿 half of AC-5.
 */
import { expect, test, type Page } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, skipGuidelineModal } from './_workspace-helpers';

/* sent-001 carries three annotator rows, so the unit after the first one is
 * still this reviewer's to do -- the CTA has somewhere real to point. */
const T001_UNIT = buildWorkspaceUrl({
  task_id: 'T001',
  sample_id: 'sent-001',
  role: 'reviewer',
  run_type: 'official_run',
});

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

async function approveAndSubmit(page: Page) {
  await page.getByTestId('ws-review-row-approve').click();
  await page.getByTestId('ws-review-submit-btn').click();
}

test.describe('送出／定稿後的後續出口 (AC-5)', () => {
  test('送出審核後出現後續出口卡，三個出口都在', async ({ page }) => {
    await page.goto(T001_UNIT);
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-post-submit-cta')).toHaveCount(0);

    await approveAndSubmit(page);

    const cta = page.getByTestId('ws-post-submit-cta');
    await expect(cta).toBeVisible();
    await expect(cta.getByTestId('ws-post-submit-next-unit')).toBeVisible();
    await expect(cta.getByTestId('ws-post-submit-list')).toBeVisible();
    await expect(cta.getByTestId('ws-post-submit-dashboard')).toBeVisible();
  });

  test('尚未送出審核時不顯示出口卡', async ({ page }) => {
    await page.goto(T001_UNIT);
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-review-submit-btn')).toBeVisible();
    await expect(page.getByTestId('ws-post-submit-cta')).toHaveCount(0);
  });

  test('出口卡由狀態推導，重新整理後仍在', async ({ page }) => {
    await page.goto(T001_UNIT);
    await dismissGuidelineModal(page);
    await approveAndSubmit(page);
    await expect(page.getByTestId('ws-post-submit-cta')).toBeVisible();

    await page.reload();
    await dismissGuidelineModal(page);

    /* Nothing was submitted on this page load; the card is back because the
       unit's stored state still says it is done. */
    await expect(page.getByTestId('ws-post-submit-cta')).toBeVisible();
  });
});

test.describe('下一個可處理單位 (AC-5)', () => {
  test('指向同一樣本的下一位標記員，而不是已完成的本單位', async ({ page }) => {
    await page.goto(T001_UNIT);
    await dismissGuidelineModal(page);
    await approveAndSubmit(page);

    const next = page.getByTestId('ws-post-submit-next-unit');
    await expect(next).toHaveAttribute('data-record-id', 'sent-001');
    await expect(next).toHaveAttribute('data-annotator-id', '113450022');
  });

  test('點擊後工作區真的換到那個單位，且新單位沒有出口卡', async ({ page }) => {
    await page.goto(T001_UNIT);
    await dismissGuidelineModal(page);
    await approveAndSubmit(page);

    await page.getByTestId('ws-post-submit-next-unit').click();

    /* The breadcrumb's current level names the unit, so it is the honest
       witness that the workspace actually moved. */
    const crumb = page.getByTestId('entry-breadcrumb').locator('[aria-current="page"]');
    await expect(crumb).toContainText('113450022');
    // A fresh unit is not finished, so it must not carry the exits card.
    await expect(page.getByTestId('ws-post-submit-cta')).toHaveCount(0);
  });

  test('跳過本審核員已完成的單位，不把人送回鎖住的頁面', async ({ page }) => {
    await page.goto(T001_UNIT);
    await dismissGuidelineModal(page);
    await approveAndSubmit(page);

    // Finish the second unit too; the CTA must then point past it.
    await page.getByTestId('ws-post-submit-next-unit').click();
    await approveAndSubmit(page);

    const next = page.getByTestId('ws-post-submit-next-unit');
    await expect(next).toHaveAttribute('data-record-id', 'sent-001');
    await expect(next).toHaveAttribute('data-annotator-id', 'tony0950127');
  });
});

test.describe('返回出口帶著清單檢視狀態 (AC-5 × FR-081)', () => {
  test('返回審核清單的連結沿用進來時的篩選、搜尋與每頁筆數', async ({ page }) => {
    await page.goto(T001_UNIT + '&status=pending&q=sent&limit=50');
    await dismissGuidelineModal(page);
    await approveAndSubmit(page);

    const href = await page.getByTestId('ws-post-submit-list').getAttribute('href');
    expect(href).toContain('annotation-list.html');
    expect(href).toContain('task_id=T001');
    expect(href).toContain('status=pending');
    expect(href).toContain('q=sent');
    expect(href).toContain('limit=50');
  });

  test('返回 Dashboard 的連結指向 dashboard，不夾帶清單篩選', async ({ page }) => {
    await page.goto(T001_UNIT + '&status=pending&q=sent&limit=50');
    await dismissGuidelineModal(page);
    await approveAndSubmit(page);

    const href = await page.getByTestId('ws-post-submit-dashboard').getAttribute('href');
    expect(href).toContain('dashboard.html');
    expect(href).not.toContain('status=pending');
  });
});

test.describe('出口卡的無障礙契約 (AC-6 / AC-7)', () => {
  test('使用語意化導覽標記，且三個出口都可鍵盤聚焦', async ({ page }) => {
    await page.goto(T001_UNIT);
    await dismissGuidelineModal(page);
    await approveAndSubmit(page);

    const cta = page.getByTestId('ws-post-submit-cta');
    await expect(cta.locator('nav')).toHaveCount(1);

    /* Focusability is the keyboard contract: a div-with-onclick would pass
       a "is it visible" assertion and fail a real keyboard user. */
    for (const id of ['ws-post-submit-next-unit', 'ws-post-submit-list', 'ws-post-submit-dashboard']) {
      await page.getByTestId(id).focus();
      await expect(page.getByTestId(id)).toBeFocused();
    }
  });

  test('狀態以文字說明，不是只靠顏色', async ({ page }) => {
    await page.goto(T001_UNIT);
    await dismissGuidelineModal(page);
    await approveAndSubmit(page);

    await expect(page.getByTestId('ws-post-submit-cta-title')).toContainText('已完成');
  });
});

test.describe('送出後的入口脈絡 (AC-8 第四路徑)', () => {
  test('送出後麵包屑仍完整，第 2 層仍帶得回清單檢視狀態', async ({ page }) => {
    await page.goto(T001_UNIT + '&status=pending&limit=50');
    await dismissGuidelineModal(page);
    await approveAndSubmit(page);

    const crumb = page.getByTestId('entry-breadcrumb');
    await expect(crumb.locator('a')).toHaveCount(2);
    const listHref = await crumb.locator('a').nth(1).getAttribute('href');
    expect(listHref).toContain('status=pending');
    expect(listHref).toContain('limit=50');
    await expect(crumb.locator('[aria-current="page"]')).toContainText('sent-001');
  });
});
