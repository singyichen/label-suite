import { test, expect, type Page } from '@playwright/test';

/* issue #581 / OpenSpec change seq-tagging-span-config, FR-003d-2.
   `sequence_tagging` 的預標記改以 offset span 陣列載入：不再比對 token 與
   標記的數量，落在文本範圍外的 span 個別列入錯誤清單但 MUST NOT 阻擋前進。 */

declare global {
  interface Window {
    state?: Record<string, unknown>;
    revalidateCurrentStep?: () => void;
  }
}

interface Span {
  start: number;
  end: number;
  label: string;
}

const TASK_NEW_URL = '/pages/task-management/task-new.html';
/* 20 個字元：台0 積1 電2 董3 事4 長5 今6 天7 出8 席9 台10 北11 國12 際13 論14 壇15 活16 動17 現18 場19 */
const TEXT = '台積電董事長今天出席台北國際論壇活動現場';

test.describe.configure({ retries: 2 });

async function goToStep2WithSpans(page: Page, spans: Span[]) {
  await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
    null,
    { timeout: 30000 },
  );

  await page.fill('#taskNameInput', 'issue-581-span-prefill');
  await page.locator('#taskCategoryChips [data-key="sequence"]').click();
  await page.locator('#taskInputTypeChips [data-key="single_item"]').click();
  await page.locator('#taskOutputTypeChips [data-key="sequence_tagging"]').click();

  await page.locator('#datasetFileInput').setInputFiles({
    name: 'synthetic-sequence-spans.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify([{ id: 'span-prefill-001', text: TEXT, spans }]),
    ),
  });
  await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();
  await page
    .locator('.inline-preview-role-select[aria-label="角色：text"]')
    .selectOption('input');
  await page
    .locator('.inline-preview-role-select[aria-label="角色：spans"]')
    .selectOption('output');

  await page.evaluate(() => {
    window.revalidateCurrentStep?.();
  });
  await page.waitForTimeout(200);
  await page.locator('#nextBtn').click();
  await expect(page.locator('#step2Panel')).not.toHaveClass(/hidden/);
}

async function getSpans(page: Page): Promise<Span[]> {
  return (await page.evaluate(() => {
    const previewState = window.state?.previewState as
      | Record<string, { spans?: Span[] }>
      | undefined;
    return previewState?.sequence_tagging?.spans ?? [];
  })) as Span[];
}

test('in-range offset spans land verbatim without any count check', async ({
  page,
}) => {
  await goToStep2WithSpans(page, [
    { start: 0, end: 3, label: 'ORG' },
    { start: 3, end: 6, label: 'PER' },
    { start: 10, end: 12, label: 'LOC' },
  ]);

  expect(await getSpans(page)).toEqual([
    { start: 0, end: 3, label: 'ORG' },
    { start: 3, end: 6, label: 'PER' },
    { start: 10, end: 12, label: 'LOC' },
  ]);

  const preview = page.locator('#annotationPreview');
  await expect(preview.getByTestId('sequence-span')).toHaveCount(3);
  await expect(preview.getByTestId('sequence-span-prefill-error')).toHaveCount(0);
  await expect(preview.getByTestId('sequence-token-alignment-error')).toHaveCount(0);
  await expect(page.locator('#nextBtn')).toBeEnabled();
});

test('an out-of-range span is listed as an error while the rest still load', async ({
  page,
}) => {
  await goToStep2WithSpans(page, [
    { start: 0, end: 3, label: 'ORG' },
    { start: 3, end: 6, label: 'PER' },
    { start: 18, end: 25, label: 'LOC' },
  ]);

  expect(await getSpans(page)).toEqual([
    { start: 0, end: 3, label: 'ORG' },
    { start: 3, end: 6, label: 'PER' },
  ]);

  const preview = page.locator('#annotationPreview');
  await expect(preview.getByTestId('sequence-span')).toHaveCount(2);
  const prefillError = preview.getByTestId('sequence-span-prefill-error');
  await expect(prefillError).toHaveCount(1);
  await expect(prefillError).toContainText('18');
  await expect(prefillError).toContainText('25');
  await expect(page.locator('#nextBtn')).toBeEnabled();
});

test('an empty span array renders the text with no error and does not block', async ({
  page,
}) => {
  await goToStep2WithSpans(page, []);

  expect(await getSpans(page)).toEqual([]);

  const preview = page.locator('#annotationPreview');
  await expect(preview.getByTestId('sequence-source-text')).toHaveText(TEXT);
  await expect(preview.locator('.absa-preview-text')).toBeVisible();
  await expect(preview.getByTestId('sequence-token')).toHaveCount(0);
  await expect(preview.getByTestId('sequence-span-prefill-error')).toHaveCount(0);
  await expect(page.locator('#nextBtn')).toBeEnabled();
});
