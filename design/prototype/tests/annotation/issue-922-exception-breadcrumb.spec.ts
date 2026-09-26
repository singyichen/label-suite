import { test, expect, type Page } from '@playwright/test';
import { skipGuidelineModal } from './_workspace-helpers';

/* issue #922: on the project-leader final-exception-disposition screen of
 * annotation-workspace.html, three areas show pending-exception counts, and
 * two of them already agree with each other:
 *   - Left column title "最終例外池 N 筆" -- counts `pendingExceptionQueue()`
 *     (renderExceptionQueueList(), :2314-2317).
 *   - Mid column progress text "待處置例外 N 項" -- same queue
 *     (renderExceptionQueueNav(), :1756-1758).
 * The TOP BREADCRUMB is the odd one out. renderEntryBreadcrumb() (:1446)
 * only special-cases `currentRole === 'reviewer'` (:1469); `project_leader`
 * falls into the same `else` branch as `annotator` (:1473-1485) and computes
 * a DATASET-RECORD position (`crumbSamplePosTpl`, "樣本 {i} / {n}") against
 * `currentProfile.datasetRecords` -- the annotator's whole dataset, not the
 * exception queue the rest of this screen is scoped to.
 *
 * Reproduction: T016 / ofm-05-final-exception / official_run /
 * annotator_id=kioleemg12, role=project_leader. T016's dataset has 5 records
 * and this sample is the 5th, so the breadcrumb today wrongly reads "樣本 5 /
 * 5", while the exception pool for this task+run_type has exactly 1 pending
 * item (confirmed by issue-907's own suite, which asserts
 * `pendingExceptions.length` is strictly less than the 5-unit dataset for
 * this exact task/run_type).
 *
 * --- Decided Red contract (per issue #922's dispatch, this is a SEMANTIC
 *     contract, not a literal-string match) ---
 * The intended fix gives `project_leader` its own crumb branch, mirroring
 * the existing `reviewer` branch (`crumbUnitTpl`, '審核單位 {sample} ·
 * {annotator}') with a new i18n key `crumbExceptionUnitTpl` ('例外項目
 * {sample} · {annotator}' / 'Exception item {sample} · {annotator}'), filled
 * with `currentSampleId` and `currentAnnotatorId()` -- the same
 * `{sample} · {annotator}` pairing the left column's own active exception-
 * queue row already renders via `poolItem.sampleId + ' · ' + poolItem.annotatorId`
 * (renderExceptionQueueList(), :2337). This file asserts the CONSISTENCY
 * property that fix must satisfy, not the exact template string, so a
 * differently-worded but still-consistent fix stays green:
 *   1. The current crumb (`#entryBreadcrumb [aria-current="page"]`, per
 *      renderEntryBreadcrumb() :1467-1468) must NOT match the dataset-
 *      position pattern `crumbSamplePosTpl` produces for any role ("樣本
 *      {i} / {n}") -- that whole shape is annotator-position semantics that
 *      must never appear on this screen (Data Fairness/consistency: this
 *      role has no dataset position, only a queue position).
 *   2. The current crumb DOES identify the same (sample, annotator) pair the
 *      active left-column row names -- read that row's own
 *      `data-sample-id` / `data-annotator-id` attributes (not a hardcoded
 *      literal) and assert the breadcrumb text contains both values, proving
 *      the breadcrumb is consistent with the left column rather than
 *      independently hardcoded to today's fixture.
 *   3. No lone `{i} / {n}`-shaped number pair appears in the breadcrumb at
 *      all for this role (mirrors how the reviewer branch's own
 *      `crumbUnitTpl` has no slash-delimited numbers either) -- catches a
 *      fix that swaps in the exception-queue length/position but keeps the
 *      "i / n" position format, which would still leak position semantics
 *      even with the right denominator.
 *
 * A minimal one-assertion regression guard for `role=reviewer` (unchanged,
 * correct behavior) is included so a future accidental edit to that branch
 * is caught too -- not a full re-test of reviewer breadcrumb behavior.
 *
 * Traceability: issue #922; specs/annotation/015-annotation-workspace/spec.md
 * FR-095 and AC-4.69 (v6.16.0, issue #907) scoped the left column, mid-column
 * progress, and autosave status to the exception queue for `project_leader`
 * but did not name the breadcrumb -- this is the gap #922 reports and the
 * fix must close under the same FR-095 "最終例外處置畫面不沿用標記員外殼"
 * intent.
 */

const TASK = 'T016';
const RUN_TYPE = 'official_run';
const ANNOTATOR = 'kioleemg12';
const SAMPLE_EXCEPTION = 'ofm-05-final-exception'; // pre-seeded final exception at boot

/* _workspace-helpers.ts's `Role` type is intentionally `'annotator' |
 * 'reviewer'` only, so this local builder mirrors its exact path/query
 * convention for the `project_leader` role value -- same pattern
 * issue-907-exception-pool-screen-shell.spec.ts already uses. */
function buildProjectLeaderUrl(sampleId: string): string {
  return `/pages/annotation/annotation-workspace.html?task_id=${TASK}&sample_id=${sampleId}&role=project_leader&run_type=${RUN_TYPE}&annotator_id=${ANNOTATOR}`;
}

function buildReviewerUrl(sampleId: string): string {
  return `/pages/annotation/annotation-workspace.html?task_id=${TASK}&sample_id=${sampleId}&role=reviewer&run_type=${RUN_TYPE}&annotator_id=${ANNOTATOR}`;
}

function currentCrumb(page: Page) {
  return page.locator('#entryBreadcrumb [aria-current="page"]');
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #922: project_leader breadcrumb must be exception-queue-scoped, not dataset-position-scoped', () => {
  test('current crumb does not use the dataset-position pattern ("樣本 {i} / {n}")', async ({ page }) => {
    await page.goto(buildProjectLeaderUrl(SAMPLE_EXCEPTION));

    const text = (await currentCrumb(page).textContent()) ?? '';
    // Semantic check, not a literal-string comparison: any string matching
    // the crumbSamplePosTpl SHAPE ("樣本 <digits> / <digits>") is the
    // annotator-dataset-position semantic that must never appear for this
    // role, regardless of the exact numbers involved.
    expect(text).not.toMatch(/樣本\s*\d+\s*\/\s*\d+/);
  });

  test('current crumb identifies the same (sample, annotator) pair as the active left-column exception-queue row', async ({
    page,
  }) => {
    await page.goto(buildProjectLeaderUrl(SAMPLE_EXCEPTION));

    const activeRow = page.locator('[data-testid="ws-exception-queue-item"].active');
    await expect(activeRow).toHaveCount(1);
    const expectedSampleId = await activeRow.getAttribute('data-sample-id');
    const expectedAnnotatorId = await activeRow.getAttribute('data-annotator-id');
    expect(expectedSampleId).toBe(SAMPLE_EXCEPTION);
    expect(expectedAnnotatorId).toBe(ANNOTATOR);

    // Consistency check: derived from the active row's own attributes, not
    // hardcoded literals, so this fails if the breadcrumb ever disagrees
    // with the left column about which (sample, annotator) pair is open.
    const text = (await currentCrumb(page).textContent()) ?? '';
    expect(text).toContain(expectedSampleId as string);
    expect(text).toContain(expectedAnnotatorId as string);
  });

  test('current crumb carries no dataset-record-count number leaked from datasetRecords.length', async ({
    page,
  }) => {
    await page.goto(buildProjectLeaderUrl(SAMPLE_EXCEPTION));

    const text = (await currentCrumb(page).textContent()) ?? '';
    // T016's dataset has 5 records; today's buggy crumb reads "樣本 5 / 5".
    // Broader than the single "5/5" literal: the fix drops the position-
    // number format entirely (mirroring the reviewer branch's own
    // crumbUnitTpl, which has no slash-delimited numbers at all), so no
    // "<digits> / <digits>" pair of any value should appear here.
    expect(text).not.toMatch(/\d+\s*\/\s*\d+/);
  });

  /* Minimal regression guard: role=reviewer's existing, correct crumbUnitTpl
   * behavior (currentRole === 'reviewer' branch, :1469-1472) must keep
   * working exactly as today -- a future accidental edit to that branch
   * while fixing the project_leader branch would otherwise go unnoticed by
   * this file. Not a full re-test of reviewer breadcrumb behavior. */
  test('regression guard: reviewer crumb still reads "審核單位 {sample} · {annotator}"', async ({ page }) => {
    await page.goto(buildReviewerUrl(SAMPLE_EXCEPTION));

    const text = (await currentCrumb(page).textContent()) ?? '';
    expect(text).toContain(`審核單位 ${SAMPLE_EXCEPTION} · ${ANNOTATOR}`);
  });
});
