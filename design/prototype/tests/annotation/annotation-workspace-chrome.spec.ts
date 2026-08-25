import { test, expect } from '@playwright/test';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  skipGuidelineModal,
} from './_workspace-helpers';

/* Restored workspace chrome (spec 015 v2.3.0, pre-outputs[] design parity):
 * left-column per-sample status labels, middle-column top sample nav with
 * progress summary, question/annotation card separation, bottom autosave
 * status bar + save-draft button, and the right-column 說明與檔案 / 歷程
 * tabs. Uses T001 (single_label, 5 records) as the simplest legal fixture.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-013A, FR-013B, FR-013C, FR-013D, FR-013E, FR-016B, FR-020B
 */

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

async function gotoT001(page: import('@playwright/test').Page) {
  // Strip the gold_label output-role prefill so answering below is
  // unambiguously the annotator's own action (same rationale as
  // annotation-workspace-common.spec.ts).
  await patchDataFile(page, 'task-detail.data.js', `
    window.LabelSuiteTaskDetailData.profiles.T001.datasetRecords[0].gold_label = null;
  `);
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
  await dismissGuidelineModal(page);
}

test.describe('Left column: per-sample status labels', () => {
  test('samples show 待標記 → 已儲存 → 已提交 as the annotator works', async ({ page }) => {
    await gotoT001(page);

    const firstStatus = page.getByTestId('ws-sample-item').first().getByTestId('ws-sample-status');
    await expect(firstStatus).toHaveText('待標記');

    await page.getByTestId('ws-single-label-chip-positive').click();
    await page.getByTestId('ws-save-btn').click();
    await expect(firstStatus).toHaveText('已儲存');

    await page.getByTestId('ws-submit-btn').click();
    await expect(firstStatus).toHaveText('已提交');
    // The other samples remain pending.
    await expect(
      page.getByTestId('ws-sample-item').nth(1).getByTestId('ws-sample-status')
    ).toHaveText('待標記');
  });
});

test.describe('Middle column: top sample nav + progress summary', () => {
  test('prev/next navigate between samples and disable at the edges', async ({ page }) => {
    await gotoT001(page);

    await expect(page.getByTestId('ws-prev-btn')).toBeDisabled();
    await page.getByTestId('ws-next-btn').click();
    await expect(page.getByTestId('ws-input-content')).toContainText('候診時間太長了');
    await page.getByTestId('ws-prev-btn').click();
    await expect(page.getByTestId('ws-input-content')).toContainText('這次手術非常成功');
  });

  test('progress summary counts submitted samples', async ({ page }) => {
    await gotoT001(page);

    await expect(page.getByTestId('ws-progress-text')).toHaveText('0 / 5 已提交');
    await page.getByTestId('ws-single-label-chip-positive').click();
    await page.getByTestId('ws-submit-btn').click();
    await expect(page.getByTestId('ws-progress-text')).toHaveText('1 / 5 已提交');
  });

  test('the question block and the annotation block render as separate cards', async ({ page }) => {
    await gotoT001(page);

    const questionCard = page.getByTestId('ws-question-card');
    const annotationCard = page.getByTestId('ws-annotation-card');
    await expect(questionCard).toBeVisible();
    await expect(annotationCard).toBeVisible();
    await expect(questionCard.getByTestId('ws-input-content')).toBeVisible();
    await expect(annotationCard.getByTestId('ws-output-panel-single_label')).toBeVisible();
  });

  test('the question card draws no inner frame around the input text', async ({ page }) => {
    await gotoT001(page);

    const sample = page.getByTestId('ws-question-card').locator('.annotation-preview-sample');
    await expect(sample).toBeVisible();
    expect(await sample.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('0px');
  });

  test('the annotation card keeps no leftover divider or dashed separator lines', async ({ page }) => {
    await gotoT001(page);

    const card = page.getByTestId('ws-annotation-card');
    for (const divider of await card.locator('.annotation-preview-divider').all()) {
      await expect(divider).toBeHidden();
    }
    const bypassRow = card.locator('div[style*="dashed"]').first();
    await expect(bypassRow).toBeVisible();
    expect(await bypassRow.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe('none');
  });

  test('the integrated ER+RI preview draws no outer frame inside the annotation card', async ({ page }) => {
    // T010 is the integrated entity+relation fixture; the engine wraps it in
    // .preview-unified, whose own border doubles the annotation card's frame.
    await page.goto(buildWorkspaceUrl({ task_id: 'T010', sample_id: 'med-001' }));
    await dismissGuidelineModal(page);

    const unified = page.getByTestId('ws-annotation-card').locator('.preview-unified');
    await expect(unified).toBeVisible();
    expect(await unified.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('0px');
  });
});

test.describe('Bottom action bar: autosave status + save draft', () => {
  test('shows the autosave status and a 儲存草稿 button', async ({ page }) => {
    await gotoT001(page);

    await expect(page.getByTestId('ws-autosave-status')).toContainText('草稿已自動儲存');
    await expect(page.getByTestId('ws-save-btn')).toContainText('儲存草稿');
  });

  test('switching samples flashes the saving state before settling back to saved', async ({ page }) => {
    await gotoT001(page);

    await page.getByTestId('ws-next-btn').click();
    // The transient 儲存中… state settles back to 草稿已自動儲存.
    await expect(page.getByTestId('ws-autosave-status')).toContainText('草稿已自動儲存');
  });
});

test.describe('Right column: 說明與檔案 / 歷程 tabs', () => {
  test('guideline tab is active by default and the history tab switches panels', async ({ page }) => {
    await gotoT001(page);

    await expect(page.getByTestId('ws-guideline-tab-guideline')).toHaveClass(/active/);
    await expect(page.getByTestId('ws-history-panel')).toBeHidden();

    await page.getByTestId('ws-guideline-tab-history').click();
    await expect(page.getByTestId('ws-history-panel')).toBeVisible();
    await expect(page.getByTestId('ws-history-panel')).toContainText('此筆樣本尚無歷程紀錄');

    await page.getByTestId('ws-guideline-tab-guideline').click();
    await expect(page.getByTestId('ws-history-panel')).toBeHidden();
  });

  test('submitting a sample appends a traceable history entry', async ({ page }) => {
    await gotoT001(page);

    await page.getByTestId('ws-single-label-chip-positive').click();
    await page.getByTestId('ws-submit-btn').click();

    await page.getByTestId('ws-guideline-tab-history').click();
    const panel = page.getByTestId('ws-history-panel');
    await expect(panel).toContainText('標記員');
    await expect(panel).toContainText('submitted');
    await expect(panel).toContainText('single_label');
  });

  test('guideline summary title carries the info icon and file rows show typed icons with action hints', async ({ page }) => {
    await gotoT001(page);

    await expect(page.locator('.guideline-summary-title svg')).toBeVisible();

    // issue #185 removed the dead-link PDF entry; issue #353 reinstated a
    // PDF backed by a real asset, so all three typed rows render again.
    const items = page.getByTestId('ws-guideline-file-item');
    await expect(items).toHaveCount(3);

    const imgRow = items.filter({ hasText: '通用範例圖.svg' });
    await expect(imgRow.locator('.guideline-file-icon.img svg')).toBeVisible();
    await expect(imgRow.locator('.guideline-file-action')).toHaveText('預覽');

    const mdRow = items.filter({ hasText: '常見問題.md' });
    await expect(mdRow.locator('.guideline-file-icon.md svg')).toBeVisible();
    await expect(mdRow.locator('.guideline-file-action')).toHaveText('預覽');

    // spec 015 v4.21.0 (issue #353): the PDF row's action hint is 預覽 too,
    // no longer 新分頁.
    const pdfRow = items.filter({ hasText: '標記指引範例.pdf' });
    await expect(pdfRow.locator('.guideline-file-icon.pdf svg')).toBeVisible();
    await expect(pdfRow.locator('.guideline-file-action')).toHaveText('預覽');
  });

  test('reviewer view renders the same two tabs', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-guideline-tab-guideline')).toBeVisible();
    await expect(page.getByTestId('ws-guideline-tab-history')).toBeVisible();
  });
});

/* Issue #185: DEFAULT_GUIDELINE_FILES (task-detail.data.js) previously
 * attached the same VA_emj.png (a valence/arousal emotion-scale image) plus
 * a PDF pointing at a directory that doesn't exist (assets/guidelines/) to
 * all 17 illustrative task profiles, regardless of task category. Non-VA
 * annotators (NER, summarization, QA, ...) saw an unrelated emotion scale,
 * and the "force reading" guideline flow linked to a 404. */
test.describe('Issue #185: guideline attachment content', () => {
  test('every guideline file referenced by any task profile resolves with 200 (no dead links)', async ({ page }) => {
    await gotoT001(page);

    const urls: string[] = await page.evaluate(() => {
      const profiles = (window as unknown as {
        LabelSuiteTaskDetailData: { profiles: Record<string, { guidelineFiles?: { url?: string }[] }> };
      }).LabelSuiteTaskDetailData.profiles;
      const found = new Set<string>();
      Object.keys(profiles).forEach((taskId) => {
        (profiles[taskId].guidelineFiles || []).forEach((file) => {
          if (file.url) found.add(new URL(file.url, window.location.href).href);
        });
      });
      return Array.from(found);
    });

    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      const response = await page.request.get(url);
      expect(response.ok(), `guideline file should resolve with 200: ${url}`).toBeTruthy();
    }
  });

  test('a non-VA task (T004, readability regression) shows its example image labeled as a generic placeholder, not an unlabeled VA scale', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T004', sample_id: 'read-001' }));
    await dismissGuidelineModal(page);

    const items = page.getByTestId('ws-guideline-file-item');
    const imgRow = items.filter({ hasText: '通用範例圖.svg' });
    await expect(imgRow).toBeVisible();

    // The old shared asset, VA_emj.png, must not appear on a non-VA task.
    await expect(items.filter({ hasText: 'VA_emj.png' })).toHaveCount(0);
  });
});
