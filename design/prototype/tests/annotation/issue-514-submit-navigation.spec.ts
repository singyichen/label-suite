import { test, expect, type Page } from '@playwright/test';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  skipGuidelineModal,
} from './_workspace-helpers';

/* issue #514 — the annotator half of "where do I go after I submit?".
 *
 * spec 015 has promised this since v2.0.0 and it was never implemented:
 *   - 規格常數 `SUBMIT_DEFAULT_ACTION = go-to-next-sample` (spec.md:46)
 *   - 規格常數 `SUBMIT_ALL_DONE_ACTION = redirect-to-annotation-list` (:47)
 *   - AC-2.4 (:225) 提交 → 預設導向下一筆
 *   - AC-2.5 (:226) 最後一筆提交 → 導回 annotation-list，清單顯示 `已提交`
 *   - FR-022A (:862) / FR-022C (:863)
 * `handleSubmit()` only showed a toast and redrew the left column, so the
 * annotator was left staring at the sample they had just finished with no
 * signal that it was done and no cue about what to do next.
 *
 * The reviewer side (issue #456 PR-E, withdrawn again by issue #517) is NOT
 * in scope here: `handleSubmit` is bound only when role !== reviewer
 * (annotation-workspace.config.js boot()), and a reviewer's exits are
 * FR-080/FR-081's breadcrumb.
 *
 * Two design rules the assertions below pin deliberately:
 *   1. "next sample" is NOT `units[i+1]` — an already-submitted neighbour
 *      would drop the annotator on a finished sample, so the scan skips
 *      submitted units and wraps around.
 *   2. the all-done return reuses `buildListReturnUrl()`, so the list's
 *      UXC-11 view state (status/q/limit/offset) rides back out — the same
 *      single writer FR-081's breadcrumb goes through.
 *
 * T001 (single_label, 5 records) is the fixture: every record carries a
 * `gold_label` output-role prefill, which counts as answered per FR-024M,
 * so a submit needs no extra interaction unless a test strips it.
 */

const SAMPLE_IDS = ['sent-001', 'sent-002', 'sent-003', 'sent-004', 'sent-005'];

function activeSampleId(page: Page) {
  return page.locator('[data-testid="ws-sample-item"].active').getAttribute('data-sample-id');
}

async function gotoSample(page: Page, sampleId: string, query = '') {
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: sampleId }) + query);
  await dismissGuidelineModal(page);
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('Annotator submit navigation (issue #514, FR-022A / AC-2.4)', () => {
  test('submitting loads the next pending sample instead of staying put', async ({ page }) => {
    await gotoSample(page, 'sent-001');
    await expect(page.getByTestId('ws-input-content')).toContainText('這次手術非常成功');

    await page.getByTestId('ws-submit-btn').click();

    await expect(page.locator('#toastMsg')).toHaveText('已提交');
    await expect.poll(() => activeSampleId(page)).toBe('sent-002');
    await expect(page.getByTestId('ws-input-content')).toContainText('候診時間太長了');
    // syncUrlToUnit() must follow the move, or a reload would bounce back.
    await expect(page).toHaveURL(/sample_id=sent-002/);
    // The sample just left behind stays submitted in the left column.
    await expect(page.getByTestId('ws-sample-item').first()).toHaveAttribute('data-submitted', 'true');
  });

  test('the next sample skips one that is already submitted (not simply the next row)', async ({ page }) => {
    // Submit sent-002 first, so the row immediately after sent-001 is done.
    await gotoSample(page, 'sent-002');
    await page.getByTestId('ws-submit-btn').click();
    await expect.poll(() => activeSampleId(page)).toBe('sent-003');

    await gotoSample(page, 'sent-001');
    await page.getByTestId('ws-submit-btn').click();

    await expect.poll(() => activeSampleId(page)).toBe('sent-003');
    await expect(page.getByTestId('ws-input-content')).toContainText('醫院的環境還算乾淨');
  });

  test('submitting the last row wraps around to the first still-pending sample', async ({ page }) => {
    await gotoSample(page, 'sent-005');
    await page.getByTestId('ws-submit-btn').click();

    await expect.poll(() => activeSampleId(page)).toBe('sent-001');
    await expect(page.getByTestId('ws-input-content')).toContainText('這次手術非常成功');
  });

  test('a blocked submit navigates nowhere (reverse guard)', async ({ page }) => {
    // Strip the prefill so the sample is genuinely unanswered and submit is
    // rejected by the existing AC-2A.10 validation.
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T001.datasetRecords[0].gold_label = null;
    `);
    await gotoSample(page, 'sent-001');

    await page.getByTestId('ws-submit-btn').click();

    await expect(page.getByTestId('ws-output-panel-single_label')).toHaveAttribute('data-error', 'true');
    await expect.poll(() => activeSampleId(page)).toBe('sent-001');
    await expect(page).toHaveURL(/annotation-workspace\.html/);
  });
});

test.describe('Annotator all-done return (issue #514, FR-022C / AC-2.5)', () => {
  test('submitting every sample returns to annotation-list with all rows 已提交', async ({ page }) => {
    await gotoSample(page, 'sent-001');

    // Chained auto-advance carries the annotator through the whole task; the
    // fifth submit is the one that has nowhere left to advance to.
    for (let i = 0; i < SAMPLE_IDS.length; i += 1) {
      await expect.poll(() => activeSampleId(page)).toBe(SAMPLE_IDS[i]);
      await page.getByTestId('ws-submit-btn').click();
    }

    await expect(page).toHaveURL(/annotation-list\.html\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get('task_id')).toBe('T001');
    expect(url.searchParams.get('role')).toBe('annotator');
    expect(url.searchParams.get('run_type')).toBe('official_run');

    const rows = page.getByTestId('ws-sample-item');
    await expect(rows).toHaveCount(SAMPLE_IDS.length);
    for (let i = 0; i < SAMPLE_IDS.length; i += 1) {
      await expect(rows.nth(i).locator('.status-badge')).toHaveText('已提交');
    }
  });

  test('the return carries the list view state back out (buildListReturnUrl, FR-081)', async ({ page }) => {
    // One record: the very first submit is also the last one.
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T001.datasetRecords =
        window.LabelSuiteTaskDetailData.profiles.T001.datasetRecords.slice(0, 1);
    `);
    await gotoSample(page, 'sent-001', '&status=pending&q=%E6%89%8B%E8%A1%93&limit=10&offset=0');

    await page.getByTestId('ws-submit-btn').click();

    await expect(page).toHaveURL(/annotation-list\.html\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get('status')).toBe('pending');
    expect(url.searchParams.get('q')).toBe('手術');
    expect(url.searchParams.get('limit')).toBe('10');
    expect(url.searchParams.get('offset')).toBe('0');
  });
});
