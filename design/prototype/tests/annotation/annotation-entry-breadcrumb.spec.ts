/**
 * Reviewer/annotator entry context — breadcrumb (issue #456, AC-1/AC-3/AC-8).
 * Source spec: specs/annotation/015-annotation-workspace/spec.md FR-080
 *
 * The workspace is a full-bleed three-column shell with no page header: once
 * inside, nothing on screen names the task or says which run the unit belongs
 * to. FR-064's context banner answers "which unit", but it is scoped to one
 * review unit and never carries the task name, so a reviewer who arrived by
 * deep link cannot tell T016 from T017 — both render the same card.
 *
 * These tests pin the breadcrumb that closes that gap on all three entry
 * paths that exist before submission (dashboard quick-review CTA, list row,
 * direct URL), plus the fourth path — the same unit after a submit. That
 * last one arrived with issue #456's post-submit exit card and outlived it:
 * issue #517 retired the card (FR-082 / AC-4.34), and the breadcrumb is now
 * the only thing carrying the list view state back off a finished unit.
 *
 * Component contract: design/system/MASTER.md §Breadcrumb (three levels are
 * allowed on the reviewer path only).
 */
import { test, expect, type Page } from '@playwright/test';
import { buildListUrl, buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';

/** T016 — official_run, min_reviewers = 3. Its name is what a deep link needs. */
const T016_NAME = '審核流程示範：正式標記（三審核員多數決）';

function crumb(page: Page) {
  return page.locator('nav.breadcrumb[data-testid="entry-breadcrumb"]');
}

test.describe('Entry breadcrumb — workspace', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
  });

  test('deep link builds all three levels without any prior navigation', async ({ page }) => {
    await page.goto(
      buildWorkspaceUrl({
        task_id: 'T016',
        sample_id: 'ofm-03-modified-interim',
        role: 'reviewer',
        run_type: 'official_run',
        reviewer_id: 'reviewer_wang',
        annotator_id: 'kioleemg12',
      }),
    );

    const nav = crumb(page);
    await expect(nav).toBeVisible();
    await expect(nav.locator('a')).toHaveCount(2);
    // Level 1 names the role's work area, level 2 the task + run, level 3 the unit.
    await expect(nav.locator('a').first()).toHaveText('審核作業');
    await expect(nav.locator('a').nth(1)).toContainText(T016_NAME);
    await expect(nav.locator('a').nth(1)).toContainText('正式標記');
    const current = nav.locator('[aria-current="page"]');
    await expect(current).toContainText('ofm-03-modified-interim');
    await expect(current).toContainText('kioleemg12');
  });

  test('each level links to a distinct destination, carrying its context', async ({ page }) => {
    await page.goto(
      buildWorkspaceUrl({
        task_id: 'T016',
        sample_id: 'ofm-03-modified-interim',
        role: 'reviewer',
        run_type: 'official_run',
        reviewer_id: 'reviewer_wang',
      }),
    );

    await expect(crumb(page).locator('a')).toHaveCount(2);
    const hrefs = await crumb(page).locator('a').evaluateAll((els) =>
      els.map((el) => (el as HTMLAnchorElement).getAttribute('href') ?? ''),
    );
    // Level 1 is the work area. annotation-list.html without a task_id is an
    // error state whose own recovery CTA points at the dashboard, so that is
    // where the work-area level goes too.
    expect(hrefs[0]).toContain('dashboard.html');
    // Level 2 is this task's list, and must replay the caller's context so
    // going back cannot silently drop the run or the role.
    expect(hrefs[1]).toContain('annotation-list.html');
    expect(hrefs[1]).toContain('task_id=T016');
    expect(hrefs[1]).toContain('role=reviewer');
    expect(hrefs[1]).toContain('run_type=official_run');
  });

  test('annotator path names its own work area and shows a queue position', async ({ page }) => {
    await page.goto(
      buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-002', role: 'annotator' }),
    );

    const nav = crumb(page);
    await expect(nav.locator('a').first()).toHaveText('標記作業');
    const current = nav.locator('[aria-current="page"]');
    // A position, not the record id: on seeds like T011/T012 the id field is
    // unassigned metadata, and Data Fairness forbids unassigned fields from
    // reaching annotator-facing DOM. See annotation-workspace-data-fairness.
    await expect(current).toHaveText(/^樣本 2 \/ \d+$/);
    // The annotator IS the annotator — naming them back at themselves is noise.
    await expect(current).not.toContainText('kioleemg12');
  });

  test('the annotator breadcrumb never carries an unassigned record id', async ({ page }) => {
    // T012 keys its records by `article_id`, which field_role_map leaves
    // unassigned; the breadcrumb must not become a new leak surface.
    await page.goto(
      buildWorkspaceUrl({ task_id: 'T012', sample_id: 'eac8d013', role: 'annotator' }),
    );
    await expect(crumb(page)).not.toContainText('eac8d013');
  });

  test('uses semantic navigation markup with hidden separators', async ({ page }) => {
    await page.goto(
      buildWorkspaceUrl({
        task_id: 'T016',
        sample_id: 'ofm-03-modified-interim',
        role: 'reviewer',
        run_type: 'official_run',
      }),
    );

    const nav = crumb(page);
    await expect(nav).toHaveAttribute('aria-label', 'breadcrumb');
    const seps = nav.locator('.breadcrumb-sep');
    await expect(seps).toHaveCount(2);
    for (const sep of await seps.all()) {
      await expect(sep).toHaveAttribute('aria-hidden', 'true');
    }
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  });

  test('follows the language toggle', async ({ page }) => {
    await page.goto(
      buildWorkspaceUrl({
        task_id: 'T016',
        sample_id: 'ofm-03-modified-interim',
        role: 'reviewer',
        run_type: 'official_run',
      }),
    );
    await expect(crumb(page).locator('a').first()).toHaveText('審核作業');
    await page.getByTestId('lang-toggle').click();
    await expect(crumb(page).locator('a').first()).toHaveText('Review');
  });
});

test.describe('Entry breadcrumb — list', () => {
  test('list shows work area and task name for the reviewer', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T016', role: 'reviewer', run_type: 'official_run' }));

    const nav = crumb(page);
    await expect(nav).toBeVisible();
    await expect(nav.locator('a')).toHaveCount(1);
    await expect(nav.locator('a').first()).toHaveText('審核作業');
    const current = nav.locator('[aria-current="page"]');
    await expect(current).toContainText(T016_NAME);
    await expect(current).toContainText('正式標記');
  });

  test('list without a task_id degrades to the work-area level only', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-list.html?role=reviewer');

    const nav = crumb(page);
    await expect(nav).toBeVisible();
    await expect(nav.locator('a')).toHaveCount(0);
    await expect(nav.locator('[aria-current="page"]')).toHaveText('審核作業');
  });
});

test.describe('Entry breadcrumb — entry paths (AC-8)', () => {
  test('dashboard quick-review CTA lands with a complete breadcrumb', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(DASHBOARD_URL);
    await page.locator('.scenario-pill[data-scenario="reviewer"]').click();
    await page.getByRole('button', { name: /快速審核|Quick Review/ }).first().click();
    await expect(page).toHaveURL(/annotation-workspace\.html\?/);

    const nav = crumb(page);
    await expect(nav).toBeVisible();
    await expect(nav.locator('a')).toHaveCount(2);
    await expect(nav.locator('a').first()).toHaveText('審核作業');
  });

  test('list row entry lands with a complete breadcrumb', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildListUrl({ task_id: 'T016', role: 'reviewer', run_type: 'official_run' }));
    await page.getByTestId('list-quick-continue-btn').click();
    await expect(page).toHaveURL(/annotation-workspace\.html\?/);

    const nav = crumb(page);
    await expect(nav.locator('a')).toHaveCount(2);
    await expect(nav.locator('a').nth(1)).toContainText(T016_NAME);
  });
});

test.describe('Entry breadcrumb — after a submit (AC-8 fourth path)', () => {
  /* T001 defaults to min_reviewers = 1, so one submitted review finishes the
     unit — the state in which the reviewer most needs a way back out. */
  test('breadcrumb survives a submit and still carries the list view state', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(
      buildWorkspaceUrl({
        task_id: 'T001',
        sample_id: 'sent-001',
        role: 'reviewer',
        run_type: 'official_run',
      }) + '&status=pending&limit=50',
    );
    await page.getByTestId('ws-review-row-approve').click();
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');

    const nav = crumb(page);
    await expect(nav.locator('a')).toHaveCount(2);
    const listHref = await nav.locator('a').nth(1).getAttribute('href');
    expect(listHref).toContain('status=pending');
    expect(listHref).toContain('limit=50');
    await expect(nav.locator('[aria-current="page"]')).toContainText('sent-001');
  });
});
