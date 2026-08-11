import { test, expect, type Page } from '@playwright/test';
import {
  assertNoPageErrors,
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  skipGuidelineModal,
  trackPageErrors,
} from './_workspace-helpers';

/* Reviewer mode rewrite: the per-outKey approve/reject decision model
 * (ws-review-decision-approve/reject) is replaced by a legacy-parity
 * AGGREGATE review card. Per output type, one `ws-review-row` now shows:
 *   1. header (existing)
 *   2. `ws-review-stats` -- chip 標記分布統計 + computed summary
 *   3. `ws-review-note` + bulk `ws-review-bulk-approve`/`ws-review-bulk-reject`
 *   4. `ws-review-annotator-list` -- one `ws-review-annotator-row` per
 *      annotator (data-annotator attr), each with its own
 *      `ws-review-row-approve`/`ws-review-row-reject` toggle
 *   5. the existing FR-024L direct-correction control (unchanged)
 *
 * Mock data: 3 annotators per sample, fixed order kioleemg12 / 113450022 /
 * tony0950127, via getReviewerMockRows(taskId, sampleId). If the live
 * annotator bucket already holds a submitted answer for the sample, a 4th
 * row named 目前標記員 (data-annotator="current") is PREPENDED.
 *
 * This spec is written AHEAD of the implementation (TDD red): the testids
 * and behavior below (ws-review-stats, ws-review-note, bulk buttons,
 * ws-review-annotator-row, submit-blocked validation, reject-reopens-sample)
 * do not exist yet in pages/annotation/annotation-workspace.config.js.
 */

const ANNOTATOR_ORDER = ['kioleemg12', '113450022', 'tony0950127'] as const;

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

async function gotoT001Reviewer(page: Page) {
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer' }));
  await dismissGuidelineModal(page);
}

test.describe('T001 deep example (single_label) — aggregate review card', () => {
  test('stats box shows the pinned label distribution and the note text', async ({ page }) => {
    await gotoT001Reviewer(page);

    const row = page.getByTestId('ws-review-row').first();
    await expect(row.getByTestId('ws-review-stats')).toHaveText('positive×2 · negative×1');
    await expect(row.getByTestId('ws-review-note')).toContainText('通過：此筆標記有效');
    await expect(row.getByTestId('ws-review-note')).toContainText('退回：該標記狀態會回到未標記，標記員需要重新標記');
  });

  test('bulk buttons render with the zh labels and 3 annotator rows appear in pinned order', async ({ page }) => {
    await gotoT001Reviewer(page);

    const row = page.getByTestId('ws-review-row').first();
    await expect(row.getByTestId('ws-review-bulk-approve')).toContainText('全部通過');
    await expect(row.getByTestId('ws-review-bulk-reject')).toContainText('全部退回');

    const annotatorRows = row.getByTestId('ws-review-annotator-row');
    await expect(annotatorRows).toHaveCount(3);
    for (let i = 0; i < ANNOTATOR_ORDER.length; i++) {
      const annotatorRow = annotatorRows.nth(i);
      await expect(annotatorRow).toHaveAttribute('data-annotator', ANNOTATOR_ORDER[i]);
      await expect(annotatorRow.getByTestId('ws-review-annotator-name')).toHaveText(ANNOTATOR_ORDER[i]);
    }
    // Pinned answers: kioleemg12=positive, 113450022=negative, tony0950127=positive.
    await expect(annotatorRows.nth(0).getByTestId('ws-review-annotator-answer')).toContainText('positive');
    await expect(annotatorRows.nth(1).getByTestId('ws-review-annotator-answer')).toContainText('negative');
    await expect(annotatorRows.nth(2).getByTestId('ws-review-annotator-answer')).toContainText('positive');
  });

  test('per-row approve/reject toggles and clears on re-click', async ({ page }) => {
    await gotoT001Reviewer(page);

    const row = page.getByTestId('ws-review-row').first();
    const firstAnnotator = row.locator('[data-testid="ws-review-annotator-row"][data-annotator="kioleemg12"]');
    const approveBtn = firstAnnotator.getByTestId('ws-review-row-approve');
    const rejectBtn = firstAnnotator.getByTestId('ws-review-row-reject');

    await expect(approveBtn).toHaveAttribute('aria-pressed', 'false');
    await approveBtn.click();
    await expect(approveBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(rejectBtn).toHaveAttribute('aria-pressed', 'false');

    await approveBtn.click();
    await expect(approveBtn).toHaveAttribute('aria-pressed', 'false');
  });

  test('bulk-approve sets all 3 rows approved and toggles the bulk button active; clicking again clears all', async ({
    page,
  }) => {
    await gotoT001Reviewer(page);

    const row = page.getByTestId('ws-review-row').first();
    const bulkApprove = row.getByTestId('ws-review-bulk-approve');
    const annotatorRows = row.getByTestId('ws-review-annotator-row');

    await bulkApprove.click();
    await expect(bulkApprove).toHaveAttribute('aria-pressed', 'true');
    for (let i = 0; i < 3; i++) {
      await expect(annotatorRows.nth(i).getByTestId('ws-review-row-approve')).toHaveAttribute('aria-pressed', 'true');
    }

    await bulkApprove.click();
    await expect(bulkApprove).toHaveAttribute('aria-pressed', 'false');
    for (let i = 0; i < 3; i++) {
      await expect(annotatorRows.nth(i).getByTestId('ws-review-row-approve')).toHaveAttribute('aria-pressed', 'false');
    }
  });

  test('submit is blocked with an error toast when any annotator row is undecided', async ({ page }) => {
    await gotoT001Reviewer(page);

    const row = page.getByTestId('ws-review-row').first();
    // Only decide 2 of the 3 rows -- the third (tony0950127) stays undecided.
    await row
      .locator('[data-testid="ws-review-annotator-row"][data-annotator="kioleemg12"]')
      .getByTestId('ws-review-row-approve')
      .click();
    await row
      .locator('[data-testid="ws-review-annotator-row"][data-annotator="113450022"]')
      .getByTestId('ws-review-row-approve')
      .click();

    await page.getByTestId('ws-review-submit-btn').click();

    await expect(page.locator('#toast')).toBeVisible();
    await expect(page.locator('#toastMsg')).toHaveText('請完成每位標記員的審核決策');
    await expect(page.getByTestId('ws-review-history')).toBeHidden();
  });

  test('bulk-approving all rows then submitting records all 3 annotators in history and the history tab', async ({
    page,
  }) => {
    await gotoT001Reviewer(page);

    const row = page.getByTestId('ws-review-row').first();
    await row.getByTestId('ws-review-bulk-approve').click();
    await page.getByTestId('ws-review-submit-btn').click();

    await expect(page.locator('#toast')).toBeVisible();
    const history = page.getByTestId('ws-review-history');
    await expect(history).toBeVisible();
    for (const name of ANNOTATOR_ORDER) {
      await expect(history).toContainText(name);
    }

    await page.getByTestId('ws-guideline-tab-history').click();
    const historyPanel = page.getByTestId('ws-history-panel');
    await expect(historyPanel).toBeVisible();
    const historyPanelText = (await historyPanel.textContent()) || '';
    const hasAnAnnotatorName = ANNOTATOR_ORDER.some((name) => historyPanelText.includes(name));
    expect(hasAnAnnotatorName).toBeTruthy();
  });
});

test.describe('Live-annotator round trip: rejecting the current row reopens the sample', () => {
  test('answering as annotator seeds a 4th "current" row; rejecting it flips the sample back to 待標記', async ({
    page,
  }) => {
    const errors = trackPageErrors(page);

    // T001's gold_label is an output-role prefill that would otherwise
    // leave the sample already-answered on load (same rationale as
    // annotation-workspace-chrome.spec.ts's gotoT001()).
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T001.datasetRecords[0].gold_label = null;
    `);

    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator' }));
    await dismissGuidelineModal(page);
    await page.getByTestId('ws-single-label-chip-positive').click();
    await page.getByTestId('ws-submit-btn').click();

    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);

    const row = page.getByTestId('ws-review-row').first();
    const annotatorRows = row.getByTestId('ws-review-annotator-row');
    await expect(annotatorRows).toHaveCount(4);
    const currentRow = annotatorRows.first();
    await expect(currentRow).toHaveAttribute('data-annotator', 'current');
    await expect(currentRow.getByTestId('ws-review-annotator-name')).toHaveText('目前標記員');

    // Approve the 3 mock rows in bulk, then override the current row to reject.
    await row.getByTestId('ws-review-bulk-approve').click();
    await currentRow.getByTestId('ws-review-row-reject').click();
    await expect(currentRow.getByTestId('ws-review-row-reject')).toHaveAttribute('aria-pressed', 'true');

    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toast')).toBeVisible();

    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator' }));
    await dismissGuidelineModal(page);
    await expect(
      page.getByTestId('ws-sample-item').first().getByTestId('ws-sample-status')
    ).toHaveText('待標記');

    await page.getByTestId('ws-guideline-tab-history').click();
    await expect(page.getByTestId('ws-history-panel')).toContainText('rejected');

    assertNoPageErrors(errors);
  });
});

/* THE 13-TASK COVERAGE LOOP -- every seed TaskProfile, once. A fresh
 * context has no live annotator submission, so exactly 3 mock rows are
 * expected per output type (no "current" row). */
const TASK_COVERAGE: Array<{ taskId: string; sampleId: string; outKeys: string[] }> = [
  { taskId: 'T001', sampleId: 'sent-001', outKeys: ['single_label'] },
  { taskId: 'T002', sampleId: 'emo-001', outKeys: ['multi_label'] },
  { taskId: 'T003', sampleId: 'taxonomy-001', outKeys: ['multi_label'] },
  { taskId: 'T004', sampleId: 'read-001', outKeys: ['single_dim'] },
  { taskId: 'T005', sampleId: 'mt-001', outKeys: ['multi_dim'] },
  { taskId: 'T006', sampleId: 'sequence-tagging-001', outKeys: ['sequence_tagging'] },
  { taskId: 'T007', sampleId: 'entity-recognition-001', outKeys: ['entity_recognition'] },
  { taskId: 'T008', sampleId: 'rel-001', outKeys: ['relation_identification'] },
  { taskId: 'T009', sampleId: 'sum-001', outKeys: ['free_text'] },
  { taskId: 'T010', sampleId: 'med-001', outKeys: ['entity_recognition', 'relation_identification'] },
  { taskId: 'T011', sampleId: '00183', outKeys: ['single_label'] },
  { taskId: 'T012', sampleId: 'eac8d013', outKeys: ['free_text'] },
  { taskId: 'T013', sampleId: 'absa-001', outKeys: ['entity_recognition', 'relation_identification', 'multi_dim'] },
];

for (const { taskId, sampleId, outKeys } of TASK_COVERAGE) {
  test(`reviewer aggregate card renders for ${taskId} (${outKeys.join('+')})`, async ({ page }) => {
    const errors = trackPageErrors(page);

    await page.goto(buildWorkspaceUrl({ task_id: taskId, sample_id: sampleId, role: 'reviewer' }));
    await dismissGuidelineModal(page);

    const rows = page.getByTestId('ws-review-row');
    await expect(rows).toHaveCount(outKeys.length);

    for (let i = 0; i < outKeys.length; i++) {
      const outKey = outKeys[i];
      const row = rows.nth(i);
      await expect(row.getByTestId('ws-review-stats')).toHaveText(/.+/);
      await expect(row.getByTestId('ws-review-note')).toBeVisible();
      await expect(row.getByTestId('ws-review-bulk-approve')).toBeVisible();
      await expect(row.getByTestId('ws-review-bulk-reject')).toBeVisible();

      const annotatorRows = row.getByTestId('ws-review-annotator-row');
      await expect(annotatorRows).toHaveCount(3);
      for (let a = 0; a < 3; a++) {
        const answerText = await annotatorRows.nth(a).getByTestId('ws-review-annotator-answer').textContent();
        expect((answerText || '').trim().length).toBeGreaterThan(0);
      }

      await expect(row.getByTestId(`ws-review-correct-${outKey}`)).toBeVisible();
    }

    assertNoPageErrors(errors);
  });
}

test.describe('Type-specific stats sanity', () => {
  test('T004 (single_dim) stats contains "mean :"', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T004', sample_id: 'read-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);
    await expect(page.getByTestId('ws-review-row').first().getByTestId('ws-review-stats')).toContainText('mean :');
  });

  test('T005 (multi_dim) stats contains "±1.5std"', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T005', sample_id: 'mt-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);
    await expect(page.getByTestId('ws-review-row').first().getByTestId('ws-review-stats')).toContainText('±1.5std');
  });

  test('T009 (free_text) stats equals the fixed free-text instruction sentence', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T009', sample_id: 'sum-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);
    await expect(page.getByTestId('ws-review-row').first().getByTestId('ws-review-stats')).toHaveText(
      '自由文本任務 — 請並列比對各標記員結果'
    );
  });
});

test.describe('Dimension answer tags — bracketed arrays with deviation coloring', () => {
  test('multi_dim annotator answers render as one bracketed value-array pill per annotator', async ({ page }) => {
    // T005 mt-002 ships fluency 3/3/4, adequacy 4/4/4, coherence 3/3/3.
    await page.goto(buildWorkspaceUrl({ task_id: 'T005', sample_id: 'mt-002', role: 'reviewer' }));
    await dismissGuidelineModal(page);

    const answers = page.getByTestId('ws-review-row').first().getByTestId('ws-review-annotator-answer');
    await expect(answers.nth(0)).toHaveText('[3, 4, 3]');
    await expect(answers.nth(2)).toHaveText('[4, 4, 3]');
  });

  test('multi_dim answer pills color by cross-annotator deviation like the list result tags', async ({ page }) => {
    // tony0950127's fluency 4 deviates ~1.41std from mean 3.33 (blue); the
    // other two rows stay within 1std (green).
    await page.goto(buildWorkspaceUrl({ task_id: 'T005', sample_id: 'mt-002', role: 'reviewer' }));
    await dismissGuidelineModal(page);

    const answers = page.getByTestId('ws-review-row').first().getByTestId('ws-review-annotator-answer');
    await expect(answers.nth(0).locator('.annotator-result-tag')).toHaveClass(/result-tag-green/);
    await expect(answers.nth(2).locator('.annotator-result-tag')).toHaveClass(/result-tag-blue/);
  });

  test('single_dim answer pills share the same deviation coloring rule', async ({ page }) => {
    // T004 read-001 ships scores 4 / 4 / 3 -> mean 3.67, std 0.47; the
    // 3-score row deviates by more than 1std but less than 1.5std (blue).
    await page.goto(buildWorkspaceUrl({ task_id: 'T004', sample_id: 'read-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);

    const answers = page.getByTestId('ws-review-row').first().getByTestId('ws-review-annotator-answer');
    await expect(answers.nth(0).locator('.annotator-result-tag')).toHaveClass(/result-tag-green/);
    await expect(answers.nth(2).locator('.annotator-result-tag')).toHaveClass(/result-tag-blue/);
  });
});

test.describe('Entity recognition review — source-text highlights and labeled result lines', () => {
  async function gotoT007Reviewer(page: Page) {
    await page.goto(buildWorkspaceUrl({ task_id: 'T007', sample_id: 'entity-recognition-002', role: 'reviewer' }));
    await dismissGuidelineModal(page);
  }

  test('source text card shows the raw text with one highlight mark per union entity', async ({ page }) => {
    // T007 entity-recognition-002: tony0950127 misses the trailing 差/opinion
    // entity, but the union across all annotators still ships 6 entities --
    // the card must show every annotated result, not one annotator's view.
    await gotoT007Reviewer(page);

    const card = page.getByTestId('ws-review-source-text');
    await expect(card).toContainText('原始文本');
    await expect(card).toContainText('步行五分鐘就到捷運站');

    const marks = card.getByTestId('ws-review-source-mark');
    await expect(marks).toHaveCount(6);
    await expect(marks.nth(0)).toContainText('飯店');
    await expect(marks.nth(0).locator('.rv-source-badge')).toHaveText('target');
    await expect(marks.nth(5)).toContainText('差');
    await expect(marks.nth(5).locator('.rv-source-badge')).toHaveText('opinion');
  });

  test('annotator answers render one colored type badge + entity text line per entity', async ({ page }) => {
    await gotoT007Reviewer(page);

    const firstAnswer = page.getByTestId('ws-review-row').first().getByTestId('ws-review-annotator-answer').first();
    const lines = firstAnswer.getByTestId('ws-review-entity-line');
    await expect(lines).toHaveCount(6);
    await expect(lines.first().locator('.rv-entity-badge')).toHaveText('target');
    await expect(lines.first().locator('.rv-entity-text')).toHaveText('飯店');
    // Badge color comes from the task's entity config (T007 target #3498DB),
    // not a hardcoded palette.
    await expect(lines.first().locator('.rv-entity-badge')).toHaveCSS('background-color', 'rgb(52, 152, 219)');
  });

  test('an annotator missing an entity still shows only their own lines', async ({ page }) => {
    await gotoT007Reviewer(page);

    const answers = page.getByTestId('ws-review-row').first().getByTestId('ws-review-annotator-answer');
    await expect(answers.nth(2).getByTestId('ws-review-entity-line')).toHaveCount(5);
  });
});

test.describe('Relation review — annotator-view-parity triple rows', () => {
  function relationCard(page: Page) {
    return page.getByTestId('ws-review-row').filter({ hasText: 'relation_identification' });
  }

  async function gotoMed001Reviewer(page: Page) {
    await page.goto(buildWorkspaceUrl({ task_id: 'T010', sample_id: 'med-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);
  }

  test('each annotator answer renders the annotator-style triple rows with token positions and type badge', async ({ page }) => {
    // T010 med-001: mock triples mirror the record's ner-shape gold triples,
    // so every row must resolve its entity/trigger positions from the record
    // -- the same data the annotator's own 關係識別 list renders from.
    await gotoMed001Reviewer(page);

    const firstAnswer = relationCard(page).getByTestId('ws-review-annotator-answer').first();
    const rows = firstAnswer.getByTestId('relation-triple-row');
    await expect(rows).toHaveCount(8);
    await expect(rows.nth(0)).toContainText('左心耳 (1,3)');
    await expect(rows.nth(0)).toContainText('位於 (4,5)');
    await expect(rows.nth(0)).toContainText('左心房 (6,8)');
    await expect(rows.nth(0)).toContainText('類型：bodyLocation');
    await expect(rows.nth(0).getByRole('button', { name: '類型' })).toBeVisible();
    await expect(rows.nth(0).getByRole('button', { name: '刪除' })).toBeVisible();
  });

  test('an annotator missing a triple still shows only their own rows', async ({ page }) => {
    await gotoMed001Reviewer(page);

    const answers = relationCard(page).getByTestId('ws-review-annotator-answer');
    await expect(answers.nth(2).getByTestId('relation-triple-row')).toHaveCount(7);
  });

  test('deleting a triple row removes it and recomputes the stats box', async ({ page }) => {
    await gotoMed001Reviewer(page);

    const card = relationCard(page);
    await expect(card.getByTestId('ws-review-stats')).toContainText('bodyLocation×9');

    const firstAnswer = card.getByTestId('ws-review-annotator-answer').first();
    await firstAnswer.getByTestId('relation-triple-row').first().getByRole('button', { name: '刪除' }).click();

    await expect(card.getByTestId('ws-review-annotator-answer').first().getByTestId('relation-triple-row')).toHaveCount(7);
    await expect(card.getByTestId('ws-review-stats')).toContainText('bodyLocation×8');
  });

  test('absa-shape records without ner triples fall back to positionless rows', async ({ page }) => {
    // T013 absa-001 has gold_triplets (absa shape, no trigger spans), matching
    // the annotator view which also renders its triple list without positions.
    await page.goto(buildWorkspaceUrl({ task_id: 'T013', sample_id: 'absa-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);

    const rows = relationCard(page).getByTestId('ws-review-annotator-answer').first().getByTestId('relation-triple-row');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText('Note 10 plus');
    await expect(rows.nth(0)).toContainText('has_aspect');
    await expect(rows.nth(0)).not.toContainText(/\(\d+,\d+\)/);
  });

  test('relation-only tasks show the 原始文本 card with evidence-entity highlights on top', async ({ page }) => {
    // T008 rel-001 has no entity_recognition output (entities are evidence
    // scaffolding), yet the reviewer must still see the same highlighted
    // source text the annotator's own relation view opens with.
    await page.goto(buildWorkspaceUrl({ task_id: 'T008', sample_id: 'rel-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);

    const card = page.getByTestId('ws-review-source-text');
    await expect(card).toContainText('原始文本');
    // highlight badges (type text) interleave the raw text, so assert an
    // unhighlighted segment rather than one crossing a mark boundary
    await expect(card).toContainText('若未妥善控制，可能導致');
    await expect(card.getByTestId('ws-review-source-mark')).toHaveCount(5);
    await expect(card.getByTestId('ws-review-source-mark').nth(0)).toContainText('高血壓');
  });

  test('composed entity+relation tasks keep the annotator-answer highlight path', async ({ page }) => {
    // T013 selects entity_recognition too, so the 原始文本 card must keep
    // sourcing highlights from the annotator entity answers (union), not
    // switch to the relation-only evidence fallback.
    await page.goto(buildWorkspaceUrl({ task_id: 'T013', sample_id: 'absa-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);

    const card = page.getByTestId('ws-review-source-text');
    await expect(card).toContainText('原始文本');
    await expect(card.getByTestId('ws-review-source-mark')).toHaveCount(4);
  });
});

test.describe('EN i18n spot check', () => {
  async function ensureEnglishMode(p: Page) {
    if ((await p.getByTestId('lang-label').textContent()) !== 'EN') {
      await p.getByTestId('lang-toggle').click();
    }
    await expect(p.locator('html')).toHaveAttribute('lang', 'en');
  }

  test('T001 reviewer shows the English chip label and bulk button text', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
    });
    await gotoT001Reviewer(page);
    await ensureEnglishMode(page);

    const row = page.getByTestId('ws-review-row').first();
    // The chip label sits beside (not inside) the computed stats text node,
    // so assert it at row scope to stay layout-agnostic.
    await expect(row).toContainText(/label distribution/i);
    await expect(row.getByTestId('ws-review-bulk-approve')).toContainText(/approve all/i);
    await expect(row.getByTestId('ws-review-bulk-reject')).toContainText(/reject all/i);
  });
});
