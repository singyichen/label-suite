/*
 * Issue #886: review coverage, annotation submission, and review finalization
 * are different measures. Keep FR-072/FR-076's shared reviewer summary while
 * making the surrounding Dashboard and Task Detail UI name each measure.
 */
import { test, expect, type Page } from '@playwright/test';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html?scenario=reviewer';
const DETAIL_URL = '/pages/task-management/task-detail.html?task_id=T016&tab=annotation-progress&ap_stage=official';

type Language = 'zh' | 'en';

const COPY = {
  zh: {
    summary: '任務覆蓋 5 / 5 個審核單位 · 爭議中 3 個 · IAA 無法計算',
    coverage: '審核覆蓋',
    sort: '依審核覆蓋率排序',
    sortDesc: '審核覆蓋率：高到低',
    sortAsc: '審核覆蓋率：低到高',
    dispute: '爭議中 3',
    submission: '標記提交進度',
    finalized: '已定稿 2 / 5',
    disputed: '爭議中 3',
    arbitration: '待仲裁 2',
    exception: '最終例外待處置 1',
    reviewGroup: '審核定稿狀態',
    inProgress: /進行中/,
  },
  en: {
    summary: 'Task coverage 5 / 5 review units · 3 disputed · IAA Not computable',
    coverage: 'Review coverage',
    sort: 'Sort by review coverage',
    sortDesc: 'Review coverage: High to Low',
    sortAsc: 'Review coverage: Low to High',
    dispute: '3 disputed',
    submission: 'Annotation submission progress',
    finalized: 'Finalized 2 / 5',
    disputed: 'Disputed 3',
    arbitration: 'Pending arbitration 2',
    exception: 'Final exceptions pending 1',
    reviewGroup: 'Review finalization status',
    inProgress: /in progress/i,
  },
} as const;

async function setLanguage(page: Page, language: Language): Promise<void> {
  if (language === 'en') {
    await page.addInitScript(() => window.localStorage.setItem('labelsuite.lang', 'en'));
  }
}

for (const language of ['zh', 'en'] as const) {
  test(`T016 Dashboard ${language} names 100% review coverage without implying completion`, async ({ page }) => {
    await setLanguage(page, language);
    const response = await page.goto(DASHBOARD_URL);
    expect(response?.status()).toBe(200);
    await expect(page.getByTestId('reviewer-view')).toBeVisible();
    const card = page.locator('#reviewerTaskList [data-example-task-id="T016"]');
    await expect(card).toBeVisible();

    // FR-072/FR-076's shared formula and summary text are intentionally
    // unchanged; only the bar's meaning and visual state become explicit.
    await expect(card.locator('.list-item-detail')).toHaveText(COPY[language].summary);
    await expect(card.locator('.progress span')).toHaveAttribute('style', /width:\s*100%/);
    await expect(card.getByText(COPY[language].coverage, { exact: true })).toBeVisible();
    const bar = card.getByRole('progressbar', { name: COPY[language].coverage });
    await expect(bar).toHaveAttribute('aria-valuenow', '100');
    await expect(bar).toHaveAttribute('aria-valuetext', new RegExp(COPY[language].dispute));
    await expect(card.locator('.progress')).toHaveClass(/coverage-unresolved/);
    await expect(card.locator('.progress')).not.toHaveClass(/progress-complete|progress-success/);
    await expect(card.locator('.task-item-badges')).toContainText(COPY[language].inProgress);

    await expect(page.locator('#reviewerSortLabel')).toHaveText(COPY[language].sort);
    await expect(page.locator('#reviewerSortOptionProgressDesc')).toHaveText(COPY[language].sortDesc);
    await expect(page.locator('#reviewerSortOptionProgressAsc')).toHaveText(COPY[language].sortAsc);
  });

  test(`T016 Task Detail ${language} separates submitted work from live review finalization`, async ({ page }) => {
    await setLanguage(page, language);
    const response = await page.goto(DETAIL_URL);
    expect(response?.status()).toBe(200);
    await expect(page.locator('#annotationProgressPanel')).not.toHaveClass(/hidden/, { timeout: 15000 });
    await expect(page.locator('#statusBadge')).toContainText(COPY[language].inProgress);

    await expect(page.locator('#progressMetricRateLabel')).toHaveText(COPY[language].submission);
    await expect(page.getByTestId('annotation-submission-progress')).toContainText(/5\s*\/\s*5/);
    const review = page.getByTestId('review-progress-breakdown');
    await expect(review).toHaveAttribute('role', 'group');
    await expect(review).toHaveAttribute('aria-label', COPY[language].reviewGroup);
    await expect(review.getByTestId('review-finalized-count')).toHaveText(COPY[language].finalized);
    await expect(review.getByTestId('review-disputed-count')).toHaveText(COPY[language].disputed);
    await expect(review.getByTestId('review-pending-arbitration-count')).toHaveText(COPY[language].arbitration);
    await expect(review.getByTestId('review-exception-count')).toHaveText(COPY[language].exception);
  });
}

test('T016 review breakdown updates after a live arbitration without changing the submission 5/5', async ({ page }) => {
  await page.goto(DETAIL_URL);
  await expect(page.locator('#annotationProgressPanel')).not.toHaveClass(/hidden/, { timeout: 15000 });
  const state = await page.evaluate(() => {
    const data = (window as unknown as {
      LabelSuiteAnnotationWorkspaceData: {
        getDisputeItems: (
          taskId: string, runType: string, sampleId: string,
          identity: { annotatorId: string }, outKeys: string[]
        ) => Array<{ outKey: string; key: string; reviewerValues: Record<string, unknown> }>;
        submitArbitration: (
          taskId: string, runType: string, sampleId: string,
          identity: { annotatorId: string; reviewerId: string },
          decisions: Array<{ itemId: string; choice: string; value: unknown; reason: string }>
        ) => void;
        computeReviewSummary: (
          taskId: string, runType: string
        ) => { total: number; finalized: number; disputed: number };
        listReviewPoolItems: (
          taskId: string, runType: string
        ) => { awaitingArbitration: unknown[]; pendingExceptions: unknown[] };
      };
    }).LabelSuiteAnnotationWorkspaceData;
    const sampleId = 'ofm-03-awaiting-arbitration';
    const annotator = { annotatorId: 'kioleemg12' };
    const items = data.getDisputeItems('T016', 'official_run', sampleId, annotator, ['single_label']);
    if (items.length !== 1) throw new Error('Expected one unresolved T016 dispute item');
    data.submitArbitration('T016', 'official_run', sampleId,
      { annotatorId: annotator.annotatorId, reviewerId: 'reviewer_chen' },
      items.map((item) => ({
        itemId: `${item.outKey}::${item.key}`,
        choice: 'adopt_b',
        value: item.reviewerValues.reviewer_lin,
        reason: 'Resolve synthetic regression dispute',
      })));
    const summary = data.computeReviewSummary('T016', 'official_run');
    const pools = data.listReviewPoolItems('T016', 'official_run');
    return {
      total: summary.total,
      finalized: summary.finalized,
      disputed: summary.disputed,
      awaiting: pools.awaitingArbitration.length,
      exceptions: pools.pendingExceptions.length,
    };
  });
  expect(state).toEqual({ total: 5, finalized: 3, disputed: 2, awaiting: 1, exceptions: 1 });
  await page.reload();
  await expect(page.locator('#annotationProgressPanel')).not.toHaveClass(/hidden/, { timeout: 15000 });
  await expect(page.getByTestId('annotation-submission-progress')).toContainText(/5\s*\/\s*5/);
  const review = page.getByTestId('review-progress-breakdown');
  await expect(review.getByTestId('review-finalized-count')).toHaveText('已定稿 3 / 5');
  await expect(review.getByTestId('review-disputed-count')).toHaveText('爭議中 2');
  await expect(review.getByTestId('review-pending-arbitration-count')).toHaveText('待仲裁 1');
  await expect(review.getByTestId('review-exception-count')).toHaveText('最終例外待處置 1');
  await expect(page.locator('#statusBadge')).toContainText('進行中');
});
