import { expect, test } from '@playwright/test';

const DATASET_ANALYSIS_URL = '/pages/dataset/dataset-analysis-list.html';

const OUTPUT_TYPE_KEYS = [
  'single_label',
  'multi_label',
  'single_dim',
  'multi_dim',
  'sequence_tagging',
  'entity_recognition',
  'relation_identification',
  'free_text',
] as const;

const OUTPUT_TYPE_LABELS_ZH = [
  '單一標籤',
  '多標籤',
  '單維度',
  '多維度',
  '序列標註',
  '實體辨識',
  '關係識別',
  '自由文字',
] as const;

const OUTPUT_FILTER_COUNTS: Record<(typeof OUTPUT_TYPE_KEYS)[number], number> = {
  single_label: 2,
  multi_label: 2,
  single_dim: 1,
  multi_dim: 2,
  sequence_tagging: 1,
  entity_recognition: 3,
  relation_identification: 3,
  free_text: 2,
};

const IAA_FILTER_COUNTS = {
  pass: 6,
  pending: 3,
  fail: 2,
  not_started: 2,
} as const;

type DatasetAnalysisTask = {
  id: string;
  nameZh: string;
  nameEn: string;
  outputTypes: string[];
  completionRate: number;
  iaaStatus: string;
  membershipRole: string;
};

type DatasetAnalysisState = {
  tasks: DatasetAnalysisTask[];
  keyword: string;
  outputType: string;
  iaaStatus: string;
  limit: number;
  offset: number;
};

type DatasetAnalysisWindow = Window & {
  state: DatasetAnalysisState;
  render: () => void;
};

test.describe('Dataset analysis list filters and pagination', () => {
  test('provides the canonical output filter, 13 initial rows, and footer pagination controls', async ({
    page,
  }) => {
    await page.goto(DATASET_ANALYSIS_URL);

    const outputTypeFilter = page.locator('#outputTypeFilter');
    await expect(outputTypeFilter).toBeVisible();
    await expect(page.locator('#iaaStatusFilter')).toBeVisible();
    await expect(page.locator('#searchInput')).toBeVisible();

    const outputOptions = outputTypeFilter.locator('option');
    await expect(outputOptions).toHaveCount(9);
    expect(
      await outputOptions.evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value),
      ),
    ).toEqual(['', ...OUTPUT_TYPE_KEYS]);
    await expect(outputOptions).toHaveText([
      '全部輸出類型',
      ...OUTPUT_TYPE_LABELS_ZH,
    ]);

    await expect(page.locator('#taskTableBody tr')).toHaveCount(13);
    await expect(page.locator('#paginationBar')).toBeVisible();
    await expect(page.locator('#paginationInfo')).toHaveText(
      '共 13 筆 · 第 1 / 1 頁',
    );

    await expect(page.locator('#pageSizeSelect option')).toHaveText([
      '20 筆/頁',
      '50 筆/頁',
      '100 筆/頁',
    ]);
  });

  test('filters by outputs membership for every canonical output type', async ({
    page,
  }) => {
    await page.goto(DATASET_ANALYSIS_URL);

    const outputTypeFilter = page.locator('#outputTypeFilter');
    const rows = page.locator('#taskTableBody tr');

    for (const outputType of OUTPUT_TYPE_KEYS) {
      await outputTypeFilter.selectOption(outputType);
      await expect(rows).toHaveCount(OUTPUT_FILTER_COUNTS[outputType]);
    }
  });

  test('preserves the documented IAA and membership-role distribution', async ({
    page,
  }) => {
    await page.goto(DATASET_ANALYSIS_URL);

    const iaaStatusFilter = page.locator('#iaaStatusFilter');
    const rows = page.locator('#taskTableBody tr');

    for (const [status, count] of Object.entries(IAA_FILTER_COUNTS)) {
      await iaaStatusFilter.selectOption(status);
      await expect(rows).toHaveCount(count);
    }

    await iaaStatusFilter.selectOption('');
    await expect(
      page.locator('#taskTableBody .role-cell', {
        hasText: '專案負責人',
      }),
    ).toHaveCount(6);
    await expect(
      page.locator('#taskTableBody .role-cell', { hasText: '審核員' }),
    ).toHaveCount(7);
  });

  test('keeps annotator-only tasks out of the analysis list', async ({
    page,
  }) => {
    await page.goto(DATASET_ANALYSIS_URL);

    await page.evaluate(() => {
      const runtime = window as unknown as DatasetAnalysisWindow;
      const seed = runtime.state.tasks[0];
      runtime.state.tasks.push({
        ...seed,
        id: 'ANNOTATOR-ONLY',
        nameZh: '僅標記員可見任務',
        nameEn: 'Annotator-only task',
        membershipRole: 'annotator',
      });
      runtime.render();
    });

    await expect(page.locator('#taskTableBody')).not.toContainText(
      '僅標記員可見任務',
    );
    await expect(page.locator('#taskTableBody tr.task-row')).toHaveCount(13);
  });

  test('keeps the no-membership empty state distinct from load failure', async ({
    page,
  }) => {
    await page.goto(`${DATASET_ANALYSIS_URL}?view=empty`);

    await expect(page.locator('#taskTableBody tr.empty-row')).toContainText(
      '尚無可分析的任務',
    );
    await expect(page.locator('#taskTableBody tr.error-row')).toHaveCount(0);
    await expect(page.locator('#paginationBar')).toBeHidden();
  });

  test('treats a valid annotator-only response as empty instead of a load error', async ({
    page,
  }) => {
    await page.route('**/dataset-analysis-list.data.js', async (route) => {
      const response = await route.fetch();
      const body = (await response.text()).replace(
        /membershipRole: '(?:project_leader|reviewer)'/g,
        "membershipRole: 'annotator'",
      );
      await route.fulfill({ response, body });
    });

    await page.goto(DATASET_ANALYSIS_URL);

    await expect(page.locator('#taskTableBody tr.empty-row')).toContainText(
      '尚無可分析的任務',
    );
    await expect(page.locator('#taskTableBody tr.error-row')).toHaveCount(0);
    await expect(page.locator('#paginationBar')).toBeHidden();
  });

  test('search matches output raw keys and the current locale display labels', async ({
    page,
  }) => {
    await page.goto(DATASET_ANALYSIS_URL);

    const rows = page.locator('#taskTableBody tr');
    const searchInput = page.locator('#searchInput');

    await searchInput.fill('relation_identification');
    await expect(rows).toHaveCount(3);

    await searchInput.fill('關係識別');
    await expect(rows).toHaveCount(3);

    await searchInput.fill('multi_dim');
    await expect(rows).toHaveCount(2);

    await searchInput.fill('多維度');
    await expect(rows).toHaveCount(2);

    await searchInput.fill('Single dimension');
    await expect(page.locator('#taskTableBody tr.task-row')).toHaveCount(0);

    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
    });
    await page.reload();

    await page.locator('#searchInput').fill('Single dimension');
    await expect(page.locator('#taskTableBody tr.task-row')).toHaveCount(1);

    await page.locator('#searchInput').fill('單維度');
    await expect(page.locator('#taskTableBody tr.task-row')).toHaveCount(0);
  });

  test('uses outputTypes, limit, and offset in runtime state and limits numbered pagination buttons', async ({
    page,
  }) => {
    await page.goto(DATASET_ANALYSIS_URL);

    const initialContract = await page.evaluate(() => {
      const runtime = window as unknown as DatasetAnalysisWindow;
      return {
        taskCount: runtime.state.tasks.length,
        everyTaskHasOutputTypes: runtime.state.tasks.every((task) =>
          Array.isArray(task.outputTypes),
        ),
        tasksWithLegacyTaskType: runtime.state.tasks.filter((task) =>
          Object.prototype.hasOwnProperty.call(task, 'taskType'),
        ).length,
        limit: runtime.state.limit,
        offset: runtime.state.offset,
        hasLegacyPage: Object.prototype.hasOwnProperty.call(
          runtime.state,
          'page',
        ),
        hasLegacyPageSize: Object.prototype.hasOwnProperty.call(
          runtime.state,
          'pageSize',
        ),
      };
    });

    expect(initialContract).toEqual({
      taskCount: 13,
      everyTaskHasOutputTypes: true,
      tasksWithLegacyTaskType: 0,
      limit: 20,
      offset: 0,
      hasLegacyPage: false,
      hasLegacyPageSize: false,
    });

    await page.evaluate(() => {
      const runtime = window as unknown as DatasetAnalysisWindow;
      const seed = runtime.state.tasks[0];
      runtime.state.tasks = Array.from({ length: 240 }, (_, index) => ({
        ...seed,
        id: `PX-${index + 1}`,
        nameZh: `大量資料集分析 ${index + 1}`,
        nameEn: `Large Dataset Analysis ${index + 1}`,
      }));
      runtime.state.limit = 20;
      runtime.state.offset = 100;
      runtime.render();
    });

    const numberedButtons = page.locator(
      '#paginationControls [data-page]',
    );
    await expect(numberedButtons).toHaveCount(7);
    await expect(numberedButtons.first()).toHaveText('1');
    await expect(numberedButtons.last()).toHaveText('12');
    await expect(
      page.locator('#paginationControls [data-page].active'),
    ).toHaveText('6');
  });

  test('restores output_type, limit, and offset and normalizes invalid or legacy query parameters', async ({
    page,
  }) => {
    await page.goto(
      `${DATASET_ANALYSIS_URL}?output_type=multi_dim&iaa_status=pending&limit=50&offset=0`,
    );

    await expect(page.locator('#outputTypeFilter')).toHaveValue('multi_dim');
    await expect(page.locator('#iaaStatusFilter')).toHaveValue('pending');
    await expect(page.locator('#pageSizeSelect')).toHaveValue('50');
    expect(
      await page.evaluate(() => {
        const runtime = window as unknown as DatasetAnalysisWindow;
        return {
          outputType: runtime.state.outputType,
          limit: runtime.state.limit,
          offset: runtime.state.offset,
        };
      }),
    ).toEqual({ outputType: 'multi_dim', limit: 50, offset: 0 });

    await page.goto(
      `${DATASET_ANALYSIS_URL}?limit=20&offset=5`,
    );
    expect(
      await page.evaluate(() => {
        const runtime = window as unknown as DatasetAnalysisWindow;
        return {
          limit: runtime.state.limit,
          offset: runtime.state.offset,
        };
      }),
    ).toEqual({ limit: 20, offset: 5 });
    await expect(page).toHaveURL(/offset=5/);

    await page.goto(
      `${DATASET_ANALYSIS_URL}?output_type=unsupported&limit=50junk&offset=-20&task_type=sequence_labeling&page=2&page_size=100`,
    );

    await expect(page.locator('#outputTypeFilter')).toHaveValue('');
    await expect(page.locator('#pageSizeSelect')).toHaveValue('20');

    const normalized = new URL(page.url()).searchParams;
    expect(normalized.has('output_type')).toBe(false);
    expect(normalized.has('limit')).toBe(false);
    expect(normalized.has('offset')).toBe(false);
    expect(normalized.has('task_type')).toBe(false);
    expect(normalized.has('page')).toBe(false);
    expect(normalized.has('page_size')).toBe(false);
  });

  test('syncs output_type, limit, and offset while resetting offset after filter or limit changes', async ({
    page,
  }) => {
    await page.goto(DATASET_ANALYSIS_URL);

    await page.evaluate(() => {
      const runtime = window as unknown as DatasetAnalysisWindow;
      const seed = runtime.state.tasks[0];
      runtime.state.tasks = Array.from({ length: 60 }, (_, index) => ({
        ...seed,
        id: `URL-${index + 1}`,
        nameZh: `網址狀態任務 ${index + 1}`,
        nameEn: `URL State Task ${index + 1}`,
        outputTypes: ['entity_recognition'],
      }));
      runtime.state.limit = 20;
      runtime.state.offset = 0;
      runtime.render();
    });

    await page.locator('#nextPageBtn').click();
    await expect(page).toHaveURL(/offset=20/);

    await page
      .locator('#outputTypeFilter')
      .selectOption('entity_recognition');
    await expect(page).toHaveURL(/output_type=entity_recognition/);
    expect(new URL(page.url()).searchParams.has('offset')).toBe(false);
    expect(
      await page.evaluate(() => {
        const runtime = window as unknown as DatasetAnalysisWindow;
        return runtime.state.offset;
      }),
    ).toBe(0);

    await page.locator('#nextPageBtn').click();
    await expect(page).toHaveURL(/offset=20/);

    await page.locator('#pageSizeSelect').selectOption('50');
    await expect(page).toHaveURL(/limit=50/);
    expect(new URL(page.url()).searchParams.has('offset')).toBe(false);
    expect(
      await page.evaluate(() => {
        const runtime = window as unknown as DatasetAnalysisWindow;
        return {
          limit: runtime.state.limit,
          offset: runtime.state.offset,
        };
      }),
    ).toEqual({ limit: 50, offset: 0 });

    const finalParams = new URL(page.url()).searchParams;
    expect(finalParams.has('task_type')).toBe(false);
    expect(finalParams.has('page')).toBe(false);
    expect(finalParams.has('page_size')).toBe(false);
  });

  test('debounces keyword search before syncing the URL', async ({
    page,
  }) => {
    await page.goto(DATASET_ANALYSIS_URL);

    await page.locator('#searchInput').fill('entity_recognition');
    await expect(page).not.toHaveURL(/keyword=entity_recognition/);

    await page.waitForTimeout(350);
    await expect(page).toHaveURL(/keyword=entity_recognition/);

    const params = new URL(page.url()).searchParams;
    expect(params.has('task_type')).toBe(false);
    expect(params.has('page')).toBe(false);
    expect(params.has('page_size')).toBe(false);
  });
});
