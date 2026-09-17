/*
 * Traceability: openspec/changes/task-detail-export-history-redownload/
 *   specs/task-management/014-task-detail/spec.md
 *   FR-021, AC-1.14, AC-1.15, AC-1.16, SC-046 (issue #772).
 *
 * TDD Red (tasks.md group 1, tasks 1.1/1.2/1.3). Today
 * `renderArExportHistory()` (task-detail.html:9642) builds each export-history
 * row's "download" button (`.ar-export-action-btn`) with no click handler at
 * all and never sets `disabled`, so every test below is expected to fail
 * against that baseline. Green work happens in tasks 1.4-1.6
 * (senior-frontend) and MUST NOT weaken or rewrite any assertion here to
 * pass.
 *
 * Selector contract this file relies on (already established by
 * `annotation-results.html` / issue #742's
 * `issue-742-seq-tagging-export-dialog.spec.ts` -- not invented here):
 *   - `#arExportHistoryBody tr` export-history rows;
 *     `.ar-export-action-btn` the per-row "download" button
 *   - `#arSeqExportModal`, `#arSeqExportSchemeSelect`,
 *     `#arSeqExportUnitSelect`, `#arSeqExportTokenizerField`,
 *     `#arSeqExportTokenizerSelect`, `#arSeqExportConfirmBtn`,
 *     `#arSeqExportCancelBtn`, `#arSeqExportExpansionSummary`
 *   - `#arExportJsonBtn`, `#arExportJsonMinBtn`
 *   - `#arStageSelect`, `#arStatusSelect`, `#arAnnotatorSelect`,
 *     `#arReviewerSelect`, `#arReviewStatusSelect`
 *   - `#langToggle` (existing global language switch, see
 *     task-detail-sampling-edit.spec.ts)
 *
 * Two assumptions this file makes about *where* Green shows required text --
 * neither is a new test id, but neither is a hard spec/design contract
 * either, so both are called out again in the Red report:
 *   1. AC-1.16 "缺快照" case: the Chinese explanation for the disabled
 *      button is asserted via the button's `title` attribute, reusing the
 *      existing `disabled` + `title="..."` pattern already in this file
 *      (task-detail.html:5994, `dryRunDisabled` button). Spec/design.md do
 *      not name the attribute explicitly.
 *   2. AC-1.16 "切詞引擎不可用" case: the Chinese blocked-reason message is
 *      asserted via `#toastMsg` (the existing generic toast channel already
 *      used by `performArExport()` and asserted on in
 *      `task-detail-annotation-results.spec.ts`), because FR-021(1)
 *      forbids opening `#arSeqExportModal` (which is where the dialog-only
 *      `#arSeqExportBlockedNotice` lives) during redownload, so that
 *      element cannot be the vehicle. Design.md D4 only says "本頁只依回傳值
 *      顯示中文原因", not which existing element carries it.
 *
 * Byte-exact comparison (tasks.md group-1 note): every "same file" assertion
 * below compares the full downloaded text string directly (`toBe`), never
 * `JSON.parse`-then-compare-objects. `JSON.parse` is only used to spot-check
 * individual metadata fields (manifest tagging_scheme/token_unit/tokenizer,
 * exported_at), which is a separate concern from the equality check.
 */
import { promises as fsp } from 'node:fs';
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
// Short timeout for the redownload click: today's baseline has no handler
// at all, so waiting for a "download" event would otherwise hang for the
// default Playwright timeout on every failing test in this file.
const NO_DOWNLOAD_TIMEOUT = 5000;

const SEQ_TAGGING_TASK_ID = 'T006'; // outputs[] = [{ type: 'sequence_tagging', ... }]
const ENTITY_RECOGNITION_TASK_ID = 'T010'; // outputs[] = [entity_recognition, relation_identification]

// Same seed contract issue #742 locked in (design.md decision 4, maintainer
// ruling 2026-09-16): the versioned engine is `ckip-transformers` 0.3.4.
const TOKENIZER_ENGINE_WITH_VERSION = 'ckip-transformers';
const TOKENIZER_ENGINE_VERSION = '0.3.4';

async function gotoAnnotationResults(page: Page, taskId: string) {
  await page.goto(`${TASK_DETAIL_URL}?task_id=${taskId}&tab=annotation-results`);
  await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });
}

interface CapturedDownload {
  filename: string;
  content: string;
}

async function captureDownload(
  page: Page,
  trigger: () => Promise<void>,
  timeoutMs?: number
): Promise<CapturedDownload> {
  const downloadPromise = timeoutMs
    ? page.waitForEvent('download', { timeout: timeoutMs })
    : page.waitForEvent('download');
  await trigger();
  const download = await downloadPromise;
  const filename = download.suggestedFilename();
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const content = await fsp.readFile(downloadPath as string, 'utf8');
  return { filename, content };
}

type JsonExportManifest = {
  manifest?: {
    tagging_scheme?: string;
    token_unit?: string;
    tokenizer?: { engine?: string; version?: string };
    exported_at?: string;
  };
};

test.describe('issue #772 -- export-history redownload (task 1.1: AC-1.14 sequence_tagging)', () => {
  test('redownloading a sequence_tagging export-history row ignores the current page filters and dialog selections, keeps the original metadata, and adds no new row', async ({ page }) => {
    await gotoAnnotationResults(page, SEQ_TAGGING_TASK_ID);

    // 選定頁面篩選
    await page.locator('#arStageSelect').selectOption('official');

    // 開啟匯出對話框、選 BIOES 與 word 與具版本資訊的切詞引擎完成一次 JSON 匯出
    await page.locator('#arExportJsonBtn').click();
    await expect(page.locator('#arSeqExportModal')).toBeVisible();
    await page.locator('#arSeqExportSchemeSelect').selectOption('BIOES');
    await page.locator('#arSeqExportUnitSelect').selectOption('word');
    await expect(page.locator('#arSeqExportTokenizerField')).toBeVisible();
    await page.locator('#arSeqExportTokenizerSelect').selectOption(TOKENIZER_ENGINE_WITH_VERSION);

    const first = await captureDownload(page, async () => {
      await page.locator('#arSeqExportConfirmBtn').click();
    });
    // Guard against a vacuous pass: the baseline export this test redownloads
    // must itself have actually produced a non-empty file.
    expect(first.filename.length).toBeGreaterThan(0);
    expect(first.content.length).toBeGreaterThan(0);
    const firstPayload = JSON.parse(first.content) as JsonExportManifest;
    expect(firstPayload.manifest?.tagging_scheme).toBe('BIOES');
    expect(firstPayload.manifest?.token_unit).toBe('word');
    expect(firstPayload.manifest?.tokenizer).toEqual({
      engine: TOKENIZER_ENGINE_WITH_VERSION,
      version: TOKENIZER_ENGINE_VERSION
    });

    // Word-unit confirm does not auto-close the dialog (issue #742 design
    // decision); dismiss it explicitly before continuing.
    await expect(page.locator('#arSeqExportModal')).toBeVisible();
    await page.locator('#arSeqExportCancelBtn').click();
    await expect(page.locator('#arSeqExportModal')).toBeHidden();

    const historyRowsBefore = await page.locator('#arExportHistoryBody tr').count();

    // 改變頁面篩選的標記階段與標記員
    await page.locator('#arStageSelect').selectOption('dry');
    await page.locator('#arAnnotatorSelect').selectOption({ index: 1 });
    const changedStage = await page.locator('#arStageSelect').inputValue();
    const changedAnnotator = await page.locator('#arAnnotatorSelect').inputValue();

    // 開啟匯出對話框改選 IOB2 與 character 後取消
    await page.locator('#arExportJsonBtn').click();
    await expect(page.locator('#arSeqExportModal')).toBeVisible();
    await page.locator('#arSeqExportSchemeSelect').selectOption('IOB2');
    await page.locator('#arSeqExportUnitSelect').selectOption('character');
    await page.locator('#arSeqExportCancelBtn').click();
    await expect(page.locator('#arSeqExportModal')).toBeHidden();

    // 切換介面語言 (SC-046: 同一筆記錄要在頁面篩選、對話框選項「與」介面語言皆變動後
    // 重新下載, 三者缺一不可)
    const htmlLangBefore = await page.locator('html').getAttribute('lang');
    await page.locator('#langToggle').click();
    await expect(page.locator('html')).not.toHaveAttribute('lang', htmlLangBefore ?? '');

    // Finding 1: capture the expansion-summary container's rendering
    // right before the redownload click. The container lives inside
    // #arSeqExportModal (already asserted hidden above), so asserting the
    // container itself is `hidden` is vacuous -- it is a subset of an
    // already-true fact. Snapshot its class/markup here and assert both
    // are byte-identical afterwards: that is the only way to prove
    // redownloadArExportRecord() never called
    // renderArSeqExportExpansionSummary() to rebuild it.
    const expansionSummaryClassBefore = await page
      .locator('#arSeqExportExpansionSummary')
      .getAttribute('class');
    const expansionSummaryHtmlBefore = await page
      .locator('#arSeqExportExpansionSummary')
      .innerHTML();

    // 按下匯出記錄表第一列的下載按鈕
    const firstRow = page.locator('#arExportHistoryBody tr').first();
    const redownload = await captureDownload(
      page,
      async () => {
        await firstRow.locator('.ar-export-action-btn').click();
      },
      NO_DOWNLOAD_TIMEOUT
    );

    expect(redownload.filename).toBe(first.filename);
    expect(redownload.content).toBe(first.content);

    const redownloadPayload = JSON.parse(redownload.content) as JsonExportManifest;
    expect(redownloadPayload.manifest?.tagging_scheme).toBe('BIOES');
    expect(redownloadPayload.manifest?.token_unit).toBe('word');
    expect(redownloadPayload.manifest?.tokenizer).toEqual({
      engine: TOKENIZER_ENGINE_WITH_VERSION,
      version: TOKENIZER_ENGINE_VERSION
    });

    const historyRowsAfter = await page.locator('#arExportHistoryBody tr').count();
    expect(historyRowsAfter).toBe(historyRowsBefore);
    await expect(page.locator('#arSeqExportModal')).toBeHidden();
    expect(await page.locator('#arSeqExportExpansionSummary').getAttribute('class')).toBe(
      expansionSummaryClassBefore
    );
    expect(await page.locator('#arSeqExportExpansionSummary').innerHTML()).toBe(
      expansionSummaryHtmlBefore
    );
    await expect(page.locator('#arStageSelect')).toHaveValue(changedStage);
    await expect(page.locator('#arAnnotatorSelect')).toHaveValue(changedAnnotator);
  });
});

test.describe('issue #772 -- export-history redownload (task 1.2: AC-1.15 non-sequence_tagging)', () => {
  test('redownloading a non-sequence_tagging export-history row stays byte-identical after clearing filters and switching the interface language', async ({ page }) => {
    await gotoAnnotationResults(page, ENTITY_RECOGNITION_TASK_ID);

    // 套用審核員與審核狀態篩選
    await page.locator('#arReviewerSelect').selectOption({ index: 1 });
    await page.locator('#arReviewStatusSelect').selectOption({ index: 1 });

    const first = await captureDownload(page, async () => {
      await page.locator('#arExportJsonMinBtn').click();
    });
    // Guard against a vacuous pass.
    expect(first.filename.length).toBeGreaterThan(0);
    expect(first.content.length).toBeGreaterThan(0);
    expect(Array.isArray(JSON.parse(first.content))).toBe(true);

    const historyRowsBefore = await page.locator('#arExportHistoryBody tr').count();

    // 清除全部篩選
    await page.locator('#arStageSelect').selectOption('all');
    await page.locator('#arStatusSelect').selectOption('all');
    await page.locator('#arAnnotatorSelect').selectOption('all');
    await page.locator('#arReviewerSelect').selectOption('all');
    await page.locator('#arReviewStatusSelect').selectOption('all');

    // 切換介面語言
    const htmlLangBefore = await page.locator('html').getAttribute('lang');
    await page.locator('#langToggle').click();
    await expect(page.locator('html')).not.toHaveAttribute('lang', htmlLangBefore ?? '');

    const firstRow = page.locator('#arExportHistoryBody tr').first();
    const redownload = await captureDownload(
      page,
      async () => {
        await firstRow.locator('.ar-export-action-btn').click();
      },
      NO_DOWNLOAD_TIMEOUT
    );

    expect(redownload.filename).toBe(first.filename);
    expect(redownload.content).toBe(first.content);

    const historyRowsAfter = await page.locator('#arExportHistoryBody tr').count();
    expect(historyRowsAfter).toBe(historyRowsBefore);

    // 另以一個 JSON 格式案例斷言同一次匯出內 manifest 的匯出時間與檔名中的時間戳一致
    // (FR-021(3)). Reachable only once the redownload assertions above pass
    // (Green), since today's baseline throws at the `captureDownload` call.
    const jsonCase = await captureDownload(page, async () => {
      await page.locator('#arExportJsonBtn').click();
    });
    const jsonPayload = JSON.parse(jsonCase.content) as JsonExportManifest;
    const exportedAt = jsonPayload.manifest?.exported_at;
    expect(typeof exportedAt).toBe('string');
    const expectedStamp = (exportedAt as string).slice(0, 19).replace(/[:T]/g, '-');
    expect(jsonCase.filename).toContain(expectedStamp);
  });
});

test.describe('issue #772 -- export-history redownload (task 1.3: AC-1.16 cannot rebuild)', () => {
  test('an export-history row without a conditions snapshot has a disabled download button with a Chinese explanation and produces no download on click', async ({ page }) => {
    await gotoAnnotationResults(page, SEQ_TAGGING_TASK_ID);

    // TASK_DATA.exportHistory 的既有種子列皆無 conditionsSnapshot（design.md
    // 背景事實 5），任務載入後未執行任何匯出，第一列即為此測試對象。
    const firstRow = page.locator('#arExportHistoryBody tr').first();
    await expect(firstRow).toBeVisible();
    const dlBtn = firstRow.locator('.ar-export-action-btn');

    await expect(dlBtn).toBeDisabled();

    const title = await dlBtn.getAttribute('title');
    expect(title).toBeTruthy();
    expect(title as string).toMatch(/[一-鿿]/);

    const historyRowsBefore = await page.locator('#arExportHistoryBody tr').count();
    let downloadFired = false;
    page.once('download', () => {
      downloadFired = true;
    });
    await dlBtn.click({ force: true });
    await page.waitForTimeout(300);
    expect(downloadFired).toBe(false);
    const historyRowsAfter = await page.locator('#arExportHistoryBody tr').count();
    expect(historyRowsAfter).toBe(historyRowsBefore);
  });

  test('redownloading a word-unit sequence_tagging export is blocked with a Chinese reason naming the tokenizer engine when that engine is no longer available', async ({ page }) => {
    await gotoAnnotationResults(page, SEQ_TAGGING_TASK_ID);

    // T006 以 word 與具版本資訊的切詞引擎匯出一次
    await page.locator('#arExportJsonBtn').click();
    await expect(page.locator('#arSeqExportModal')).toBeVisible();
    await page.locator('#arSeqExportUnitSelect').selectOption('word');
    await expect(page.locator('#arSeqExportTokenizerField')).toBeVisible();
    await page.locator('#arSeqExportTokenizerSelect').selectOption(TOKENIZER_ENGINE_WITH_VERSION);
    const baseline = await captureDownload(page, async () => {
      await page.locator('#arSeqExportConfirmBtn').click();
    });
    // Guard against a vacuous pass.
    expect(baseline.filename.length).toBeGreaterThan(0);
    expect(baseline.content.length).toBeGreaterThan(0);

    await page.locator('#arSeqExportCancelBtn').click();
    await expect(page.locator('#arSeqExportModal')).toBeHidden();

    const historyRowsBefore = await page.locator('#arExportHistoryBody tr').count();

    // 於頁面內移除該引擎的種子資料，使阻擋成為資料驅動的結果
    await page.evaluate((engine) => {
      const seeds = window.LabelSuiteTaskDetailData?.SEQ_TAGGING_TOKENIZER_SEEDS;
      if (seeds) delete seeds[engine];
    }, TOKENIZER_ENGINE_WITH_VERSION);

    const firstRow = page.locator('#arExportHistoryBody tr').first();
    let downloadFired = false;
    page.once('download', () => {
      downloadFired = true;
    });
    await firstRow.locator('.ar-export-action-btn').click();
    await expect(page.locator('#toastMsg')).toContainText('切詞引擎');
    await expect(page.locator('#toastMsg')).toContainText(TOKENIZER_ENGINE_WITH_VERSION);

    await page.waitForTimeout(300);
    expect(downloadFired).toBe(false);
    const historyRowsAfter = await page.locator('#arExportHistoryBody tr').count();
    expect(historyRowsAfter).toBe(historyRowsBefore);
  });
});
