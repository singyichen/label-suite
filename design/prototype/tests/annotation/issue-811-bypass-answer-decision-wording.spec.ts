import { test, expect, type Page } from '@playwright/test';
import {
  buildListUrl,
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  skipGuidelineModal,
} from './_workspace-helpers';

/* issue #811 (RED): 「無法判定」同時承載兩個互不相干的概念 -- 標記員的答案值
 * (OutputAnswer.bypass) 與審核員的決策值 (REVIEW_DECISIONS 之 bypass)。
 * 維護者 2026-09-19 裁定兩套目標語彙（proposal.md `## Why`、design.md 維護者
 * 裁定 R1-R4）：
 *
 *   - 決策值一律 `無法裁決`／`Cannot adjudicate`：決策按鈕、歷程事件
 *     `bypassed`、`shared/sidebar.js` 快捷鍵 `B` 說明、仲裁 B 選項、
 *     task-detail 仲裁歷程。
 *   - 答案值一律 `無法判定 (Bypass)`／`Unable to determine (Bypass)`：
 *     審核卡標記員原答案顯示、清單 pill。
 *
 * 兩套語彙各只有一個 i18n 來源（design.md D1，`shared/sidebar.js` 匯出
 * `window.LabelSuiteSharedSidebar`），Green（tasks.md 1.3-1.7）尚未建立這個
 * 來源，所有消費端目前仍渲染舊字串 -- 本檔案先把裁定後的目標字串釘死在測試
 * 裡，用「畫面文案等於決策值/答案值來源」取代逐頁各自手寫比對，避免下一次
 * 漂移重演 proposal.md `## Why` 列出的三處語彙漂移。
 *
 * 型別宣告刻意不用 `declare global`：issue-596-arbitration.spec.ts 已示範
 * 這裡的正確作法（該檔案註解引用 annotation-workspace-arbitration.spec.ts
 * 已宣告過同一個 window 屬性、第二份宣告會撞 TS2717），改為每次
 * `page.evaluate()` 呼叫各自用 local cast。
 */

type MarkSampleSubmitted = (
  taskId: string,
  role: string,
  runType: string,
  sampleId: string,
  payload: unknown,
  historySummary: string,
  identity: { annotatorId?: string; reviewerId?: string }
) => void;
type WorkspaceData = { markSampleSubmitted: MarkSampleSubmitted };

async function setLangEn(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('labelsuite.lang', 'en');
  });
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #811: 決策值一律等於共用側欄匯出之決策值來源（無法裁決 / Cannot adjudicate）', () => {
  /* 1. 審核卡決策按鈕 (reviewBypassLabel) -- 精確比對可存取名稱，同
   * issue-399-review-decision-a11y.spec.ts 的既有作法。 */
  test('zh: the bypass decision button reads 無法裁決', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({
      task_id: 'T015', sample_id: 'ofs-04-pending-review', role: 'reviewer', run_type: 'official_run',
    }));
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-review-row-bypass')).toBeVisible();
    await expect(page.getByRole('button', { name: '無法裁決', exact: true })).toHaveCount(1);
  });

  test('en: the bypass decision button reads Cannot adjudicate', async ({ page }) => {
    await setLangEn(page);
    await page.goto(buildWorkspaceUrl({
      task_id: 'T015', sample_id: 'ofs-04-pending-review', role: 'reviewer', run_type: 'official_run',
    }));
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-review-row-bypass')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cannot adjudicate', exact: true })).toHaveCount(1);
  });

  /* 2. 仲裁版面 B 選項 -- 維護者裁定 R4：`B・審核員：無法裁決`，不含
   * `Bypass` 字樣。設定沿用 issue-810-arbitration-b-decision-source.spec.ts
   * 已證實可用的 seedDisputedUnit／gotoAsArbiter 模式（該檔案本身也不用
   * `declare global`，是這裡 local cast 慣例的直接前例）。 */
  const ARB_TASK = 'T001';
  const ARB_SAMPLE = 'sent-001';
  const ARB_ANNOTATOR = 'kioleemg12';
  const ARB_PARTICIPANT = 'reviewer_wang'; // 爭議當事審核員；不得自行仲裁
  const ARB_ARBITER = 'reviewer_chen'; // demo roster：可仲裁、非當事人

  function seedArb(
    page: Page,
    args: { role: string; payload: unknown; identity: { annotatorId?: string; reviewerId?: string } }
  ): Promise<void> {
    return page.evaluate((a) => {
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
          'T001', a.role, 'official_run', 'sent-001', a.payload, '', a.identity
        );
    }, args);
  }

  async function seedBypassDispute(page: Page): Promise<void> {
    await page.goto(buildWorkspaceUrl({ task_id: ARB_TASK, sample_id: ARB_SAMPLE, role: 'annotator' }));
    await seedArb(page, {
      role: 'annotator',
      payload: { previewState: { single_label: { selected: 'sad' } } },
      identity: { annotatorId: ARB_ANNOTATOR },
    });
    await seedArb(page, {
      role: 'reviewer',
      payload: { previewState: { single_label: { selected: 'fear' } }, decisions: { single_label: 'bypass' } },
      identity: { annotatorId: ARB_ANNOTATOR, reviewerId: ARB_PARTICIPANT },
    });
  }

  function gotoAsArbiter(page: Page) {
    return page.goto(buildWorkspaceUrl({
      task_id: ARB_TASK, sample_id: ARB_SAMPLE, role: 'reviewer', run_type: 'official_run',
      annotator_id: ARB_ANNOTATOR, reviewer_id: ARB_ARBITER,
    }));
  }

  function bChoice(page: Page) {
    return page.getByTestId('ws-arbitration-item').first().getByTestId('ws-arbitration-choose-b');
  }

  test('zh: arbitration B bypass option reads B・審核員：無法裁決, with no literal Bypass word', async ({ page }) => {
    await seedBypassDispute(page);
    await gotoAsArbiter(page);

    await expect(bChoice(page)).toHaveText('B・審核員：無法裁決');
    await expect(bChoice(page)).not.toContainText('Bypass');
  });

  test('en: arbitration B bypass option reads B · Reviewer：Cannot adjudicate, with no literal Bypass word', async ({ page }) => {
    await setLangEn(page);
    await seedBypassDispute(page);
    await gotoAsArbiter(page);

    // design.md Risks: the modify branch's existing compose rule keeps a
    // full-width colon even in English (`B · Reviewer：{value}`); the bypass
    // branch adopts the same rule, not a half-width one.
    await expect(bChoice(page)).toHaveText('B · Reviewer：Cannot adjudicate');
    await expect(bChoice(page)).not.toContainText('Bypass');
  });

  /* 3. 歷程頁籤 bypassed 徽章 -- design.md D2：此表現況僅中文，本單不擴充
   * 英文，因此只釘住 zh。設定沿用 issue-596-history-chain.spec.ts 的
   * seedBucket 模式，縮減為單一事件。 */
  test('zh: the history tab bypassed badge reads 無法裁決', async ({ page }) => {
    const bucketKey = `labelsuite.wsSubmissions.${ARB_TASK}::annotator::official_run::${ARB_ANNOTATOR}::-`;
    await page.addInitScript(
      ([key, sample, actorId]) => {
        window.localStorage.setItem(
          key as string,
          JSON.stringify({
            [sample as string]: {
              status: 'submitted',
              submittedAt: '2026-01-01T00:00:00.000Z',
              answers: {},
              history: [
                {
                  action: 'bypassed',
                  role: 'reviewer',
                  actorId: actorId as string,
                  at: '2026-01-01T00:01:00.000Z',
                  summary: '審核 bypass',
                },
              ],
            },
          })
        );
      },
      [bucketKey, ARB_SAMPLE, ARB_PARTICIPANT] as const
    );

    await page.goto(buildWorkspaceUrl({
      task_id: ARB_TASK, sample_id: ARB_SAMPLE, role: 'reviewer', run_type: 'official_run',
      annotator_id: ARB_ANNOTATOR, reviewer_id: ARB_PARTICIPANT,
    }));
    await dismissGuidelineModal(page);
    await page.getByTestId('ws-guideline-tab-history').click();

    await expect(page.locator('.history-action-badge[data-action="bypassed"]')).toHaveText('無法裁決');
  });

  /* 4. 共用側欄快捷鍵總覽 B 列 -- design.md D1：`reviewBypass`（動態字典值）
   * 與 :600 靜態 fallback 改讀決策值來源；tasks.md 1.1 明文「皆等於……且為
   * `無法裁決`／`Cannot adjudicate`」，與決策按鈕、歷程徽章同一組精確比對，
   * 不是在原本的完整句子裡代換單字。開modal 的操作沿用
   * tests/shared/sidebar-shortcuts.spec.ts 既有作法。 */
  test('zh: the shared sidebar shortcut overview B row reads 無法裁決', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/pages/dashboard/dashboard.html');

    await page.getByTestId('shortcut-help-button').click();
    await expect(page.locator('#shortcutReviewBypass')).toHaveText('無法裁決');
  });

  test('en: the shared sidebar shortcut overview B row reads Cannot adjudicate', async ({ page }) => {
    await setLangEn(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/pages/dashboard/dashboard.html');

    await page.getByTestId('shortcut-help-button').click();
    await expect(page.locator('#shortcutReviewBypass')).toHaveText('Cannot adjudicate');
  });

  /* 5. task-detail 仲裁歷程之 bypass 文案 (arHistoryBypass) -- 唯一可達的
   * demo seed 是 T016 的 ofm-04-reviewer-bypass（單一審核員 bypass 決策，
   * T001-T013 的分類 demo 資料集從未使用 bypass 決策）。展開列的方式沿用
   * tests/task-management/issue-393-annotation-results-t014-t017.spec.ts
   * 已證實可用的 filter + .ar-expand-btn 點擊模式。 */
  const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
  const PANEL_LOAD_TIMEOUT = 15000;

  test('zh: task-detail arbitration history bypass decision reads 無法裁決', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T016&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    const row = page.locator('#arResultTableBody tr.ar-summary-row').filter({ hasText: 'ofm-04-reviewer-bypass' });
    await row.locator('.ar-expand-btn').click();

    await expect(page.locator('.annotator-detail-row .ar-history-decision')).toHaveText('無法裁決');
  });

  test('en: task-detail arbitration history bypass decision reads Cannot adjudicate', async ({ page }) => {
    await setLangEn(page);
    await page.goto(`${TASK_DETAIL_URL}?task_id=T016&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    const row = page.locator('#arResultTableBody tr.ar-summary-row').filter({ hasText: 'ofm-04-reviewer-bypass' });
    await row.locator('.ar-expand-btn').click();

    await expect(page.locator('.annotator-detail-row .ar-history-decision')).toHaveText('Cannot adjudicate');
  });
});

test.describe('issue #811: 答案值一律等於共用側欄匯出之答案值來源（無法判定 (Bypass) / Unable to determine (Bypass)），精確比對不用 contains', () => {
  /* 6. 審核卡上標記員原答案之 bypass 顯示 (reviewOriginalAnswerBypass) --
   * design.md D2：現為 `無法判定`／`Cannot determine`，改讀答案值來源後會變
   * 成含 `(Bypass)` 的完整答案值。UI 驅動的 bypass 提交沿用
   * issue-809-previewbypass-original-answer.spec.ts 已證實可用的流程，但把
   * 該檔案的 `toContainText` 改為精確 `toHaveText`（design.md Risks：
   * issue #809 的兩處 contains 比對語意過弱，本檔案自己的版本直接精確）。 */
  test("zh: the reviewer sees the annotator bypass answer as 標記員原答案：無法判定 (Bypass), exactly", async ({ page }) => {
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T001.outputs[0].config.allow_bypass = true;
    `);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator' }));
    await dismissGuidelineModal(page);
    await page.getByTestId('ws-bypass-single_label').check();
    await page.getByTestId('ws-submit-btn').click();

    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-review-original-answer')).toHaveText('標記員原答案：無法判定 (Bypass)');
  });

  test("en: the reviewer sees the annotator bypass answer as \"Annotator's original answer: Unable to determine (Bypass)\", exactly", async ({ page }) => {
    await setLangEn(page);
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T001.outputs[0].config.allow_bypass = true;
    `);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator' }));
    await dismissGuidelineModal(page);
    await page.getByTestId('ws-bypass-single_label').check();
    await page.getByTestId('ws-submit-btn').click();

    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-review-original-answer')).toHaveText(
      "Annotator's original answer: Unable to determine (Bypass)"
    );
  });

  /* 7. 清單 pill (reviewBypassPill) -- design.md D2：英文由
   * `Bypassed (cannot determine)` 改為 `Unable to determine (Bypass)`；中文
   * 字面值本就等於答案值來源，不變。annotation-list.html 的
   * buildAnswerCell() 只讀 item.mockRow.bypass/.answers（來自
   * annotation-workspace.data.js 的 REVIEWER_MOCK_ROWS，經
   * getReviewerMockRows() 逐次讀 window.LabelSuiteAnnotationWorkspaceData
   * 的即時參照），完全不讀標記員的即時 localStorage 提交（annotation-
   * list.html:1366-1367、annotation-workspace.data.js:1606-1611 的 getter
   * 註解明講支援 override）；因此用 patchDataFile 直接覆寫該筆 mock row 的
   * bypass 旗標，而不是走 UI 驅動的提交流程（那條路徑清單頁面根本讀不到）。 */
  test('zh: the list pill for a bypassed answer reads 無法判定 (Bypass), exactly', async ({ page }) => {
    await patchDataFile(page, 'annotation-workspace.data.js', `
      window.LabelSuiteAnnotationWorkspaceData.REVIEWER_MOCK_ROWS.T001['sent-001'][0].bypass = { single_label: true };
    `);

    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'dry_run' }));
    const rows = page.getByTestId('ws-sample-item');
    await expect(rows.nth(0)).toContainText('sent-001');
    await expect(rows.nth(0).getByTestId('list-review-annotator')).toHaveText('kioleemg12');
    await expect(rows.nth(0).getByTestId('list-review-answer')).toHaveText('無法判定 (Bypass)');
  });

  test('en: the list pill for a bypassed answer reads Unable to determine (Bypass), exactly', async ({ page }) => {
    await setLangEn(page);
    await patchDataFile(page, 'annotation-workspace.data.js', `
      window.LabelSuiteAnnotationWorkspaceData.REVIEWER_MOCK_ROWS.T001['sent-001'][0].bypass = { single_label: true };
    `);

    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'dry_run' }));
    const rows = page.getByTestId('ws-sample-item');
    await expect(rows.nth(0)).toContainText('sent-001');
    await expect(rows.nth(0).getByTestId('list-review-annotator')).toHaveText('kioleemg12');
    await expect(rows.nth(0).getByTestId('list-review-answer')).toHaveText('Unable to determine (Bypass)');
  });
});

test.describe('issue #811: 缺理由 toast 文案 (FR-083 / design.md D5, 鍵名 toastReasonRequired 不變)', () => {
  /* T001 只有一個輸出類型 (single_label)，{list} 代入後即單一項目名稱。
   * 選 modify 後不填理由再送出 -> reviewRowBlocker() 回傳 'reason' ->
   * toastKey = toastReasonRequired。裁定後 zh 文案補回「審核」二字：
   * `請填寫以下輸出類型的審核理由：{list}`（現況缺這兩個字）。本任務書
   * (tasks.md 1.1) 只要求釘住 zh，en 由 Wave 2 之外的既有鍵本身處理，不在
   * 本檔案斷言範圍內。 */
  test('zh: the missing-reason toast reads 請填寫以下輸出類型的審核理由：single_label', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({
      task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'official_run',
    }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-review-row-modify').click();
    await page.getByTestId('ws-review-submit-btn').click();

    await expect(page.locator('#toastMsg')).toHaveText('請填寫以下輸出類型的審核理由：single_label');
  });
});
