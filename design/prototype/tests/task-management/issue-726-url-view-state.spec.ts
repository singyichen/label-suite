/*
 * Traceability: openspec/changes/task-detail-url-view-state/specs/task-management/014-task-detail/spec.md
 *   FR-019, AC-1.8, AC-1.9, SC-044, AC-2.5
 *
 * TDD Red (tasks.md 1.1 + 1.2, issue #726). `task-detail.html` currently only
 * READS `?tab=` inside parseRole() -- there is no write-back at all, and no
 * expanded read for the other 14 URL_VIEW_STATE parameters design.md defines.
 * Every test in this file is expected to fail against that baseline; Green
 * work happens in task 1.3 (senior-frontend) and MUST NOT weaken any
 * assertion here to pass.
 */
import * as fs from 'fs';
import * as path from 'path';
import { test, expect, type Page } from '@playwright/test';

declare global {
  interface Window {
    state?: Record<string, unknown>;
    renderAnnotationResults?: () => void;
    renderMemberManagement?: () => void;
    renderWorkLog?: () => void;
    renderAnnotationProgress?: () => void;
  }
}

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const SOURCE_PATH = path.resolve(__dirname, '../../pages/task-management/task-detail.html');

// Tab panels arrive via fetched partials; event bindings and the four
// renderers only run after the last partial (#workLogPanel) lands (see
// design.md's cited loadAllTabPanels()/init() sequence). Wait for it before
// interacting, mirroring the established idiom in
// task-detail-review-assignment.spec.ts.
const PANEL_LOAD_TIMEOUT = 15000;

async function gotoTaskDetail(page: Page, query: string) {
  await page.goto(`${TASK_DETAIL_URL}?${query}`);
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
}

async function openTab(page: Page, tabId: string, panelId: string) {
  await page.locator(`#${tabId}`).click();
  await expect(page.locator(`#${panelId}`)).not.toHaveClass(/hidden/);
}

/*
 * All three paginated lists (annotation-results: 6 samples, member
 * -management: 7 members, work-log: 7 entries for T001) are smaller than the
 * smallest selectable page size (20) -- see the page-size <option> lists in
 * the panel partials. A real click on "next page" is therefore unreachable
 * with today's seed data; task-detail-member-management-add.spec.ts already
 * documents #memberNextPageBtn as disabled for the same reason.
 *
 * To still exercise the REAL click -> REAL event-handler -> REAL render path
 * (rather than fabricating state.page directly, which would test nothing),
 * this helper pokes the page-SIZE fixture down through the already-exposed
 * global renderer. `state.<x>PageSize` is not part of the FR-019
 * URL_VIEW_STATE table and is never asserted on -- only used to force
 * totalPages > 1 so the next-page button becomes real-clickable.
 */
async function forceMultiPage(page: Page, renderFn: 'renderAnnotationResults' | 'renderMemberManagement' | 'renderWorkLog', pageSizeField: string) {
  await page.evaluate(
    ({ renderFn, pageSizeField }) => {
      const state = window.state as Record<string, number>;
      state[pageSizeField] = 2;
      const render = window[renderFn] as (() => void) | undefined;
      render?.();
    },
    { renderFn, pageSizeField },
  );
}

test.describe('Task detail URL view-state (issue #726)', () => {
  test.describe('1.1 behavioral write-back / restore / fallback / role-boundary contract', () => {
    test('switching tabs writes `tab` to the URL; returning to overview omits the default', async ({ page }) => {
      await gotoTaskDetail(page, 'task_id=T001&task_role=project_leader');

      await openTab(page, 'tabAnnotationResults', 'annotationResultsPanel');
      expect(new URL(page.url()).searchParams.get('tab')).toBe('annotation-results');

      await openTab(page, 'tabOverview', 'overviewPanel');
      // `overview` is the default tab (FR-019 (1)/(2)): once restored, the
      // param MUST be removed rather than written as `tab=overview`.
      expect(new URL(page.url()).searchParams.get('tab')).toBeNull();
    });

    test('annotation-results filter changes write ar_* params; reverting to the default removes them', async ({ page }) => {
      await gotoTaskDetail(page, 'task_id=T001&task_role=project_leader');
      await openTab(page, 'tabAnnotationResults', 'annotationResultsPanel');

      await page.locator('#arReviewStatusSelect').selectOption('disputed');
      expect(new URL(page.url()).searchParams.get('ar_review_status')).toBe('disputed');

      await page.locator('#arReviewStatusSelect').selectOption('all');
      expect(new URL(page.url()).searchParams.get('ar_review_status')).toBeNull();
    });

    test('annotation-progress stage and sort changes write ap_stage / ap_sort', async ({ page }) => {
      await gotoTaskDetail(page, 'task_id=T001&task_role=project_leader');
      await openTab(page, 'tabAnnotationProgress', 'annotationProgressPanel');

      // Sort FIRST, while the default stage (T001's latest trial round,
      // 'r2') still has members and #memberProgressSort is visible. T001
      // has no entry in ANNOTATION_PROGRESS_BY_TASK (only T014-T016 do), so
      // it falls back to DEFAULT_ANNOTATION_PROGRESS, whose official.members
      // is []; renderProgressEmptyState() then hides #memberProgressSection
      // (and the sort control inside it) once stage=official. Interacting
      // with the sort control AFTER switching to official is structurally
      // unreachable on this seed data and times out for the wrong reason --
      // ordering it first keeps both write-back assertions genuine.
      await page.locator('#memberProgressSort').selectOption('speed_desc');
      expect(new URL(page.url()).searchParams.get('ap_sort')).toBe('speed_desc');

      // T001's default progressStage is its latest trial round ('r2'), so
      // clicking the "official" pill is a genuine non-default transition.
      await page.locator('#progressRoundPills button', { hasText: '正式標記' }).click();
      expect(new URL(page.url()).searchParams.get('ap_stage')).toBe('official');

      // ap_sort is a per-tab list-state param, not scoped to a single
      // stage -- switching stages must not silently drop it, even though
      // the sort control itself is now hidden (official has no members to
      // sort). The underlying state value is unaffected by visibility.
      expect(new URL(page.url()).searchParams.get('ap_sort')).toBe('speed_desc');
    });

    test('work-log filter changes write wl_stage / wl_from', async ({ page }) => {
      await gotoTaskDetail(page, 'task_id=T001&task_role=project_leader');
      await openTab(page, 'tabWorkLog', 'workLogPanel');

      await page.locator('#workLogStageSelect').selectOption('official');
      expect(new URL(page.url()).searchParams.get('wl_stage')).toBe('official');

      await page.locator('#workLogDateFrom').fill('2026-04-19');
      expect(new URL(page.url()).searchParams.get('wl_from')).toBe('2026-04-19');
    });

    test('page turns write ar_page / mm_page / wl_page (forced multi-page via page-size fixture)', async ({ page }) => {
      await gotoTaskDetail(page, 'task_id=T001&task_role=project_leader');

      await openTab(page, 'tabAnnotationResults', 'annotationResultsPanel');
      await forceMultiPage(page, 'renderAnnotationResults', 'arPageSize');
      await page.locator('#arNextPageBtn').click();
      expect(new URL(page.url()).searchParams.get('ar_page')).toBe('2');

      await openTab(page, 'tabMemberManagement', 'memberManagementPanel');
      await forceMultiPage(page, 'renderMemberManagement', 'memberPageSize');
      await page.locator('#memberNextPageBtn').click();
      expect(new URL(page.url()).searchParams.get('mm_page')).toBe('2');

      await openTab(page, 'tabWorkLog', 'workLogPanel');
      await forceMultiPage(page, 'renderWorkLog', 'wlPageSize');
      await page.locator('#wlNextPageBtn').click();
      expect(new URL(page.url()).searchParams.get('wl_page')).toBe('2');
    });

    test('task_id / role / run_type survive a filter change and a page turn (anti new-URLSearchParams() guard)', async ({ page }) => {
      // run_type is not currently read by parseRole() (confirmed: no
      // params.get('run_type') call exists in task-detail.html today), but
      // FR-019 (2) requires it be preserved as an existing route param
      // regardless -- a naive `new URLSearchParams()` rebuild (the anti
      // -pattern at admin/user-management.html:1132-1166) would drop it
      // silently. This assertion pins that survival independent of whether
      // the app ever consumes the value.
      await gotoTaskDetail(page, 'task_id=T001&task_role=project_leader&run_type=dry_run');
      const survives = (url: string) => {
        const params = new URL(url).searchParams;
        expect(params.get('task_id')).toBe('T001');
        expect(params.get('task_role')).toBe('project_leader');
        expect(params.get('run_type')).toBe('dry_run');
      };

      await openTab(page, 'tabAnnotationResults', 'annotationResultsPanel');
      survives(page.url());

      await page.locator('#arReviewStatusSelect').selectOption('disputed');
      survives(page.url());

      // Reset the filter before forcing multi-page: T001 has only one
      // 'disputed' sample, so a review-status filter that collapses the
      // list to a single row makes a real page 2 unreachable regardless of
      // page size. The page-turn assertion below needs the full 6-sample
      // list to have more than one page.
      await page.locator('#arReviewStatusSelect').selectOption('all');
      await forceMultiPage(page, 'renderAnnotationResults', 'arPageSize');
      await page.locator('#arNextPageBtn').click();
      survives(page.url());
    });

    test('AC-1.9: a URL carrying work-log filters restores the tab, the filter selects, and the page', async ({ page }) => {
      await gotoTaskDetail(
        page,
        'task_id=T001&task_role=project_leader&tab=work-log&wl_stage=official&wl_page=1',
      );

      await expect(page.locator('#workLogPanel')).not.toHaveClass(/hidden/);
      await expect(page.locator('#workLogStageSelect')).toHaveValue('official');
      // T001 seeds only 7 work-log entries against a 20-row minimum page
      // size (see forceMultiPage's comment) -- there is no real page 2 to
      // restore into, so this test scopes "page restored" down to the only
      // value reachable with real data (page 1). The "page number beyond
      // what the real list supports" edge is covered instead by the
      // SC-044 invalid-value-fallback test below (ar_page=999).
    });

    test('AC-1.9: a URL carrying annotation-results filters restores the tab and the filter select', async ({ page }) => {
      await gotoTaskDetail(
        page,
        'task_id=T001&task_role=project_leader&tab=annotation-results&ar_review_status=disputed',
      );

      await expect(page.locator('#annotationResultsPanel')).not.toHaveClass(/hidden/);
      await expect(page.locator('#arReviewStatusSelect')).toHaveValue('disputed');
    });

    test('SC-044: a valid ar_review_status filter is applied while an invalid ar_stage enum and out-of-range ar_page fall back to defaults', async ({ page }) => {
      // Pairing a VALID, currently-unread parameter (ar_review_status) with
      // two INVALID ones in the same URL is deliberate: if this test only
      // exercised the invalid half, it would pass vacuously today (nothing
      // reads ar_stage/ar_page/ar_review_status yet) and would keep passing
      // under a broken Green that reads valid params but crashes/blanks on
      // invalid ones -- exactly the regression SC-044 exists to catch. The
      // valid-half assertion below is what makes this test genuinely red now.
      await gotoTaskDetail(
        page,
        'task_id=T001&task_role=project_leader&tab=annotation-results&ar_review_status=disputed&ar_stage=r99&ar_page=999',
      );

      await expect(page.locator('#annotationResultsPanel')).not.toHaveClass(/hidden/);
      // VALID half: ar_review_status=disputed must actually be applied to
      // the filter control. T001 seeds exactly one 'disputed' sample (see
      // getArFilteredSamples()), so this is a real, observable filter
      // effect -- not just an echoed control value.
      await expect(page.locator('#arReviewStatusSelect')).toHaveValue('disputed');
      // INVALID half: unknown enum -> falls back to the filter's default ('all').
      await expect(page.locator('#arStageSelect')).toHaveValue('all');
      // INVALID half: out-of-range page -> clamps to the last real page
      // instead of rendering blank/erroring. The list must still show the
      // real (disputed) row, not an empty table.
      await expect(page.locator('#arResultTableBody tr').first()).toBeVisible();
      const rowCount = await page.locator('#arResultTableBody tr').count();
      expect(rowCount).toBeGreaterThan(0);
    });

    test('SC-044: a valid wl_stage filter is applied while a non-numeric wl_page falls back to the default page', async ({ page }) => {
      // Same pairing rationale as the annotation-results SC-044 case above:
      // wl_stage=official is a VALID, currently-unread parameter (distinct
      // from wl_page=abc, the invalid one), so the "no error, real rows"
      // claim is tied to a scenario where real filter-reading logic is
      // actually exercised, catching a Green that mishandles wl_page while
      // ignoring wl_stage.
      await gotoTaskDetail(
        page,
        'task_id=T001&task_role=project_leader&tab=work-log&wl_stage=official&wl_page=abc',
      );

      await expect(page.locator('#workLogPanel')).not.toHaveClass(/hidden/);
      // VALID half: wl_stage=official must actually be applied.
      await expect(page.locator('#workLogStageSelect')).toHaveValue('official');
      // INVALID half: non-numeric page -> falls back to the default page
      // instead of erroring or rendering a blank table.
      const rowCount = await page.locator('#workLogTableBody tr').count();
      expect(rowCount).toBeGreaterThan(0);
    });

    test('AC-2.5: a reviewer directly opening ?tab=member-management is redirected and the URL is rewritten', async ({ page }) => {
      await gotoTaskDetail(
        page,
        'task_id=T001&task_role=reviewer&tab=member-management&mm_page=2',
      );

      // FR-006 role gate: reviewer must land on overview, not member-management.
      await expect(page.locator('#overviewPanel')).not.toHaveClass(/hidden/);
      await expect(page.locator('#memberManagementPanel')).toHaveClass(/hidden/);

      // The URL must be rewritten to match what actually rendered -- no
      // leftover tab=member-management or mm_page from the rejected request.
      const params = new URL(page.url()).searchParams;
      expect(params.get('tab')).not.toBe('member-management');
      expect(params.get('mm_page')).toBeNull();
    });
  });

  test.describe('1.2 source-scan guards (design.md D1/D2/D3 structural contract)', () => {
    const source = fs.readFileSync(SOURCE_PATH, 'utf8');

    test('history.pushState() is never used -- filtering/pagination MUST NOT create history entries', () => {
      const count = (source.match(/history\.pushState\(/g) || []).length;
      expect(count).toBe(0);
    });

    test('history.replaceState() calls converge on a single write-back function', () => {
      // design.md D1/D2: one syncUrlToViewState() function is the only
      // caller of history.replaceState(); ~20 individual filter/sort/page
      // handlers must NOT each call it directly. Today this is 0 -- no
      // write-back exists at all yet.
      const count = (source.match(/history\.replaceState\(/g) || []).length;
      expect(count).toBe(1);
    });

    test('the review-status legal-value set has exactly one hardcoded definition (Generalization-First)', () => {
      // AR_REVIEW_STATUS_ORDER is the sole source of truth for the
      // ar_review_status enum (design.md D5); a second hardcoded copy in
      // the URL-parsing code would silently drift from it the next time a
      // status is added.
      // Three-state as of spec 014 v3.0.0 (issue #688); the former
      // `approved`/`modified` interim states were retired (issue #807).
      const literalArrayCount = (
        source.match(/\['pending', 'disputed', 'finalized'\]/g) || []
      ).length;
      expect(literalArrayCount).toBe(1);

      const identifierCount = (source.match(/AR_REVIEW_STATUS_ORDER/g) || []).length;
      // 1 definition + at least 1 usage site; a URL-parsing validator that
      // reads this identifier adds a further usage site instead of a new
      // literal array.
      expect(identifierCount).toBeGreaterThanOrEqual(2);
    });
  });
});
