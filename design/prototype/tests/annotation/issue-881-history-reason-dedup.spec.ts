import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, skipGuidelineModal } from './_workspace-helpers';

const ANNOTATOR = 'kioleemg12';
const REVIEWER = 'reviewer_wang';
const REVIEW_REASON = '依 [[中立（neutral）的判準]]，褒貶並陳且未表態，應判讀為中性而非正面';
const ARBITRATION_REASON = '依 [[中立（neutral）的判準]]，採用審核員提出的中立修正。';

function historyCard(page: Page, action: string) {
  return page
    .locator(`#wsHistoryContainer .history-action-badge[data-action="${action}"]`)
    .locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " history-item ")][1]');
}

async function openHistory(page: Page, taskId: string, sampleId: string, reviewerId = REVIEWER) {
  await page.goto(buildWorkspaceUrl({
    task_id: taskId,
    sample_id: sampleId,
    role: 'reviewer',
    run_type: 'official_run',
    annotator_id: ANNOTATOR,
    reviewer_id: reviewerId,
  }));
  await dismissGuidelineModal(page);
  await page.getByTestId('ws-guideline-tab-history').click();
}

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #881: right-side history reason deduplication', () => {
  test('T015 demo renders each reason once and hides the arbitration implementation summary', async ({ page }) => {
    await openHistory(page, 'T015', 'ofs-03-arbitrated-gold', 'reviewer_chen');

    const modified = historyCard(page, 'modified');
    await expect(modified).toHaveCount(1);
    await expect(modified.locator('.history-reason')).toHaveText(`理由：${REVIEW_REASON}`);
    /* issue #923: fixing the seed's causal-order bug means this card's
       "previous" snapshot is now the annotator's own submitted answer
       (positive), not arbitration's already-adopted value (neutral) --
       so buildHistoryDiff() produces a real transition and the card
       renders it via .history-diff instead of falling back to a
       plain-text .history-summary. The reason still reads exactly once,
       from .history-reason alone. */
    await expect(modified.locator('.history-summary')).toHaveCount(0);
    await expect(modified.locator('.history-diff-item')).toContainText('single_label: positive → neutral');
    expect(occurrences(await modified.innerText(), REVIEW_REASON)).toBe(1);

    const adjudicated = historyCard(page, 'adjudicated');
    await expect(adjudicated).toHaveCount(1);
    await expect(adjudicated.locator('.history-summary')).toHaveCount(0);
    await expect(adjudicated).not.toContainText('arbitration finalized:');
    await expect(adjudicated.locator('.history-reason')).toHaveText(`理由：${ARBITRATION_REASON}`);
    expect(occurrences(await adjudicated.innerText(), ARBITRATION_REASON)).toBe(1);

    const stored = await page.evaluate(({ annotatorId, reviewReason, arbitrationReason }) => {
      const data = (window as unknown as {
        LabelSuiteAnnotationWorkspaceData: {
          getSampleHistory: (
            taskId: string,
            runType: string,
            sampleId: string,
            identity: { annotatorId: string }
          ) => Array<{ action: string; summary: string; reason?: string }>;
        };
      }).LabelSuiteAnnotationWorkspaceData;
      return data
        .getSampleHistory('T015', 'official_run', 'ofs-03-arbitrated-gold', { annotatorId })
        .filter((event) => event.reason === reviewReason || event.reason === arbitrationReason)
        .map((event) => ({ action: event.action, summary: event.summary, reason: event.reason }));
    }, { annotatorId: ANNOTATOR, reviewReason: REVIEW_REASON, arbitrationReason: ARBITRATION_REASON });

    expect(stored).toEqual(expect.arrayContaining([
      { action: 'modified', summary: `single_label · ${ANNOTATOR}: modify`, reason: REVIEW_REASON },
      { action: 'adjudicated', summary: '', reason: ARBITRATION_REASON },
    ]));
  });

  test('legacy summary-plus-reason records are deduplicated at render time without rewriting localStorage', async ({ page }) => {
    const legacyReason = '舊資料理由：此段只能在右側歷程卡片出現一次。';
    const legacySummary = `single_label · ${ANNOTATOR}: modify — ${legacyReason}`;
    const bucketKey = `labelsuite.wsSubmissions.T001::reviewer::official_run::${ANNOTATOR}::${REVIEWER}`;

    await page.addInitScript(([key, summary, reason]) => {
      window.localStorage.setItem(key as string, JSON.stringify({
        'sent-001': {
          status: 'submitted',
          submittedAt: '2026-09-23T07:55:00.000Z',
          answers: {},
          history: [{
            action: 'modified',
            role: 'reviewer',
            actorId: 'reviewer_wang',
            at: '2026-09-23T07:55:00.000Z',
            summary,
            reason,
          }],
        },
      }));
    }, [bucketKey, legacySummary, legacyReason] as const);

    await openHistory(page, 'T001', 'sent-001');

    const modified = historyCard(page, 'modified');
    await expect(modified).toHaveCount(1);
    await expect(modified.locator('.history-summary')).toHaveText(`single_label · ${ANNOTATOR}: modify`);
    await expect(modified.locator('.history-reason')).toHaveText(`理由：${legacyReason}`);
    expect(occurrences(await modified.innerText(), legacyReason)).toBe(1);

    const persistedSummary = await page.evaluate(([key]) => {
      const bucket = JSON.parse(window.localStorage.getItem(key as string) || '{}');
      return bucket['sent-001'].history[0].summary;
    }, [bucketKey] as const);
    expect(persistedSummary).toBe(legacySummary);

    await page.evaluate(() => window.localStorage.setItem('labelsuite.lang', 'en'));
    await page.reload();
    await page.getByTestId('ws-guideline-tab-history').click();
    const englishCard = historyCard(page, 'modified');
    await expect(englishCard.locator('.history-summary')).toHaveText(`single_label · ${ANNOTATOR}: modify`);
    await expect(englishCard.locator('.history-reason')).toHaveText(`Reason: ${legacyReason}`);
    expect(occurrences(await englishCard.innerText(), legacyReason)).toBe(1);
  });

  test('a live reviewer modify stores its explanation only in the structured reason field', async ({ page }) => {
    const reason = '實際送出理由（issue #881）：理由不得再複製進 summary。';
    await page.goto(buildWorkspaceUrl({
      task_id: 'T001',
      sample_id: 'sent-001',
      role: 'reviewer',
      run_type: 'official_run',
      annotator_id: ANNOTATOR,
      reviewer_id: REVIEWER,
    }));
    await dismissGuidelineModal(page);

    const correction = page.getByTestId('ws-review-correct-single_label');
    const negative = correction.getByTestId('ws-single-label-chip-negative');
    const positive = correction.getByTestId('ws-single-label-chip-positive');
    await ((await negative.getAttribute('aria-pressed')) === 'true' ? positive : negative).click();
    await page.getByTestId('ws-review-row-modify').click();
    await page.getByTestId('ws-review-reason').fill(reason);
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');

    const event = await page.evaluate(({ annotatorId, reviewerId, expectedReason }) => {
      const data = (window as unknown as {
        LabelSuiteAnnotationWorkspaceData: {
          getSampleHistory: (
            projectId: string,
            taskId: string,
            sampleId: string,
            context: { annotatorId: string },
          ) => Array<{
            action: string;
            actorId?: string;
            reason?: string;
            summary: string;
          }>;
        };
      }).LabelSuiteAnnotationWorkspaceData;
      return data
        .getSampleHistory('T001', 'official_run', 'sent-001', { annotatorId })
        .filter((item) => item.action === 'modified' && item.actorId === reviewerId && item.reason === expectedReason)
        .pop();
    }, { annotatorId: ANNOTATOR, reviewerId: REVIEWER, expectedReason: reason });

    expect(event).toBeDefined();
    if (!event) {
      throw new Error('Expected the reviewer modification event to be stored');
    }
    expect(event.reason).toBe(reason);
    expect(event.summary).not.toContain(reason);
    expect(event.summary).toContain(`single_label · ${ANNOTATOR}: modify`);
  });
});
