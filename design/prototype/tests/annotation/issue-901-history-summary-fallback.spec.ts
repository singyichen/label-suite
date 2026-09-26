import { test, expect, type Page } from '@playwright/test';
import {
  assertNoPageErrors,
  buildWorkspaceUrl,
  skipGuidelineModal,
  trackPageErrors,
} from './_workspace-helpers';

const ANNOTATOR = '113450022';
const REVIEWER = 'reviewer_chen';
const MODIFIER = 'reviewer_wang';
const REVIEW_REASON = '依 [[負向（negative）的判準]]，文末表達失望，應判讀為負面而非中性';

function historyCard(page: Page, action: string) {
  return page
    .locator(`#wsHistoryContainer .history-action-badge[data-action="${action}"]`)
    .locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " history-item ")][1]');
}

async function openHistory(page: Page, params: Parameters<typeof buildWorkspaceUrl>[0]) {
  await page.goto(buildWorkspaceUrl(params));
  await page.getByTestId('ws-guideline-tab-history').click();
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #901: structured history summary fallback', () => {
  test('T014 modified card keeps the audit details but omits its redundant raw summary in zh and en', async ({ page }) => {
    const errors = trackPageErrors(page);
    const params = {
      task_id: 'T014',
      sample_id: 'dry-04-dispute-resolved',
      role: 'reviewer' as const,
      run_type: 'dry_run' as const,
      annotator_id: ANNOTATOR,
      reviewer_id: REVIEWER,
    };

    await page.goto(buildWorkspaceUrl(params));
    /* The demo seeder can write all three events in the same millisecond.
       Normalize this test fixture's chronology so the responsibility chain
       deterministically matches the real T014 scenario: submit, modify,
       then arbitrate. The product behavior under test remains DOM-only. */
    await page.evaluate(() => {
      const prefix = 'labelsuite.wsSubmissions.T014::';
      const sampleId = 'dry-04-dispute-resolved';
      const times: Record<string, string> = {
        submitted: '2026-09-23T07:55:00.000Z',
        modified: '2026-09-23T07:55:01.000Z',
        adjudicated: '2026-09-23T07:55:02.000Z',
      };
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith(prefix))
        .forEach((key) => {
          const bucket = JSON.parse(window.localStorage.getItem(key) || '{}') as Record<
            string,
            { history?: Array<{ action: string; at: string }> }
          >;
          const entry = bucket[sampleId];
          if (!entry?.history) return;
          entry.history.forEach((event) => {
            if (times[event.action]) event.at = times[event.action];
          });
          window.localStorage.setItem(key, JSON.stringify(bucket));
        });
    });
    await page.reload();
    await page.getByTestId('ws-guideline-tab-history').click();

    const modified = historyCard(page, 'modified');
    await expect(modified).toHaveCount(1);
    await expect(modified.locator('.history-actor')).toHaveText(`審核員 · ${MODIFIER}`);
    await expect(modified.locator('.history-time')).not.toHaveText('');
    await expect(modified.locator('.history-action-badge')).toHaveText('審核修正');
    await expect(modified.locator('.history-summary')).toHaveCount(0);
    await expect(modified.locator('.history-diff')).toHaveCount(1);
    await expect(modified.locator('.history-diff-item')).toHaveText('single_label: neutral → negative');
    await expect(modified.locator('.history-reason')).toHaveText(`理由：${REVIEW_REASON}`);
    await expect(modified.locator('.history-item-header + .history-diff')).toHaveCount(1);
    await expect(modified.locator('.history-diff + .history-reason')).toHaveCount(1);

    await page.evaluate(() => window.localStorage.setItem('labelsuite.lang', 'en'));
    await page.reload();
    await page.getByTestId('ws-guideline-tab-history').click();

    const englishModified = historyCard(page, 'modified');
    await expect(englishModified.locator('.history-summary')).toHaveCount(0);
    await expect(englishModified.locator('.history-diff')).toHaveCount(1);
    await expect(englishModified.locator('.history-reason')).toHaveText(`Reason: ${REVIEW_REASON}`);
    assertNoPageErrors(errors);
  });

  test('a modified event with no visible diff keeps summary fallback and submitted stays unchanged', async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto(buildWorkspaceUrl({
      task_id: 'T001',
      sample_id: 'sent-001',
      role: 'reviewer',
      run_type: 'official_run',
      annotator_id: 'kioleemg12',
      reviewer_id: MODIFIER,
    }));

    await page.evaluate(() => {
      const data = (window as unknown as {
        LabelSuiteAnnotationWorkspaceData: {
          markSampleSubmitted: (
            taskId: string,
            role: string,
            runType: string,
            sampleId: string,
            payload: Record<string, unknown>,
            summary: string,
            identity: { annotatorId: string; reviewerId?: string },
          ) => void;
        };
      }).LabelSuiteAnnotationWorkspaceData;
      data.markSampleSubmitted(
        'T001',
        'annotator',
        'official_run',
        'sent-001',
        { previewState: { single_label: { selected: 'neutral' } } },
        'single_label: neutral',
        { annotatorId: 'kioleemg12' },
      );
      data.markSampleSubmitted(
        'T001',
        'reviewer',
        'official_run',
        'sent-001',
        {
          previewState: { single_label: { selected: 'neutral' } },
          decisions: { single_label: 'modify' },
          reasons: {},
        },
        'single_label · kioleemg12: modify',
        { annotatorId: 'kioleemg12', reviewerId: 'reviewer_wang' },
      );
    });

    await page.reload();
    await page.getByTestId('ws-guideline-tab-history').click();

    const modified = historyCard(page, 'modified');
    await expect(modified.locator('.history-diff')).toHaveCount(0);
    await expect(modified.locator('.history-summary')).toHaveText('單一標籤 · kioleemg12：修正');

    const submitted = historyCard(page, 'submitted');
    await expect(submitted.locator('.history-snapshot')).toContainText('single_label: neutral');
    await expect(submitted.locator('.history-summary')).toHaveText('single_label: neutral');
    assertNoPageErrors(errors);
  });

  test('a sequence_tagging modified event follows the same structured-diff rule', async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto(buildWorkspaceUrl({
      task_id: 'T006',
      sample_id: 'sequence-tagging-001',
      role: 'reviewer',
      run_type: 'official_run',
      annotator_id: 'kioleemg12',
      reviewer_id: MODIFIER,
    }));

    await page.evaluate(() => {
      const data = (window as unknown as {
        LabelSuiteAnnotationWorkspaceData: {
          markSampleSubmitted: (
            taskId: string,
            role: string,
            runType: string,
            sampleId: string,
            payload: Record<string, unknown>,
            summary: string,
            identity: { annotatorId: string; reviewerId?: string },
          ) => void;
        };
      }).LabelSuiteAnnotationWorkspaceData;
      data.markSampleSubmitted(
        'T006',
        'annotator',
        'official_run',
        'sequence-tagging-001',
        { previewState: { sequence_tagging: { spans: [{ start: 13, end: 15, label: 'LOC' }] } } },
        'sequence_tagging: LOC 台北',
        { annotatorId: 'kioleemg12' },
      );
      data.markSampleSubmitted(
        'T006',
        'reviewer',
        'official_run',
        'sequence-tagging-001',
        {
          previewState: { sequence_tagging: { spans: [{ start: 13, end: 17, label: 'LOC' }] } },
          decisions: { sequence_tagging: 'modify' },
          reasons: {},
        },
        'sequence_tagging · kioleemg12: modify',
        { annotatorId: 'kioleemg12', reviewerId: 'reviewer_wang' },
      );
    });

    await page.reload();
    await page.getByTestId('ws-guideline-tab-history').click();

    const modified = historyCard(page, 'modified');
    await expect(modified.locator('.history-diff-item')).toHaveCount(1);
    await expect(modified.locator('.history-diff-item')).toContainText('sequence_tagging');
    await expect(modified.locator('.history-summary')).toHaveCount(0);
    assertNoPageErrors(errors);
  });
});
