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
 * tabs. Uses T001 (single_label, 5 records) as the simplest legal fixture. */

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

  test('reviewer view renders the same two tabs', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-guideline-tab-guideline')).toBeVisible();
    await expect(page.getByTestId('ws-guideline-tab-history')).toBeVisible();
  });
});
