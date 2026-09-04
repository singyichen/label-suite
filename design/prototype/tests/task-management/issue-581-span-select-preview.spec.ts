import { test, expect, type Page } from '@playwright/test';
import path from 'path';

/* issue #581 / OpenSpec change seq-tagging-span-config, FR-003d-1.
   `sequence_tagging` 的 Step 2 預覽改為在未切分的原始文本上拖曳圈選，
   產生半開區間 `[start, end)` 的字元 offset。選取吸附只影響落點，
   切換吸附單位 MUST NOT 使既有標記失效、錯位或被清除。 */

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
const EXAMPLE_DATA = path.resolve(__dirname, '../../../../docs/product/example-data');

test.describe.configure({ retries: 2 });

async function goToStep2WithSequenceTagging(page: Page) {
  await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
    null,
    { timeout: 30000 },
  );

  await page.fill('#taskNameInput', 'issue-581-span-select-preview');
  await page.locator('#taskCategoryChips [data-key="sequence"]').click();
  await page.locator('#taskInputTypeChips [data-key="single_item"]').click();
  await page.locator('#taskOutputTypeChips [data-key="sequence_tagging"]').click();

  await page
    .locator('#datasetFileInput')
    .setInputFiles(path.join(EXAMPLE_DATA, 'sequence-tagging.json'));
  await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();
  await page
    .locator('.inline-preview-role-select[aria-label="角色：text"]')
    .selectOption('input');

  await page.evaluate(() => {
    window.revalidateCurrentStep?.();
  });
  await page.waitForTimeout(200);
  await page.locator('#nextBtn').click();
  await expect(page.locator('#step2Panel')).not.toHaveClass(/hidden/);
}

/* Mirrors the drag a user performs: build a DOM Range over the requested
   substring inside the preview text and dispatch the mouseup the renderer
   listens for. */
async function dragSelect(page: Page, text: string) {
  await page.evaluate((selectedText) => {
    const textElement = document.querySelector(
      '#annotationPreview .absa-preview-text',
    );
    if (!textElement) throw new Error('span preview text not found');

    const selectionStart = textElement.textContent?.indexOf(selectedText) ?? -1;
    if (selectionStart < 0) throw new Error(`text not in preview: ${selectedText}`);
    const selectionEnd = selectionStart + selectedText.length;

    const walker = document.createTreeWalker(textElement, NodeFilter.SHOW_TEXT);
    let startNode: Text | null = null;
    let startOffset = 0;
    let endNode: Text | null = null;
    let endOffset = 0;
    let consumed = 0;
    let node = walker.nextNode();
    while (node) {
      const content = node.textContent || '';
      const nodeStart = consumed;
      const nodeEnd = consumed + content.length;
      if (selectionStart >= nodeStart && selectionStart < nodeEnd) {
        startNode = node as Text;
        startOffset = selectionStart - nodeStart;
      }
      if (selectionEnd > nodeStart && selectionEnd <= nodeEnd) {
        endNode = node as Text;
        endOffset = selectionEnd - nodeStart;
      }
      if (startNode && endNode) break;
      consumed = nodeEnd;
      node = walker.nextNode();
    }
    if (!startNode || !endNode) throw new Error(`unable to select: ${selectedText}`);

    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    textElement.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  }, text);
}

async function getSpans(page: Page): Promise<Span[]> {
  return (await page.evaluate(() => {
    const previewState = window.state?.previewState as
      | Record<string, { spans?: Span[] }>
      | undefined;
    return previewState?.sequence_tagging?.spans ?? [];
  })) as Span[];
}

test('sequence_tagging preview drops the token grid and the BIO tag buttons', async ({
  page,
}) => {
  await goToStep2WithSequenceTagging(page);

  const preview = page.locator('#annotationPreview');
  await expect(preview.getByTestId('sequence-source-text-label')).toBeVisible();
  await expect(preview.getByTestId('sequence-token')).toHaveCount(0);
  await expect(
    preview.getByRole('button', { name: /^[BIES]-/ }),
  ).toHaveCount(0);
});

test('character snapping stores the dragged offsets verbatim', async ({ page }) => {
  await goToStep2WithSequenceTagging(page);

  await dragSelect(page, '積電');
  await page
    .locator('#annotationPreview')
    .getByRole('button', { name: 'ORG', exact: true })
    .click();

  expect(await getSpans(page)).toEqual([{ start: 1, end: 3, label: 'ORG' }]);
});

test('switching the snap unit leaves existing spans untouched', async ({ page }) => {
  await goToStep2WithSequenceTagging(page);

  await dragSelect(page, '積電');
  await page
    .locator('#annotationPreview')
    .getByRole('button', { name: 'ORG', exact: true })
    .click();

  await page.getByTestId('sequence-snap-unit-select').selectOption('word');

  expect(await getSpans(page)).toEqual([{ start: 1, end: 3, label: 'ORG' }]);
  await expect(
    page.locator('#annotationPreview').getByTestId('sequence-token-alignment-error'),
  ).toHaveCount(0);
  await expect(page.locator('#nextBtn')).toBeEnabled();
});

/* Intl.Segmenter 的中文詞典不含「台積電」這類專有名詞，故吸附示例採用詞典
   確實合併的「董事長」（offset 3–6）。 */
test('word snapping expands the selection to the segmenter word boundary', async ({
  page,
}) => {
  await goToStep2WithSequenceTagging(page);

  await page.getByTestId('sequence-snap-unit-select').selectOption('word');
  await dragSelect(page, '事長');
  await page
    .locator('#annotationPreview')
    .getByRole('button', { name: 'PER', exact: true })
    .click();

  expect(await getSpans(page)).toEqual([{ start: 3, end: 6, label: 'PER' }]);
});
