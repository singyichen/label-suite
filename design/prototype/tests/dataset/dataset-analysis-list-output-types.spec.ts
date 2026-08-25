/**
 * Traceability: specs/dataset/016-dataset-analysis-list/spec.md
 *   FR-003, FR-004B, FR-004C, FR-005A, FR-005D, FR-007, FR-008, SC-008
 */
import { expect, test, type Locator } from '@playwright/test';

const DATASET_ANALYSIS_URL =
  '/pages/dataset/dataset-analysis-list.html';

const OUTPUT_TYPE_KEYS = [
  'single_label',
  'multi_label',
  'single_dim',
  'multi_dim',
  'sequence_tagging',
  'entity_recognition',
  'relation_identification',
  'free_text',
];

const EXAMPLE_DATA_FILES = [
  'absa-va.json',
  'entity-recognition.json',
  'free-text.json',
  'medical-ner-re.json',
  'mrc.json',
  'multi-dim.json',
  'multi-label-hierarchical.json',
  'multi-label.json',
  'nli.json',
  'relation-identification.json',
  'sequence-tagging.json',
  'single-dim.json',
  'single-label.json',
];

const FILTER_COUNTS: Record<string, number> = {
  single_label: 2,
  multi_label: 2,
  single_dim: 1,
  multi_dim: 2,
  sequence_tagging: 1,
  entity_recognition: 3,
  relation_identification: 3,
  free_text: 2,
};

type DatasetAnalysisListWindow = Window & {
  state: {
    tasks: Array<{
      id: string;
      nameZh: string;
      nameEn: string;
      sourceFile: string;
      outputTypes: string[];
      completionRate: number;
      iaaStatus: string;
      membershipRole: string;
    }>;
  };
  render: () => void;
};

async function visibleSourceFiles(rows: Locator): Promise<string[]> {
  return rows.evaluateAll((elements) =>
    elements
      .map((element) => element.getAttribute('data-source-file'))
      .filter((value): value is string => value !== null),
  );
}

test.describe('Dataset analysis list output-type model', () => {
  test('renders all 13 illustrative example-data rows and exactly eight output filters', async ({
    page,
  }) => {
    await page.goto(DATASET_ANALYSIS_URL);

    await expect(page.locator('#thTaskType')).toHaveText('輸出類型');

    const rows = page.locator('#taskTableBody tr[data-source-file]');
    await expect(rows).toHaveCount(13);
    expect((await visibleSourceFiles(rows)).sort()).toEqual(
      [...EXAMPLE_DATA_FILES].sort(),
    );

    const filter = page.locator('#outputTypeFilter');
    await expect(filter).toHaveAttribute('aria-label', '依輸出類型篩選');
    await expect(filter).toHaveValue('');
    await expect(filter.locator('option[value=""]')).toHaveText(
      '全部輸出類型',
    );
    await expect(filter.locator('option:not([value=""])')).toHaveCount(8);
    expect(
      await filter.locator('option').evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value),
      ),
    ).toEqual(['', ...OUTPUT_TYPE_KEYS]);
  });

  test('renders one read-only tag for every output in composite tasks', async ({
    page,
  }) => {
    await page.goto(DATASET_ANALYSIS_URL);

    const medicalRow = page.locator(
      '#taskTableBody tr[data-source-file="medical-ner-re.json"]',
    );
    await expect(medicalRow.locator('.output-type-tag')).toHaveText([
      '實體辨識',
      '關係識別',
    ]);

    const absaRow = page.locator(
      '#taskTableBody tr[data-source-file="absa-va.json"]',
    );
    await expect(absaRow.locator('.output-type-tag')).toHaveText([
      '實體辨識',
      '關係識別',
      '多維度',
    ]);

    for (const tag of await absaRow.locator('.output-type-tag').all()) {
      await expect(tag).not.toHaveAttribute('role', 'button');
      await expect(tag).not.toHaveAttribute('tabindex');
    }
  });

  test('uses output membership semantics for every canonical filter', async ({
    page,
  }) => {
    await page.goto(DATASET_ANALYSIS_URL);

    const filter = page.locator('#outputTypeFilter');
    const rows = page.locator('#taskTableBody tr[data-source-file]');

    for (const [outputType, count] of Object.entries(FILTER_COUNTS)) {
      await filter.selectOption(outputType);
      await expect(rows).toHaveCount(count);
    }
  });

  test('keeps composite rows when one of their outputs matches the filter', async ({
    page,
  }) => {
    await page.goto(DATASET_ANALYSIS_URL);

    const filter = page.locator('#outputTypeFilter');
    const rows = page.locator('#taskTableBody tr[data-source-file]');

    await filter.selectOption('entity_recognition');
    expect(await visibleSourceFiles(rows)).toEqual([
      'entity-recognition.json',
      'medical-ner-re.json',
      'absa-va.json',
    ]);

    await filter.selectOption('relation_identification');
    expect(await visibleSourceFiles(rows)).toEqual([
      'relation-identification.json',
      'medical-ner-re.json',
      'absa-va.json',
    ]);

    await filter.selectOption('multi_dim');
    expect(await visibleSourceFiles(rows)).toEqual([
      'multi-dim.json',
      'absa-va.json',
    ]);
  });

  test('renders and filters a fourteenth legal output composition without a task-specific renderer', async ({
    page,
  }) => {
    await page.goto(DATASET_ANALYSIS_URL);

    await page.evaluate(() => {
      const datasetWindow = window as unknown as DatasetAnalysisListWindow;
      datasetWindow.state.tasks.push({
        id: 'EX014',
        nameZh: '分類附理由分析',
        nameEn: 'Classification with rationale analysis',
        sourceFile: 'synthetic-fourteenth.json',
        outputTypes: ['single_label', 'free_text'],
        completionRate: 33,
        iaaStatus: 'not_started',
        membershipRole: 'reviewer',
      });
      datasetWindow.render();
    });

    const row = page.locator(
      '#taskTableBody tr[data-source-file="synthetic-fourteenth.json"]',
    );
    await expect(row).toBeVisible();
    await expect(row.locator('.output-type-tag')).toHaveText([
      '單一標籤',
      '自由文字',
    ]);

    await page.locator('#outputTypeFilter').selectOption('free_text');
    await expect(row).toBeVisible();
  });

  test('updates the output filter and tags to their English peer labels', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
    });
    await page.goto(DATASET_ANALYSIS_URL);

    await expect(page.locator('#thTaskType')).toHaveText('Output types');
    await expect(page.locator('#outputTypeFilter')).toHaveAttribute(
      'aria-label',
      'Filter by output type',
    );
    await expect(page.locator('#outputTypeFilter option')).toHaveText([
      'All output types',
      'Single label',
      'Multi-label',
      'Single dimension',
      'Multi-dimension',
      'Sequence Tagging',
      'Entity Recognition',
      'Relation Identification',
      'Free text',
    ]);

    await expect(
      page
        .locator(
          '#taskTableBody tr[data-source-file="medical-ner-re.json"]',
        )
        .locator('.output-type-tag'),
    ).toHaveText(['Entity Recognition', 'Relation Identification']);
  });

  test('wraps three output tags without whole-page overflow at required viewports', async ({
    page,
  }) => {
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(DATASET_ANALYSIS_URL);

      const tagGroup = page
        .locator('#taskTableBody tr[data-source-file="absa-va.json"]')
        .locator('.output-type-tags');
      await expect(tagGroup.locator('.output-type-tag')).toHaveCount(3);
      await expect(tagGroup).toHaveCSS('flex-wrap', 'wrap');

      const tagDimensions = await tagGroup.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      expect(tagDimensions.scrollWidth).toBeLessThanOrEqual(
        tagDimensions.clientWidth,
      );

      const pageDimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(pageDimensions.scrollWidth).toBeLessThanOrEqual(
        pageDimensions.clientWidth,
      );
    }
  });

  test('shows a distinct error state when the external data module fails to load', async ({
    page,
  }) => {
    await page.route('**/dataset-analysis-list.data.js', (route) =>
      route.abort('failed'),
    );
    await page.goto(DATASET_ANALYSIS_URL);

    await expect(page.locator('#thTaskName')).toBeVisible();
    const errorRow = page.locator('#taskTableBody tr.error-row');
    await expect(errorRow).toContainText('資料集分析載入失敗');
    await expect(errorRow.getByRole('button', { name: '重試' })).toBeVisible();
    await expect(page.locator('#taskTableBody tr.empty-row')).toHaveCount(0);
    await expect(errorRow).not.toContainText('尚無可分析的任務');
    await expect(page.locator('#paginationBar')).toBeHidden();
  });
});
