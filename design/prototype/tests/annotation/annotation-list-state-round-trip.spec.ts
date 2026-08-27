/* spec 015 FR-081 / AC-4.33 (issue #456 AC-4) -- the annotation list's view
 * state survives a trip through the workspace.
 *
 * UXC-11 already puts the list's filter, search and page size in the list's
 * OWN url, so F5 restores the view. What it does not cover is the round
 * trip: buildWorkspaceUrl() rebuilds the workspace link from the context
 * params alone, so the moment a reviewer opens a unit the view state is
 * gone, and every return path -- breadcrumb, sidebar, not-found redirect --
 * lands on an unfiltered page 1. On a list narrowed to the two disputed
 * units, that means re-applying the filter after every single unit.
 *
 * The keys are deliberately the SAME ones annotation-list.html already
 * reads back in applyListStateFromUrl(): the workspace ignores unknown
 * params, so carrying them verbatim makes the return paths that already
 * forward window.location.search work with no further change.
 *
 * `offset` rides along with the other three, but no seed task has more than
 * 5 records while the smallest page size is 20, so page 2 is unreachable
 * through the UI and only the deep-link case below exercises it.
 */
import { expect, test, type Page } from '@playwright/test';
import { buildListUrl, buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

const LIST = buildListUrl({ task_id: 'T014', role: 'annotator', run_type: 'dry_run' });

function listState(page: Page) {
  const params = new URLSearchParams(new URL(page.url()).search);
  return {
    status: params.get('status'),
    q: params.get('q'),
    limit: params.get('limit'),
    offset: params.get('offset'),
  };
}

/* Narrow the list the way an annotator working through a backlog would:
   one status, one search term, a larger page. */
async function narrowList(page: Page) {
  await page.goto(LIST);
  await page.locator('#statusFilter').selectOption('submitted');
  await page.locator('#searchInput').fill('dispute');
  await page.locator('#pageSizeSelect').selectOption('50');
  await expect(page.locator('[data-testid="ws-sample-item"]').first()).toBeVisible();
  expect(listState(page)).toMatchObject({ status: 'submitted', q: 'dispute', limit: '50' });
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('清單檢視狀態的來回往返 (AC-4)', () => {
  test('進入作業頁時把清單的篩選、搜尋與每頁筆數帶著走', async ({ page }) => {
    await narrowList(page);
    await page.locator('[data-testid="ws-sample-item"]').first().click();
    await expect(page).toHaveURL(/annotation-workspace\.html/);
    expect(listState(page)).toMatchObject({ status: 'submitted', q: 'dispute', limit: '50' });
  });

  test('麵包屑返回清單後篩選、搜尋與每頁筆數都還原到控制項上', async ({ page }) => {
    await narrowList(page);
    await page.locator('[data-testid="ws-sample-item"]').first().click();
    await expect(page).toHaveURL(/annotation-workspace\.html/);

    await page.getByTestId('entry-breadcrumb').locator('a').nth(1).click();
    await expect(page).toHaveURL(/annotation-list\.html/);
    /* The url alone is not the assertion: the point is the rendered view,
       so read it back off the controls the annotator actually looks at. */
    await expect(page.locator('#statusFilter')).toHaveValue('submitted');
    await expect(page.locator('#searchInput')).toHaveValue('dispute');
    await expect(page.locator('#pageSizeSelect')).toHaveValue('50');
  });

  test('側邊欄的「標記作業」連結同樣保留清單狀態', async ({ page }) => {
    await narrowList(page);
    await page.locator('[data-testid="ws-sample-item"]').first().click();
    await expect(page).toHaveURL(/annotation-workspace\.html/);

    const href = await page.locator('a.nav-link:has(#navAnnotation)').getAttribute('href');
    expect(href).toContain('status=submitted');
    expect(href).toContain('q=dispute');
    expect(href).toContain('limit=50');
  });

  test('沒有套用任何篩選時不在網址留下空參數', async ({ page }) => {
    await page.goto(LIST);
    await page.locator('[data-testid="ws-sample-item"]').first().click();
    await expect(page).toHaveURL(/annotation-workspace\.html/);
    expect(listState(page)).toEqual({ status: null, q: null, limit: null, offset: null });

    const href = await page.getByTestId('entry-breadcrumb').locator('a').nth(1).getAttribute('href');
    expect(href).not.toContain('status=');
    expect(href).not.toContain('q=');
    expect(href).not.toContain('limit=');
    expect(href).not.toContain('offset=');
  });

  test('深連結作業頁時帶著的清單狀態原樣回到清單', async ({ page }) => {
    /* The only path that can carry offset: nothing in the UI can reach page
       2 on a 5-record seed, but a shared deep link can still carry one. */
    await page.goto(
      buildWorkspaceUrl({ task_id: 'T014', sample_id: 'dry-03-dispute-open', role: 'annotator', run_type: 'dry_run' }) +
        '&status=saved&q=dispute&limit=50&offset=50'
    );
    const href = await page.getByTestId('entry-breadcrumb').locator('a').nth(1).getAttribute('href');
    expect(href).toContain('status=saved');
    expect(href).toContain('q=dispute');
    expect(href).toContain('limit=50');
    expect(href).toContain('offset=50');
  });

  test('審核員清單的狀態同樣往返', async ({ page }) => {
    const reviewerList = buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' });
    await page.goto(reviewerList);
    await page.locator('#searchInput').fill('dispute');
    await expect(page.locator('[data-testid="ws-sample-item"]').first()).toBeVisible();
    await page.locator('[data-testid="ws-sample-item"]').first().click();
    await expect(page).toHaveURL(/annotation-workspace\.html/);
    expect(listState(page)).toMatchObject({ q: 'dispute' });
  });
});
