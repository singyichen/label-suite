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
 * direct URL). The post-submission path is AC-5's and lands with the CTAs.
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

  test('breadcrumb links carry the same task/role/run context back to the list', async ({ page }) => {
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
    for (const href of await crumb(page).locator('a').evaluateAll((els) =>
      els.map((el) => (el as HTMLAnchorElement).getAttribute('href') ?? ''),
    )) {
      expect(href).toContain('annotation-list.html');
      expect(href).toContain('task_id=T016');
      expect(href).toContain('role=reviewer');
      expect(href).toContain('run_type=official_run');
    }
  });

  test('annotator path names its own work area and omits the annotator level', async ({ page }) => {
    await page.goto(
      buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator' }),
    );

    const nav = crumb(page);
    await expect(nav.locator('a').first()).toHaveText('標記作業');
    const current = nav.locator('[aria-current="page"]');
    await expect(current).toContainText('sent-001');
    // The annotator IS the annotator — naming them back at themselves is noise.
    await expect(current).not.toContainText('kioleemg12');
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
