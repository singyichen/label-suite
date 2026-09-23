import { expect, test, type Page } from '@playwright/test';
import { buildListUrl, skipGuidelineModal } from './_workspace-helpers';

// FR-061/094/095/097: the list names the source of each settled outcome.
// A reviewer proposal is not the final decision, and exclusion has no gold value.
const TASK = 'T016';
const ARBITRATED = 'ofm-01-reviewer-corrects-b';
const EXCEPTION = 'ofm-05-final-exception';
const ITEM = 'single_label::single_label';

type WorkspaceData = {
  getReviewerMockRows: (
    taskId: string, sampleId: string
  ) => Array<{
    annotator: string;
    answers: {
      entity_recognition: Array<{ text: string; type: string }>;
      relation_identification: Array<{ subj: string; rel: string; obj: string }>;
    };
  }>;
  markSampleSubmitted: (
    taskId: string, role: string, runType: string, sampleId: string,
    payload: unknown, historySummary: string,
    identity: { annotatorId: string; reviewerId?: string }
  ) => void;
  submitArbitration: (
    taskId: string, runType: string, sampleId: string,
    identity: { annotatorId: string; reviewerId: string },
    decisions: Array<{ itemId: string; choice: string; value: unknown; reason: string }>
  ) => void;
  resolveExceptionPoolItem: (
    taskId: string, runType: string, sampleId: string,
    identity: { annotatorId: string }, outKey: string,
    action: string, value: unknown, reason: string
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

// T013 is an ordinary config-driven three-output task. Its first official
// review unit is owned by reviewer_wang; reviewer_chen can arbitrate it.
async function seedMixedSourceUnit(page: Page): Promise<void> {
  await page.evaluate(() => {
    const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData;
    const original = data.getReviewerMockRows('T013', 'absa-001')
      .find((row) => row.annotator === 'kioleemg12');
    if (!original) throw new Error('Missing T013 review unit fixture');
    const annotatorId = 'kioleemg12';
    const sampleId = 'absa-001';
    const annotatorPayload = {
      previewEntities: original.answers.entity_recognition,
      previewTriples: original.answers.relation_identification,
      previewState: {
        multi_dim: { dims: { valence: { value: 3 }, arousal: { value: 6 } } },
      },
    };
    const reviewerPayload = {
      previewEntities: original.answers.entity_recognition.slice(0, -1),
      previewTriples: original.answers.relation_identification,
      previewState: {
        multi_dim: { dims: { valence: { value: 7 }, arousal: { value: 6 } } },
      },
    };
    data.markSampleSubmitted('T013', 'annotator', 'official_run', sampleId,
      annotatorPayload, '', { annotatorId });
    data.markSampleSubmitted('T013', 'reviewer', 'official_run', sampleId,
      reviewerPayload, '', { annotatorId, reviewerId: 'reviewer_wang' });
    data.submitArbitration('T013', 'official_run', sampleId,
      { annotatorId, reviewerId: 'reviewer_chen' }, [
        { itemId: 'multi_dim::valence', choice: 'adopt_b', value: 7,
          reason: 'Synthetic arbitration rationale' },
      ]);
    data.resolveExceptionPoolItem('T013', 'official_run', sampleId,
      { annotatorId }, 'entity_recognition', 'custom_answer',
      [{ text: 'Synthetic Target', type: 'Target' }], 'Synthetic exception rationale');
    const status = data.getReviewUnitStatus('T013', 'official_run', sampleId,
      { annotatorId }, ['entity_recognition', 'relation_identification', 'multi_dim']);
    if (status !== 'finalized') throw new Error(`Mixed-source fixture did not finalize: ${status}`);
  });
  await page.reload();
}

async function seedArbitratedRelationRemoval(page: Page): Promise<void> {
  await page.evaluate(() => {
    const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData;
    const original = data.getReviewerMockRows('T013', 'absa-001')
      .find((row) => row.annotator === 'kioleemg12');
    if (!original) throw new Error('Missing T013 review unit fixture');
    const annotatorId = 'kioleemg12';
    const sampleId = 'absa-001';
    const shared = {
      previewEntities: original.answers.entity_recognition,
      previewState: {
        multi_dim: { dims: { valence: { value: 3 }, arousal: { value: 6 } } },
      },
    };
    data.markSampleSubmitted('T013', 'annotator', 'official_run', sampleId,
      { ...shared, previewTriples: original.answers.relation_identification },
      '', { annotatorId });
    data.markSampleSubmitted('T013', 'reviewer', 'official_run', sampleId,
      { ...shared, previewTriples: original.answers.relation_identification.slice(1) },
      '', { annotatorId, reviewerId: 'reviewer_wang' });
    data.submitArbitration('T013', 'official_run', sampleId,
      { annotatorId, reviewerId: 'reviewer_chen' }, [
        {
          itemId: 'relation_identification::Note 10 plus::has_aspect::過熱問題',
          choice: 'adopt_b', value: null, reason: 'Synthetic relation removal rationale',
        },
      ]);
    const status = data.getReviewUnitStatus('T013', 'official_run', sampleId,
      { annotatorId }, ['entity_recognition', 'relation_identification', 'multi_dim']);
    if (status !== 'finalized') throw new Error(`Relation removal did not finalize: ${status}`);
  });
  await page.reload();
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

test('multi-output unit pairs arbitration and PL sources with their own answer tags', async ({ page }) => {
  const response = await page.goto(buildListUrl({
    task_id: 'T013', role: 'reviewer', run_type: 'official_run', reviewer_id: 'reviewer_wang',
  }));
  expect(response?.status()).toBe(200);
  await seedMixedSourceUnit(page);
  const row = rowFor(page, 'absa-001').filter({ hasText: 'kioleemg12' });
  await expect(row.locator('.status-badge')).toHaveText('已定稿 · 已鎖定');
  await expect(row.getByTestId('list-review-finalization-source-badge')).toHaveCount(2);

  const dimensionAnswer = row.locator('[data-testid="list-review-answer"] [data-output-key="multi_dim"]');
  const dimensionSource = row.locator(
    '[data-testid="list-review-finalization-source-badge"][data-output-key="multi_dim"]'
  );
  const entitySource = row.locator(
    '[data-testid="list-review-finalization-source-badge"][data-output-key="entity_recognition"]'
  );
  await expect(dimensionAnswer).toHaveText('[7, 6]');
  await expect(dimensionSource).toHaveText('仲裁採 B 定稿');
  await expect(entitySource).toHaveText('PL 自訂答案定稿');
  await page.locator('#langToggle').click();
  await expect(dimensionAnswer).toHaveText('[7, 6]');
  await expect(dimensionSource).toHaveText('Finalized by arbitration adopting B');
  await expect(entitySource).toHaveText('Finalized with PL custom answer');
});

test('composite PL value and badge describe the same output in zh and en', async ({ page }) => {
  const response = await page.goto(buildListUrl({
    task_id: 'T013', role: 'reviewer', run_type: 'official_run', reviewer_id: 'reviewer_wang',
  }));
  expect(response?.status()).toBe(200);
  await seedMixedSourceUnit(page);
  const row = rowFor(page, 'absa-001').filter({ hasText: 'kioleemg12' });
  const entityAnswer = row.locator(
    '[data-testid="list-review-answer"] [data-output-key="entity_recognition"]'
  );
  const entitySource = row.locator(
    '[data-testid="list-review-finalization-source-badge"][data-output-key="entity_recognition"]'
  );
  await expect(row.getByTestId('list-review-answer').locator('.annotator-result-tag').first())
    .toHaveText('Synthetic Target(Target)');
  await expect(entityAnswer).toHaveText('Synthetic Target(Target)');
  await expect(entitySource).toHaveText('PL 自訂答案定稿');
  await page.locator('#langToggle').click();
  await expect(entityAnswer).toHaveText('Synthetic Target(Target)');
  await expect(entitySource).toHaveText('Finalized with PL custom answer');
});

test('arbitration adopting B removes only the disputed relation from the finalized list answer', async ({ page }) => {
  const response = await page.goto(buildListUrl({
    task_id: 'T013', role: 'reviewer', run_type: 'official_run', reviewer_id: 'reviewer_wang',
  }));
  expect(response?.status()).toBe(200);
  await seedArbitratedRelationRemoval(page);
  const row = rowFor(page, 'absa-001').filter({ hasText: 'kioleemg12' });
  await expect(row.locator('.status-badge')).toHaveText('已定稿 · 已鎖定');
  const relationAnswer = row.locator(
    '[data-testid="list-review-answer"] [data-output-key="relation_identification"]'
  );
  const relationSource = row.locator(
    '[data-testid="list-review-finalization-source-badge"][data-output-key="relation_identification"]'
  );
  await expect(relationAnswer).not.toContainText('has_aspect-過熱問題');
  await expect(relationAnswer).toContainText('Note 10 plus-has_opinion-嚴重');
  await expect(relationSource).toHaveText('仲裁採 B 定稿');
  await page.locator('#langToggle').click();
  await expect(relationAnswer).not.toContainText('has_aspect-過熱問題');
  await expect(relationAnswer).toContainText('Note 10 plus-has_opinion-嚴重');
  await expect(relationSource).toHaveText('Finalized by arbitration adopting B');
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
