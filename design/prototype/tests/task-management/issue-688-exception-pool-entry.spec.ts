/*
 * Traceability: openspec/changes/align-014-review-model/specs/task-management/014-task-detail/spec.md
 *   FR-018 (final exception pool), FR-008b (task completion preconditions,
 *   point 4), design.md D6.
 *
 * TDD Red for tasks.md 2.1. This spec is the Green contract for tasks 2.2-2.4:
 * the "annotation-progress" panel MUST grow a "最終例外池" (final exception
 * pool) section that reads its rows live off 015 annotation-workspace's
 * existing dispute/arbitration primitives (design.md D6 -- no second, 014-
 * only seed of exception-pool data), and the "標記完成" button MUST gate on
 * that pool being empty for `official_run` (FR-008b point 4). Green MUST NOT
 * edit this file to make it pass -- if a case here conflicts with Green's
 * implementation, Green is wrong, not this test.
 *
 * ---------------------------------------------------------------------
 * Contract decided by this Red (selectors reused or newly picked below,
 * none has prior art -- FR-018's section does not exist pre-v3.0.0):
 *
 *   - #finalExceptionPoolSection: the section wrapper. MUST always be
 *     present in the DOM for a project_leader (never removed/hidden just
 *     because the pool is empty -- FR-018 point 1).
 *   - #finalExceptionPoolTitle: shows the pending count, "{n} 項待處置"
 *     pattern (mirrors the existing #exceptionPoolText FR-005k row's "{m}
 *     項待處置" copy, issue-596-assignment-readonly.spec.ts).
 *   - #finalExceptionPoolBody [data-testid="final-exception-pool-row"]:
 *     one row per pending item, each carrying:
 *       - [data-testid="fep-sample-id"]      sample id
 *       - [data-testid="fep-annotator"]      annotator account
 *       - [data-testid="fep-reviewer"]       reviewer account(s)
 *       - [data-testid="fep-output-type"]    the disputed output type
 *       - [data-testid="fep-arbiter"]        arbiter account + reason
 *       - [data-testid="fep-resolve-link"]   <a> into the FR-095 disposal
 *         screen, href carrying task_id/run_type/annotator_id/sample_id
 *         (FR-018 point 3's literal "task_id × run_type × annotator_id ×
 *         sample_id" identity).
 *   - #finalExceptionPoolEmpty: the empty-state paragraph shown instead of
 *     the table body when the pending count is 0 (FR-018 point 1) -- the
 *     section itself stays rendered, only its body/empty-state toggle.
 *   - Fixture: T017's `oft-01-final-exception` sample was, at the time this
 *     Red was written, seeded (annotation-workspace.data.js
 *     seedReviewFlowDemo()) as an official_run arbitration `reject` outcome
 *     with no exceptionPool resolution yet -- i.e. it was ALREADY a pending
 *     final-exception-pool item under design.md D6's derivation rule, with
 *     zero new seed data required from this PR group. Its reject vote
 *     carried no `reason` string; this Red only requires SOME reason cell
 *     content to render (Green may show a documented fallback), never a
 *     specific reason string, matching that upstream seed's actual shape.
 *
 *     issue #815 (retire-stale-review-demo-fixtures, tasks.md 1.2) retired
 *     T017 outright and migrated its sole arbReject row verbatim into T016's
 *     `ofm-05-final-exception` (annotation-workspace.data.js:3130) -- same
 *     annotator (kioleemg12), same reviewer (reviewer_wang), same arbiter
 *     (reviewer_chen, the roster's only can_arbitrate reviewer), same
 *     reason-less arbReject shape. Every T017 usage below is retargeted to
 *     T016 / ofm-05-final-exception.
 * ---------------------------------------------------------------------
 */
import { test, expect, type Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

async function openAnnotationProgress(page: Page, query: string) {
  await page.goto(TASK_DETAIL_URL + query);
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
  await expect(page.locator('#annotationProgressPanel')).not.toHaveClass(/hidden/);
}

test.describe('Final exception pool entry + completion gate (issue #688)', () => {
  // FR-018 point 1/2: title shows the pending count, rows carry sample id /
  // annotator / reviewer / disputed output type / arbiter + reason.
  test('shows the pending count and row fields for T016 ofm-05-final-exception', async ({ page }) => {
    await openAnnotationProgress(page, '?task_id=T016&tab=annotation-progress&status=official_run_in_progress');

    await expect(page.locator('#finalExceptionPoolSection')).toBeVisible();
    await expect(page.locator('#finalExceptionPoolTitle')).toHaveText(/\d+\s*項待處置/);

    const row = page.locator('[data-testid="final-exception-pool-row"]').filter({ hasText: 'ofm-05-final-exception' });
    await expect(row).toHaveCount(1);
    await expect(row.locator('[data-testid="fep-sample-id"]')).toContainText('ofm-05-final-exception');
    await expect(row.locator('[data-testid="fep-annotator"]')).toContainText('kioleemg12');
    await expect(row.locator('[data-testid="fep-reviewer"]')).toContainText('reviewer_wang');
    await expect(row.locator('[data-testid="fep-output-type"]')).toContainText('single_label');
    await expect(row.locator('[data-testid="fep-arbiter"]')).toContainText('reviewer_chen');
    // Reason cell must render SOME content (Green's documented fallback for
    // this seed's reason-less reject vote), not necessarily a specific string.
    await expect(row.locator('[data-testid="fep-arbiter"]')).not.toHaveText('reviewer_chen');
  });

  // FR-018 point 3: row navigation carries the full review-unit identity.
  test('the row action link carries task_id / run_type / annotator_id / sample_id', async ({ page }) => {
    await openAnnotationProgress(page, '?task_id=T016&tab=annotation-progress&status=official_run_in_progress');

    const link = page.locator('[data-testid="final-exception-pool-row"]')
      .filter({ hasText: 'ofm-05-final-exception' })
      .locator('[data-testid="fep-resolve-link"]');
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).toContain('task_id=T016');
    expect(href).toContain('run_type=official_run');
    expect(href).toContain('sample_id=ofm-05-final-exception');
    expect(href).toMatch(/annotator_id=[^&]+/);
  });

  // FR-018 point 1: 0 pending items renders the empty state, the section
  // itself is never removed/hidden -- it is the closure gate's only
  // auditable surface (FR-008b point 4). issue #815 (retire-stale-review-
  // demo-fixtures, tasks.md 1.2) migrated T017's sole arbReject row into
  // T016 (ofm-05-final-exception), so T016 no longer has zero
  // final-exception-pool items -- retargeted to T015, the other official_run
  // review demo task, which still has no arbReject seed row.
  test('renders the empty state instead of hiding the section when the pool is empty', async ({ page }) => {
    await openAnnotationProgress(page, '?task_id=T015&tab=annotation-progress&status=official_run_in_progress');

    await expect(page.locator('#finalExceptionPoolSection')).toBeVisible();
    await expect(page.locator('#finalExceptionPoolTitle')).toHaveText(/0\s*項待處置/);
    await expect(page.locator('#finalExceptionPoolEmpty')).toBeVisible();
    await expect(page.locator('[data-testid="final-exception-pool-row"]')).toHaveCount(0);
  });

  // FR-018 point 4: only project_leader sees the section.
  test('reviewer role never sees the final exception pool section', async ({ page }) => {
    await openAnnotationProgress(page, '?task_id=T016&role=reviewer&tab=annotation-progress&status=official_run_in_progress');

    await expect(page.locator('#finalExceptionPoolSection')).toBeHidden();
  });

  // FR-008b point 4: a non-empty official_run final exception pool blocks
  // "標記完成" and names the concrete reason, matching the SC-043/FR-008b
  // scenario's "最終例外池尚有 N 項待處置" copy pattern.
  test('blocks 標記完成 and names the exception-pool reason when official_run pool is non-empty', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL + '?task_id=T016&status=official_run_in_progress');
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });

    await page.locator('#tabOverview').click();
    await expect(page.locator('#overviewPanel')).not.toHaveClass(/hidden/);
    await page.locator('#publishCompleteBtn').click();

    await expect(page.locator('#toastMsg')).toContainText(/最終例外池尚有\s*\d+\s*項待處置/);
    await expect(page.locator('#statusBadge')).not.toHaveText('已完成');
  });
});
