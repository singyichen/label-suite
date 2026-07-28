import { expect, test, type Page } from '@playwright/test';

const TASK_NEW_URL = '/pages/task-management/task-new.html';

interface FreeTextRow {
  id: string;
  text: string;
  reference: string;
  answer: string;
}

const COMPLETE_ROWS: FreeTextRow[] = [
  {
    id: 'row-001',
    text: '研究團隊發表一項虛構的城市樹木調查。',
    reference: '調查涵蓋三個虛構行政區。',
    answer: '研究團隊完成城市樹木調查。',
  },
  {
    id: 'row-002',
    text: '虛構社區中心推出夜間閱讀活動。',
    reference: '活動每週三舉行。',
    answer: '社區中心推出每週夜間閱讀活動。',
  },
  {
    id: 'row-003',
    text: '虛構學校增設雨水回收設備。',
    reference: '設備供校園澆灌使用。',
    answer: '學校以雨水回收設備支援校園澆灌。',
  },
];

async function setupFreeTextStep1(page: Page, rows: FreeTextRow[]) {
  await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
    null,
    { timeout: 30_000 },
  );

  await page.fill('#taskNameInput', '自由文字指示測試');
  await page.locator('#taskCategoryChips [data-key="generation"]').click();
  await page.locator('#taskInputTypeChips [data-key="single_item"]').click();
  await page.locator('#taskOutputTypeChips [data-key="free_text"]').click();
  await page.locator('#datasetFileInput').setInputFiles({
    name: 'synthetic-free-text.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(rows)),
  });
  await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();

  await page
    .locator('.inline-preview-role-select[aria-label="角色：text"]')
    .selectOption('input');
  await page
    .locator('.inline-preview-role-select[aria-label="角色：reference"]')
    .selectOption('evidence');
  await page
    .locator('.inline-preview-role-select[aria-label="角色：answer"]')
    .selectOption('output');
}

async function openFreeTextStep2(page: Page, rows = COMPLETE_ROWS) {
  await setupFreeTextStep1(page, rows);
  await page.locator('#nextBtn').click();
  await expect(page.locator('#step2Panel')).not.toHaveClass(/hidden/);
}

function fieldHeader(page: Page, fieldName: string) {
  return page.locator('.inline-preview-col-header').filter({
    has: page.locator(
      `.inline-preview-role-select[aria-label="角色：${fieldName}"]`,
    ),
  });
}

test.describe('Free-text task guidance and Evidence completeness', () => {
  test('complete Evidence shows a per-field success result', async ({ page }) => {
    await setupFreeTextStep1(page, COMPLETE_ROWS);

    const feedback = fieldHeader(page, 'reference').getByTestId(
      'field-role-feedback',
    );
    await expect(feedback).toHaveClass(/note-ok/);
    await expect(feedback).toHaveAttribute('data-field-name', 'reference');
    await expect(feedback).toContainText('全部 3 筆有值');
    await expect(page.locator('#nextBtn')).toBeEnabled();
  });

  test('missing Evidence identifies the record, blocks Next, and clears when unused', async ({
    page,
  }) => {
    const rowsWithMissingEvidence = COMPLETE_ROWS.map((row) => ({ ...row }));
    rowsWithMissingEvidence[2].reference = ' ';
    await setupFreeTextStep1(page, rowsWithMissingEvidence);

    const evidenceHeader = fieldHeader(page, 'reference');
    const feedback = evidenceHeader.getByTestId('field-role-feedback');
    await expect(feedback).toHaveClass(/note-error/);
    await expect(feedback).toContainText('1/3 筆缺值');
    await expect(feedback).toContainText('row-003');
    await expect(page.locator('#errInlineFieldCount')).toContainText(
      'Evidence 欄位「reference」有 1 筆缺值',
    );
    await expect(page.locator('#nextBtn')).toBeDisabled();

    await evidenceHeader
      .locator('.inline-preview-role-select')
      .selectOption('');
    await expect(fieldHeader(page, 'reference').getByTestId('field-role-feedback')).toHaveCount(0);
    await expect(page.locator('#errInlineFieldCount')).not.toHaveClass(/show/);
    await expect(page.locator('#nextBtn')).toBeEnabled();
  });

  test('editable input and response instructions update preview and config', async ({
    page,
  }) => {
    await openFreeTextStep2(page);

    const inputInstruction = page.getByTestId(
      'free-text-input-instruction-input',
    );
    const outputInstruction = page.getByTestId(
      'free-text-output-instruction-input',
    );
    await expect(inputInstruction).toHaveValue('請閱讀以下內容');
    await expect(outputInstruction).toHaveValue('請輸入回答');

    await inputInstruction.fill('請閱讀以下文章並掌握重點');
    await outputInstruction.fill('請用一句話摘要文章重點');

    await expect(
      page.getByTestId('free-text-input-instruction'),
    ).toHaveText('請閱讀以下文章並掌握重點');
    await expect(
      page.getByTestId('free-text-output-instruction'),
    ).toHaveText('請用一句話摘要文章重點');
    await expect(
      page.locator('#annotationPreview').getByText('text', { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.locator('#annotationPreview').getByText('answer', { exact: true }),
    ).toHaveCount(0);

    const freeTextConfig = await page.evaluate(() => {
      const currentWindow = window as typeof window & {
        state: {
          outputConfigs: Record<string, Record<string, unknown>>;
        };
      };
      return currentWindow.state.outputConfigs.free_text;
    });
    expect(freeTextConfig.input_instruction).toBe(
      '請閱讀以下文章並掌握重點',
    );
    expect(freeTextConfig.output_instruction).toBe(
      '請用一句話摘要文章重點',
    );

    const code = await page.locator('#codeEditor').inputValue();
    expect(code).toContain('input_instruction: 請閱讀以下文章並掌握重點');
    expect(code).toContain('output_instruction: 請用一句話摘要文章重點');

    await inputInstruction.fill('   ');
    await expect(page.locator('#nextBtn')).toBeDisabled();
    await inputInstruction.fill('請閱讀以下文章並掌握重點');
    await expect(page.locator('#nextBtn')).toBeEnabled();
  });

  test('legacy free-text config receives instruction defaults on import', async ({
    page,
  }) => {
    await openFreeTextStep2(page);

    const legacyConfig = {
      input_type: 'single_item',
      outputs: [
        {
          type: 'free_text',
          config: {
            max_length: 512,
            show_reference: false,
            allow_bypass: true,
          },
        },
      ],
    };
    await page.locator('#codeEditor').fill(JSON.stringify(legacyConfig));
    await page.locator('#saveCodeBtn').click();

    await expect(
      page.getByTestId('free-text-input-instruction-input'),
    ).toHaveValue('請閱讀以下內容');
    await expect(
      page.getByTestId('free-text-output-instruction-input'),
    ).toHaveValue('請輸入回答');
    await expect(page.locator('#schemaFields')).not.toContainText(
      '顯示參考答案給標記者',
    );
    await expect(page.locator('#nextBtn')).toBeEnabled();

    const normalizedConfig = await page.evaluate(() => {
      const currentWindow = window as typeof window & {
        state: {
          outputConfigs: Record<string, Record<string, unknown>>;
        };
      };
      return currentWindow.state.outputConfigs.free_text;
    });
    expect(normalizedConfig.input_instruction).toBe('請閱讀以下內容');
    expect(normalizedConfig.output_instruction).toBe('請輸入回答');
    expect(normalizedConfig.show_reference).toBeUndefined();
    const normalizedCode = await page.locator('#codeEditor').inputValue();
    expect(normalizedCode).toContain('input_instruction');
    expect(normalizedCode).not.toContain('show_reference');
  });

  test('free-text bypass leaves source content available and disables only the response area', async ({
    page,
  }) => {
    await openFreeTextStep2(page);

    await page
      .locator('#annotationPreview')
      .getByRole('button', { name: '無法判定 (Bypass)' })
      .click();

    await expect(
      page.getByTestId('free-text-input-instruction'),
    ).not.toHaveCSS('pointer-events', 'none');
    await expect(page.getByTestId('free-text-input-content')).not.toHaveCSS(
      'opacity',
      '0.45',
    );
    await expect(page.getByTestId('free-text-response-area')).toHaveCSS(
      'pointer-events',
      'none',
    );
    await expect(page.getByTestId('free-text-response-area')).toHaveCSS(
      'opacity',
      '0.45',
    );
  });

  test('code import preserves and blocks a free-text instruction over 100 characters', async ({
    page,
  }) => {
    await openFreeTextStep2(page);
    const overLimit = '長'.repeat(101);
    const invalidConfig = {
      input_type: 'single_item',
      outputs: [
        {
          type: 'free_text',
          config: {
            input_instruction: overLimit,
            output_instruction: '請輸入回答',
            max_length: 512,
            allow_bypass: true,
          },
        },
      ],
    };
    await page.locator('#codeEditor').fill(JSON.stringify(invalidConfig));
    await page.locator('#saveCodeBtn').click();

    await expect(
      page.getByTestId('free-text-input-instruction-input'),
    ).toHaveValue(overLimit);
    await expect(page.locator('#nextBtn')).toBeDisabled();
    await expect(page.locator('#errSchema')).toContainText('100');
  });

  test('untouched free-text instruction defaults follow the selected language', async ({
    page,
  }) => {
    await openFreeTextStep2(page);

    await page.locator('#langToggle').click();

    await expect(
      page.getByTestId('free-text-input-instruction-input'),
    ).toHaveValue('Read the following content');
    await expect(
      page.getByTestId('free-text-output-instruction-input'),
    ).toHaveValue('Enter your response');
    await expect(
      page.getByTestId('free-text-input-instruction'),
    ).toHaveText('Read the following content');
    await expect(
      page.getByTestId('free-text-output-instruction'),
    ).toHaveText('Enter your response');
  });
});
