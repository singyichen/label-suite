import { expect, test, type Page } from '@playwright/test';
import { buildListUrl, skipGuidelineModal } from './_workspace-helpers';

// FR-061/094/095/097: the list names the source of each settled outcome.
// A reviewer proposal is not the final decision, and exclusion has no gold value.
const TASK = 'T016';
const ARBITRATED = 'ofm-01-reviewer-corrects-b';
const EXCEPTION = 'ofm-05-final-exception';
const ITEM = 'single_label::single_label';

type WorkspaceData = {
  resolveExceptionPoolItem: (
    taskId: string, runType: string, sampleId: string,
    identity: { annotatorId: string }, outKey: string,
    action: string, value: string | undefined, reason: string
  ) => void;
  getReviewUnitStatus: (
    taskId: string, runType: string, sampleId: string,
    identity: { annotatorId: string }, outKeys: string[]
  ) => string | null;
  getExceptionPool: (
    taskId: string, runType: string, sampleId: string,
    identity: { annotatorId: string }
  ) => Record<string, { action?: string; finalized_value?: string }>;
};

function listUrl(reviewerId: string): string {
  return buildListUrl({
    task_id: TASK, role: 'reviewer', run_type: 'official_run', reviewer_id: reviewerId,
  });
}

async function openList(page: Page, reviewerId: string): Promise<void> {
  const response = await page.goto(listUrl(reviewerId));
  expect(response?.status()).toBe(200);
  await expect(page.getByTestId('ws-sample-item').first()).toBeVisible();
}

function rowFor(page: Page, sampleId: string) {
  return page.getByTestId('ws-sample-item').filter({ hasText: sampleId });
}

async function expectBadgeInBothLanguages(
  page: Page, sampleId: string, zh: string, en: string
): Promise<void> {
  const badge = rowFor(page, sampleId).getByTestId('list-review-finalization-source-badge');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText(zh);
  await expect(badge).not.toContainText('審核多數決');
  await page.locator('#langToggle').click();
  await expect(badge).toHaveText(en);
  await expect(badge).not.toContainText(/reviewer majority/i);
}

async function resolveException(
  page: Page, action: string, value: string | undefined
): Promise<{ status: string | null; record: { action?: string; finalized_value?: string } }> {
  return page.evaluate(({ action, value }) => {
    const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData;
    const identity = { annotatorId: 'kioleemg12' };
    data.resolveExceptionPoolItem(
      'T016', 'official_run', 'ofm-05-final-exception', identity,
      'single_label', action, value, 'Synthetic exception resolution'
    );
    return {
      status: data.getReviewUnitStatus(
        'T016', 'official_run', 'ofm-05-final-exception', identity, ['single_label']
      ),
      record: data.getExceptionPool(
        'T016', 'official_run', 'ofm-05-final-exception', identity
      ).single_label,
    };
  }, { action, value });
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test('T016 arbitration adopted B names the arbiter source in zh and en', async ({ page }) => {
  await openList(page, 'reviewer_wang');
  const row = rowFor(page, ARBITRATED);
  await expectBadgeInBothLanguages(
    page, ARBITRATED, '仲裁採 B 定稿', 'Finalized by arbitration adopting B'
  );
  await expect(row.getByTestId('list-review-answer')).toHaveText('negative');
});

test('PL custom answer names the exception source in zh and en', async ({ page }) => {
  await openList(page, 'reviewer_li');
  const resolution = await resolveException(page, 'custom_answer', 'negative');
  expect(resolution).toMatchObject({
    status: 'finalized', record: { action: 'custom_answer', finalized_value: 'negative' },
  });
  await page.reload();
  await expectBadgeInBothLanguages(
    page, EXCEPTION, 'PL 自訂答案定稿', 'Finalized with PL custom answer'
  );
  await expect(rowFor(page, EXCEPTION).getByTestId('list-review-answer')).toHaveText('negative');
});

test('PL adopting reviewer answer names the exception source in zh and en', async ({ page }) => {
  await openList(page, 'reviewer_li');
  const resolution = await resolveException(page, 'adopt_reviewer', 'positive');
  expect(resolution).toMatchObject({
    status: 'finalized', record: { action: 'adopt_reviewer', finalized_value: 'positive' },
  });
  await page.reload();
  await expectBadgeInBothLanguages(
    page, EXCEPTION, 'PL 採審核員答案定稿', 'Finalized by PL adopting reviewer answer'
  );
  await expect(rowFor(page, EXCEPTION).getByTestId('list-review-answer')).toHaveText('positive');
});

test('PL adopting an unchanged annotator answer still names the source', async ({ page }) => {
  await openList(page, 'reviewer_li');
  const resolution = await resolveException(page, 'adopt_annotator', 'neutral');
  expect(resolution).toMatchObject({
    status: 'finalized', record: { action: 'adopt_annotator', finalized_value: 'neutral' },
  });
  await page.reload();
  const row = rowFor(page, EXCEPTION);
  await expectBadgeInBothLanguages(
    page, EXCEPTION, 'PL 採標記員答案定稿', 'Finalized by PL adopting annotator answer'
  );
  await expect(row.getByTestId('list-review-answer')).toHaveText('neutral');
});

test('PL exclusion names its source without fabricating a final answer', async ({ page }) => {
  await openList(page, 'reviewer_li');
  const resolution = await resolveException(page, 'exclude_from_dataset', undefined);
  expect(resolution.status).toBe('disputed');
  expect(resolution.record.action).toBe('exclude_from_dataset');
  expect(resolution.record).not.toHaveProperty('finalized_value');
  await page.reload();
  const row = rowFor(page, EXCEPTION);
  await expect(row.locator('.status-badge')).toHaveText('爭議中 · 未定稿');
  await expectBadgeInBothLanguages(page, EXCEPTION, 'PL 已排除資料', 'Excluded by PL');
});

test('legacy arbitration result without a recorded choice uses a neutral source label', async ({ page }) => {
  await openList(page, 'reviewer_wang');
  await page.evaluate(({ item }) => {
    const key = `labelsuite.wsArbitration.T016::official_run::kioleemg12::ofm-01-reviewer-corrects-b::${item}`;
    const stored = window.localStorage.getItem(key);
    if (!stored) throw new Error(`Missing seeded arbitration item: ${key}`);
    const record = JSON.parse(stored) as { votes?: unknown[]; finalized_value?: string; finalized_by?: string };
    record.votes = [];
    window.localStorage.setItem(key, JSON.stringify(record));
  }, { item: ITEM });
  await page.reload();
  await expectBadgeInBothLanguages(
    page, ARBITRATED, '定稿值已覆寫', 'Finalized value overwritten'
  );
  await expect(rowFor(page, ARBITRATED).getByTestId('list-review-answer')).toHaveText('negative');
});
