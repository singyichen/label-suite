import { test, expect, type Page } from '@playwright/test';
import path from 'path';

/* issue #581 / OpenSpec change seq-tagging-span-config, FR-003d-3.
   `SPAN_OVERLAP_POLICY_BY_OUTPUT_TYPE` 對 `sequence_tagging` 為 `forbidden`：
   與既有 span 相交的落點被拒絕，僅相鄰（半開區間端點相接）者放行。 */

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

  await page.fill('#taskNameInput', 'issue-581-overlap-rejection');
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

test('an intersecting selection is refused and leaves the span list untouched', async ({
  page,
}) => {
  await goToStep2WithSequenceTagging(page);
  const preview = page.locator('#annotationPreview');

  await dragSelect(page, '台積電');
  await preview.getByRole('button', { name: 'ORG', exact: true }).click();
  expect(await getSpans(page)).toEqual([{ start: 0, end: 3, label: 'ORG' }]);

  await dragSelect(page, '電董事');
  await expect(preview.getByTestId('sequence-span-selection-error')).toBeVisible();

  /* The refused selection is discarded, not banked: assigning a label after it
     must not turn it into a span. */
  await preview.getByRole('button', { name: 'PER', exact: true }).click();
  expect(await getSpans(page)).toEqual([{ start: 0, end: 3, label: 'ORG' }]);
  await expect(preview.getByTestId('sequence-span')).toHaveCount(1);
});

test('a selection fully covered by an existing span is refused with visible feedback that survives a label click', async ({
  page,
}) => {
  /* issue #659: a selection with no character exposed outside the existing
     span (spanAt[i] is defined for every position) previously produced no
     `sequence-span-selection-error` run and no other feedback at all. */
  await goToStep2WithSequenceTagging(page);
  const preview = page.locator('#annotationPreview');

  await dragSelect(page, '台積電');
  await preview.getByRole('button', { name: 'ORG', exact: true }).click();
  expect(await getSpans(page)).toEqual([{ start: 0, end: 3, label: 'ORG' }]);

  await dragSelect(page, '積電');
  await expect(preview.getByTestId('sequence-span-selection-error')).toHaveCount(0);
  await expect(preview.getByTestId('sequence-span-overlap-error')).toBeVisible();
  await expect(
    preview.locator('[data-testid="sequence-span"][data-overlap-blocked="true"]'),
  ).toHaveCount(1);

  /* Clicking a label type must not clear the rejection: it stays visible and
     must not be banked as a new span, until the next selection replaces it. */
  await preview.getByRole('button', { name: 'PER', exact: true }).click();
  await expect(preview.getByTestId('sequence-span-overlap-error')).toBeVisible();
  expect(await getSpans(page)).toEqual([{ start: 0, end: 3, label: 'ORG' }]);
  await expect(preview.getByTestId('sequence-span')).toHaveCount(1);
});

test('an adjacent selection sharing only an endpoint is accepted', async ({ page }) => {
  await goToStep2WithSequenceTagging(page);
  const preview = page.locator('#annotationPreview');

  await dragSelect(page, '台積電');
  await preview.getByRole('button', { name: 'ORG', exact: true }).click();

  await dragSelect(page, '董事');
  await expect(preview.getByTestId('sequence-span-selection-error')).toHaveCount(0);
  await preview.getByRole('button', { name: 'PER', exact: true }).click();

  expect(await getSpans(page)).toEqual([
    { start: 0, end: 3, label: 'ORG' },
    { start: 3, end: 5, label: 'PER' },
  ]);
  await expect(preview.getByTestId('sequence-span')).toHaveCount(2);
});
