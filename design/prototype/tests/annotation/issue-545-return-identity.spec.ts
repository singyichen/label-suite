import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, patchDataFile, skipGuidelineModal } from './_workspace-helpers';

/* issue #545 — the identity half of the workspace's "back to the list" URL.
 *
 * FR-049 (spec 015 v3.8.0) makes `annotator_id` / `reviewer_id` the params
 * that decide WHICH SUBMISSION BUCKET a page reads. annotation-list.html
 * forwards them onto every row it opens (identityQuery(), :968) and resolves
 * its own row statuses through them (resolveIdentity(), :1101) — so the pair
 * has to survive the round trip, or the return lands on a list computing
 * someone else's progress under the visitor's name.
 *
 * FR-081 (issue #456) already established the pattern for the UXC-11 view
 * state: whatever rides IN on the URL has to ride back OUT through
 * buildListReturnUrl(), the single writer both return paths share
 * (the FR-080 breadcrumb, and FR-022C's all-done return). Identity was
 * simply left out of that list, so it silently reset to the default roster
 * identity — `kioleemg12` for an annotator, `reviewer_wang` for a reviewer.
 *
 * "Absent stays absent" is load-bearing, not incidental (FR-049): a URL that
 * carried no identity must not gain `annotator_id=` out of nowhere, because
 * both pages fall back to the same default only while the param is missing.
 */

const OTHER_ANNOTATOR = '113450022';
const OTHER_REVIEWER = 'reviewer_li';

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

/* The breadcrumb's level-2 link IS buildListReturnUrl()'s output, readable
   without navigating (annotation-list-state-round-trip.spec.ts uses the same
   locator). */
function returnHref(page: import('@playwright/test').Page) {
  return page.getByTestId('entry-breadcrumb').locator('a').nth(1).getAttribute('href');
}

test.describe('Return URL carries identity (issue #545, FR-049 / FR-081)', () => {
  test('an annotator returns as themselves, not as the default roster identity', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({
      task_id: 'T001', sample_id: 'sent-001', annotator_id: OTHER_ANNOTATOR,
    }));

    const url = new URL(await returnHref(page) as string, page.url());
    expect(url.searchParams.get('annotator_id')).toBe(OTHER_ANNOTATOR);
  });

  test('a reviewer returns with both identity params', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({
      task_id: 'T001', sample_id: 'sent-001', role: 'reviewer',
      annotator_id: OTHER_ANNOTATOR, reviewer_id: OTHER_REVIEWER,
    }));

    const url = new URL(await returnHref(page) as string, page.url());
    expect(url.searchParams.get('reviewer_id')).toBe(OTHER_REVIEWER);
    expect(url.searchParams.get('annotator_id')).toBe(OTHER_ANNOTATOR);
  });

  /* Reverse guard: the fix must forward what arrived, NOT unconditionally
     stamp the resolved identity onto the URL. Without this, "always write
     both params" would pass every assertion above while breaking FR-049's
     absent-means-default contract. */
  test('a URL with no identity params does not acquire any', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));

    const href = await returnHref(page) as string;
    expect(href).not.toContain('annotator_id');
    expect(href).not.toContain('reviewer_id');
  });

  test('identity rides out alongside the FR-081 view state, not instead of it', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({
      task_id: 'T001', sample_id: 'sent-001', annotator_id: OTHER_ANNOTATOR,
    }) + '&status=pending&q=%E6%89%8B%E8%A1%93');

    const url = new URL(await returnHref(page) as string, page.url());
    expect(url.searchParams.get('annotator_id')).toBe(OTHER_ANNOTATOR);
    expect(url.searchParams.get('status')).toBe('pending');
    expect(url.searchParams.get('q')).toBe('手術');
  });

  test('the FR-022C all-done return carries identity too', async ({ page }) => {
    // One record, so the very first submit is also the last one.
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T001.datasetRecords =
        window.LabelSuiteTaskDetailData.profiles.T001.datasetRecords.slice(0, 1);
    `);
    await page.goto(buildWorkspaceUrl({
      task_id: 'T001', sample_id: 'sent-001', annotator_id: OTHER_ANNOTATOR,
    }));

    /* Assert on the URL the navigation REQUESTED: annotation-list.html
       re-normalises its own address on boot, so page.url() would measure the
       destination's rewrite rather than what buildListReturnUrl() emitted
       (see issue-514-submit-navigation.spec.ts for the full rationale). */
    const returnRequest = page.waitForRequest((req) => req.url().includes('annotation-list.html'));
    await page.getByTestId('ws-submit-btn').click();

    const url = new URL((await returnRequest).url());
    expect(url.searchParams.get('annotator_id')).toBe(OTHER_ANNOTATOR);

    /* Let the navigation land before the test ends: tearing the page down
       mid-flight kills the patchDataFile route handler while the list is
       still fetching through it, which surfaces as a route.fetch error
       rather than as anything about the assertion above. */
    await expect(page).toHaveURL(/annotation-list\.html\?/);
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  /* The consequence the two hops above only imply: the identity has to still
     be in force on the page it lands on. A list row opens the workspace
     through identityQuery(), so the round trip closes only if the row still
     addresses `113450022`'s bucket rather than the default annotator's. */
  test('the identity is still in force on the list it lands on', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({
      task_id: 'T001', sample_id: 'sent-001', annotator_id: OTHER_ANNOTATOR,
    }));
    await page.getByTestId('entry-breadcrumb').locator('a').nth(1).click();
    await expect(page).toHaveURL(/annotation-list\.html/);

    await page.getByTestId('ws-sample-item').first().click();
    await expect(page).toHaveURL(/annotation-workspace\.html/);
    expect(new URL(page.url()).searchParams.get('annotator_id')).toBe(OTHER_ANNOTATOR);
  });
});
