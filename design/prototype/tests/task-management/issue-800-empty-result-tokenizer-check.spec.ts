/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-021(6) (issue #772); SC-045 (issue #742)
 *
 * Issue #800 (Qodo finding on PR #799): when the current annotation-results
 * filter yields zero samples, buildJsonExportPayload / buildJsonMinExportPayload's
 * `samples.map()`/`.forEach()` never runs, so buildTaskSpecificExportFields's
 * single deriveSequence() call site (SC-045) is never invoked for a
 * word-unit sequence_tagging export -- state.arSeqExportRun.blocked stays
 * false unconditionally, even when the recorded tokenizer engine is
 * unavailable or missing version info. FR-021(6) requires the block
 * decision to come from the shared module's return value, never from this
 * page inspecting the tokenizer fields itself -- but today the module is
 * simply never asked when there are no samples to iterate over.
 *
 * Both call sites that run this "probe pass" share the same bug:
 *   - #arSeqExportConfirmBtn click handler (export-confirm flow)
 *   - redownloadArExportRecord() (export-history redownload, issue #772)
 *
 * Selector/pattern contract reused from existing tests (not invented here):
 *   - #arExportJsonBtn / #arSeqExportModal / #arSeqExportUnitSelect /
 *     #arSeqExportTokenizerField / #arSeqExportTokenizerSelect /
 *     #arSeqExportConfirmBtn / #arSeqExportBlockedNotice / #arSeqExportCancelBtn
 *     (issue-742-seq-tagging-export-dialog.spec.ts)
 *   - #arExportHistoryBody tr / .ar-export-action-btn / #toastMsg, and the
 *     page.evaluate delete-from-SEQ_TAGGING_TOKENIZER_SEEDS trick to
 *     simulate an engine becoming unavailable after the original export
 *     (issue-772-export-history-redownload.spec.ts:309-349)
 *   - ar_stage / ar_status URL view-state params (issue #726)
 */
import { test, expect, type Page } from '@playwright/test';

declare global {
  interface Window {
    LabelSuiteTaskDetailData?: {
      SEQ_TAGGING_TOKENIZER_SEEDS?: Record<string, unknown>;
    };
  }
}

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

const SEQ_TAGGING_TASK_ID = 'T006'; // outputs[] = [{ type: 'sequence_tagging', ... }]
const TOKENIZER_ENGINE_MISSING_VERSION = 'jieba';
const TOKENIZER_ENGINE_WITH_VERSION = 'ckip-transformers';

// T006's seed (AR_SAMPLES_SEQ_TAGGING) only has stage=official with
// status=submitted|draft, and stage=dry with status=pending -- this
// combination matches none of the six seed samples.
const ZERO_RESULT_QUERY = 'ar_stage=official&ar_status=pending';

async function gotoZeroResultAnnotationResults(page: Page) {
  await page.goto(`${TASK_DETAIL_URL}?task_id=${SEQ_TAGGING_TASK_ID}&tab=annotation-results&${ZERO_RESULT_QUERY}`);
  // #arTableSection (the results table) gets `.hidden` and #arEmptyState is
  // shown instead when the filter matches zero samples -- but #arExportSection
  // (export buttons + history table) is a sibling <section>, not a child, so
  // it stays visible and clickable throughout. That is exactly what makes
  // this scenario reachable through the real UI (annotation-results.html:44-168).
  await expect(page.locator('#arEmptyState')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });
  await expect(page.locator('#arExportSection')).toBeVisible();
}

test.describe('issue #800 -- zero filtered samples still check tokenizer availability (export confirm)', () => {
  test('confirming a word-unit export with zero filtered samples and an unavailable tokenizer is blocked, not silently exported', async ({ page }) => {
    await gotoZeroResultAnnotationResults(page);

    const historyRowsBefore = await page.locator('#arExportHistoryBody tr').count();

    await page.locator('#arExportJsonBtn').click();
    await expect(page.locator('#arSeqExportModal')).toBeVisible();
    await page.locator('#arSeqExportUnitSelect').selectOption('word');
    await expect(page.locator('#arSeqExportTokenizerField')).toBeVisible();
    await page.locator('#arSeqExportTokenizerSelect').selectOption(TOKENIZER_ENGINE_MISSING_VERSION);

    let downloadFired = false;
    page.once('download', () => { downloadFired = true; });
    await page.locator('#arSeqExportConfirmBtn').click();

    // FR-021(6)/D5: blocked must be decided by the shared module's return
    // value even when there is nothing to iterate over -- the notice must
    // still appear, and the dialog must stay open (AC-1.12 pattern).
    await expect(page.locator('#arSeqExportBlockedNotice')).toBeVisible();
    await expect(page.locator('#arSeqExportModal')).toBeVisible();

    await page.waitForTimeout(300);
    expect(downloadFired).toBe(false);
    const historyRowsAfter = await page.locator('#arExportHistoryBody tr').count();
    expect(historyRowsAfter).toBe(historyRowsBefore);
  });
});

test.describe('issue #800 -- zero filtered samples still check tokenizer availability (export-history redownload)', () => {
  test('redownloading a word-unit export whose snapshot re-derives to zero samples is still blocked when its tokenizer becomes unavailable', async ({ page }) => {
    await gotoZeroResultAnnotationResults(page);

    // Create the record with a currently-available engine while still
    // filtered to zero samples, so its own conditionsSnapshot re-derives to
    // zero samples again at redownload time.
    await page.locator('#arExportJsonBtn').click();
    await expect(page.locator('#arSeqExportModal')).toBeVisible();
    await page.locator('#arSeqExportUnitSelect').selectOption('word');
    await page.locator('#arSeqExportTokenizerSelect').selectOption(TOKENIZER_ENGINE_WITH_VERSION);
    let baselineDownloadFired = false;
    page.once('download', () => { baselineDownloadFired = true; });
    await page.locator('#arSeqExportConfirmBtn').click();
    await page.waitForTimeout(300);
    expect(baselineDownloadFired).toBe(true);

    await page.locator('#arSeqExportCancelBtn').click();
    await expect(page.locator('#arSeqExportModal')).toBeHidden();

    const historyRowsBefore = await page.locator('#arExportHistoryBody tr').count();

    // 於頁面內移除該引擎的種子資料，使阻擋成為資料驅動的結果（同 issue #772 手法）。
    await page.evaluate((engine) => {
      const seeds = window.LabelSuiteTaskDetailData?.SEQ_TAGGING_TOKENIZER_SEEDS;
      if (seeds) delete seeds[engine];
    }, TOKENIZER_ENGINE_WITH_VERSION);

    const firstRow = page.locator('#arExportHistoryBody tr').first();
    let downloadFired = false;
    page.once('download', () => { downloadFired = true; });
    await firstRow.locator('.ar-export-action-btn').click();

    await expect(page.locator('#toastMsg')).toContainText('切詞引擎');
    await expect(page.locator('#toastMsg')).toContainText(TOKENIZER_ENGINE_WITH_VERSION);

    await page.waitForTimeout(300);
    expect(downloadFired).toBe(false);
    const historyRowsAfter = await page.locator('#arExportHistoryBody tr').count();
    expect(historyRowsAfter).toBe(historyRowsBefore);
  });
});
