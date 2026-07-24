import { expect, test, type Page } from '@playwright/test';
import path from 'path';

declare global {
  interface Window {
    state?: Record<string, unknown>;
    revalidateCurrentStep?: () => void;
  }
}

interface TaxonomyNode {
  id: string;
  name: string;
  color?: string;
  children?: TaxonomyNode[];
}

const TASK_NEW_URL = '/pages/task-management/task-new.html';
const EXAMPLE_DATA = path.resolve(__dirname, '../../../../docs/product/example-data');

async function setupHierarchicalMultiLabel(page: Page) {
  await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
  );
  await page.fill('#taskNameInput', 'hierarchical-taxonomy-preview');
  await page.locator('#taskCategoryChips [data-key="classification"]').click();
  await page.locator('#taskInputTypeChips [data-key="single_item"]').click();
  await page.locator('#taskOutputTypeChips [data-key="multi_label"]').click();
  await page.locator('#datasetFileInput').setInputFiles(
    path.join(EXAMPLE_DATA, 'multi-label-hierarchical.json'),
  );
  await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();
  await page
    .locator('.inline-preview-role-select[aria-label$="text"]')
    .selectOption('input');
  await page
    .locator('.inline-preview-role-select[aria-label$="gold_labels"]')
    .selectOption('output');
  await page.evaluate(() => window.revalidateCurrentStep?.());
  await page.locator('#nextBtn').click();
  await expect(page.locator('#step2Panel')).not.toHaveClass(/hidden/);
}

test.describe('SC-003q–u hierarchical multi-label taxonomy prototype', () => {
  test('makes every taxonomy level independently selectable while retaining paths', async ({ page }) => {
    await setupHierarchicalMultiLabel(page);

    const editor = page.getByTestId('taxonomy-tree-editor');
    await expect(editor).toBeVisible();
    await expect(editor.getByRole('treeitem')).toHaveCount(13);
    await expect(editor.getByRole('treeitem', { name: /emotion/ })).toBeVisible();
    await expect(editor.getByRole('treeitem', { name: /care_context/ })).toBeVisible();

    const selectedPaths = page.getByTestId('taxonomy-selected-path');
    await expect(selectedPaths).toHaveCount(2);
    await expect(selectedPaths.nth(0)).toHaveText('sad');
    await expect(selectedPaths.nth(1)).toHaveText('urgent');
    await expect(selectedPaths.nth(0).getByRole('button')).toHaveAttribute(
      'aria-label',
      '移除 emotion / negative / sad',
    );
    expect(
      await page.evaluate(() => {
        const prototypeState = window.state as {
          previewState?: {
            multi_label?: { selected?: string[][] };
          };
        } | undefined;
        return prototypeState?.previewState?.multi_label?.selected;
      }),
    ).toEqual([
      ['emotion', 'negative', 'sad'],
      ['care_context', 'clinical', 'urgent'],
    ]);

    await page.getByTestId('taxonomy-selector-trigger').click();
    const selector = page.getByTestId('taxonomy-selector-dialog');
    await expect(selector).toBeVisible();
    await expect(selector.getByTestId('taxonomy-preview-option')).toHaveCount(13);
    /* Flattened list: no per-branch disclosure, no ancestor-path captions, no tree ARIA */
    await expect(
      selector.locator('[data-testid="taxonomy-preview-branch"]'),
    ).toHaveCount(0);
    await expect(selector.locator('.taxonomy-path-caption')).toHaveCount(0);
    await expect(selector.getByRole('treeitem')).toHaveCount(0);
    /* Search + header stay reachable while the flattened list scrolls */
    await expect(selector.locator('.taxonomy-selector-sticky')).toHaveCSS(
      'position',
      'sticky',
    );
    const emotionOption = selector.locator(
      '[data-testid="taxonomy-preview-option"][data-node-id="emotion"]',
    );
    await expect(emotionOption).toHaveAttribute('role', 'checkbox');
    await expect(emotionOption).toHaveAttribute('aria-checked', 'false');
    await emotionOption.click();
    /* Selecting keeps the dialog open for further picks and announces the count */
    await expect(selector).toBeVisible();
    await expect(selectedPaths).toHaveCount(3);
    await expect(selectedPaths.nth(2)).toHaveText('emotion');
    await expect(page.locator('.taxonomy-selector .taxonomy-live')).toContainText(
      '共已選 3 個',
    );
    expect(
      await page.evaluate(() => {
        const prototypeState = window.state as {
          previewState?: {
            multi_label?: { selected?: string[][] };
          };
        } | undefined;
        return prototypeState?.previewState?.multi_label?.selected;
      }),
    ).toEqual([
      ['emotion', 'negative', 'sad'],
      ['care_context', 'clinical', 'urgent'],
      ['emotion'],
    ]);

    /* Dialog is still open — search and keep picking without reopening */
    await selector.getByTestId('taxonomy-search-input').fill('hopeful');
    const hopefulOption = selector.locator(
      '[data-testid="taxonomy-preview-option"][data-node-id="hopeful"]',
    );
    await expect(hopefulOption).toBeVisible();
    await expect(
      selector.locator('[data-testid="taxonomy-preview-option"][data-node-id="sad"]'),
    ).toBeHidden();
    await hopefulOption.click();
    /* Selection under an active query preserves both the dialog and the query */
    await expect(selector).toBeVisible();
    await expect(selector.getByTestId('taxonomy-search-input')).toHaveValue('hopeful');
    await expect(selectedPaths).toHaveCount(4);
    /* Only an explicit dismissal closes the dialog */
    await selector.getByRole('button', { name: '關閉標籤選擇器' }).click();
    await expect(selector).toBeHidden();
    /* Clicking outside the selector dismisses it too */
    await page.getByTestId('taxonomy-selector-trigger').click();
    await expect(selector).toBeVisible();
    await page.locator('#step2Panel').click({ position: { x: 5, y: 5 } });
    await expect(selector).toBeHidden();
  });

  test('supports tree editing and recursive JSON/YAML round-trip', async ({ page }) => {
    await setupHierarchicalMultiLabel(page);

    const negativeNode = page.locator(
      '[data-testid="taxonomy-treeitem"][data-node-id="negative"]',
    );
    await negativeNode
      .locator(':scope > .taxonomy-node-row')
      .getByTestId('taxonomy-add-child-btn')
      .click();

    const newNode = page.locator(
      '[data-testid="taxonomy-treeitem"][data-node-id^="label_"]',
    ).last();
    await newNode.getByTestId('taxonomy-node-id-input').fill('overwhelmed');
    await newNode.getByTestId('taxonomy-node-name-input').fill('Overwhelmed');

    const config = await page.evaluate(() => {
      const prototypeState = window.state as {
        outputConfigs?: Record<string, {
          label_options?: TaxonomyNode[];
          max_selections?: number;
        }>;
      } | undefined;
      return prototypeState?.outputConfigs?.multi_label;
    });
    const negative = config?.label_options
      ?.find((node) => node.id === 'emotion')
      ?.children?.find((node) => node.id === 'negative');
    expect(negative?.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'overwhelmed', name: 'Overwhelmed' }),
      ]),
    );

    await page.locator('#formatJsonBtn').click();
    const editor = page.locator('#codeEditor');
    const jsonConfig = JSON.parse(await editor.inputValue()) as {
      outputs: Array<{ type: string; config: { label_options: TaxonomyNode[] } }>;
    };
    const multiLabel = jsonConfig.outputs.find((output) => output.type === 'multi_label');
    expect(multiLabel?.config.label_options[0].children?.[0].children).toBeDefined();

    await editor.fill(JSON.stringify(jsonConfig, null, 2));
    await page.locator('#saveCodeBtn').click();
    await expect(page.locator('#codeErrorBar')).toHaveClass(/hidden/);
    expect(
      await page.getByTestId('taxonomy-node-name-input').evaluateAll((elements) =>
        elements.map((element) => (element as HTMLInputElement).value),
      ),
    ).toContain('Overwhelmed');

    await page.locator('#formatYamlBtn').click();
    await expect(editor).toHaveValue(/children:/);
    await editor.fill(await editor.inputValue());
    await page.locator('#saveCodeBtn').click();
    await expect(page.locator('#codeErrorBar')).toHaveClass(/hidden/);
    expect(
      await page.getByTestId('taxonomy-node-name-input').evaluateAll((elements) =>
        elements.map((element) => (element as HTMLInputElement).value),
      ),
    ).toContain('Overwhelmed');
  });

  test('groups children under their parent with rails, collapsed counts, and on-demand actions', async ({
    page,
  }) => {
    await setupHierarchicalMultiLabel(page);

    const editor = page.getByTestId('taxonomy-tree-editor');
    const emotion = editor.locator(
      '[data-testid="taxonomy-treeitem"][data-node-id="emotion"]',
    );
    const emotionRow = emotion.locator(':scope > .taxonomy-node-row');

    /* Children are nested inside the parent's rail-carrying group container */
    await expect(
      emotion.locator(
        ':scope > .taxonomy-children > [data-testid="taxonomy-treeitem"][data-node-id="negative"]',
      ),
    ).toBeVisible();

    /* Lucide SVG icons replace text glyphs on disclosure and action buttons */
    await expect(emotionRow.locator('.taxonomy-disclosure svg')).toBeVisible();
    await expect(emotionRow.locator('.taxonomy-action-btn svg')).toHaveCount(5);

    /* Action buttons are progressively disclosed on hover */
    const actions = emotionRow.locator('.taxonomy-node-actions');
    await expect(actions).toHaveCSS('opacity', '0');
    await emotionRow.hover();
    await expect(actions).toHaveCSS('opacity', '1');

    /* Collapsed branch summarizes descendants; expanding removes the badge */
    await expect(emotion.getByTestId('taxonomy-child-count')).toHaveCount(0);
    await emotionRow.locator('.taxonomy-disclosure').click();
    await expect(emotion.getByTestId('taxonomy-child-count')).toHaveText('5');
    await emotionRow.locator('.taxonomy-disclosure').click();
    await expect(emotion.getByTestId('taxonomy-child-count')).toHaveCount(0);

    /* Branch deletion confirms via the in-page UXC-10 modal, not window.confirm */
    let nativeDialogSeen = false;
    page.on('dialog', (dialog) => {
      nativeDialogSeen = true;
      void dialog.dismiss();
    });
    const negativeRow = editor
      .locator('[data-testid="taxonomy-treeitem"][data-node-id="negative"]')
      .locator(':scope > .taxonomy-node-row');
    await negativeRow.hover();
    await negativeRow.getByRole('button', { name: '刪除' }).click();
    const deleteModal = page.locator('#taxonomyDeleteModal');
    await expect(deleteModal).toBeVisible();
    await expect(deleteModal.locator('.modal-title')).toContainText('刪除');
    await expect(deleteModal.locator('.modal-desc')).toContainText('2 個子節點');
    expect(nativeDialogSeen).toBe(false);
    /* Cancel keeps the subtree; Escape also dismisses */
    await deleteModal.getByRole('button', { name: '取消' }).click();
    await expect(deleteModal).toBeHidden();
    await expect(editor.getByRole('treeitem')).toHaveCount(13);
    await negativeRow.hover();
    await negativeRow.getByRole('button', { name: '刪除' }).click();
    await expect(deleteModal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(deleteModal).toBeHidden();
    await expect(editor.getByRole('treeitem')).toHaveCount(13);
    /* Confirm button holds focus (Enter confirms) and deletes the subtree */
    await negativeRow.hover();
    await negativeRow.getByRole('button', { name: '刪除' }).click();
    await expect(deleteModal.getByRole('button', { name: '刪除' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(deleteModal).toBeHidden();
    await expect(editor.getByRole('treeitem')).toHaveCount(10);
    await expect(
      editor.locator('[data-testid="taxonomy-treeitem"][data-node-id="negative"]'),
    ).toHaveCount(0);
  });

  test('blocks Step 3 when data preselects more labels than max_selections', async ({ page }) => {
    await setupHierarchicalMultiLabel(page);

    const maxInput = page.locator(
      '.output-accordion[data-output-key="multi_label"] input[type="number"]',
    );
    await maxInput.fill('1');

    /* Step 3 is blocked and the inline error cites the row and field */
    await expect(page.locator('#nextBtn')).toBeDisabled();
    const exceeded = page.getByTestId('taxonomy-max-exceeded');
    await expect(exceeded).toBeVisible();
    await expect(exceeded).toContainText('資料列 1');
    await expect(exceeded).toContainText('gold_labels');
    /* Preselected values are not silently trimmed */
    await expect(page.getByTestId('taxonomy-selected-path')).toHaveCount(2);
  });

  test('blocks auto-fill and cites the row and field when a data path no longer matches', async ({
    page,
  }) => {
    await setupHierarchicalMultiLabel(page);

    /* Diverge the taxonomy from the dataset: rename node id "sad" */
    const sadNode = page.locator(
      '[data-testid="taxonomy-treeitem"][data-node-id="sad"]',
    );
    await sadNode.getByTestId('taxonomy-node-id-input').fill('melancholy');

    const issue = page.getByTestId('taxonomy-data-issue');
    await expect(issue).toBeVisible();
    await expect(issue).toContainText('資料列 1');
    await expect(issue).toContainText('gold_labels');

    /* A fresh preview must not partially auto-fill the still-valid paths */
    await page.evaluate(() => {
      const prototypeState = window.state as { previewState?: Record<string, unknown> };
      delete prototypeState.previewState?.multi_label;
      (window as unknown as { updateAnnotationPreview: () => void }).updateAnnotationPreview();
    });
    await expect(page.getByTestId('taxonomy-selected-path')).toHaveCount(0);
    await expect(page.getByTestId('taxonomy-data-issue')).toBeVisible();
  });

  test('shows a non-blocking hint when max_selections exceeds the selectable node count', async ({
    page,
  }) => {
    await setupHierarchicalMultiLabel(page);

    const maxInput = page.locator(
      '.output-accordion[data-output-key="multi_label"] input[type="number"]',
    );
    await maxInput.fill('99');

    const hint = page.getByTestId('taxonomy-max-hint');
    await expect(hint).toBeVisible();
    await expect(hint).toContainText('視為不限');
    /* Non-blocking: Step 2 validation still passes */
    expect(
      await page.evaluate(() =>
        (window as unknown as { validateStep2: (show: boolean) => boolean }).validateStep2(false),
      ),
    ).toBe(true);
  });

  test('uses keyboard-operable controls and a mobile selector dialog without overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await setupHierarchicalMultiLabel(page);

    const accordionButton = page
      .locator('.output-accordion[data-output-key="multi_label"]')
      .getByTestId('output-accordion-toggle');
    await expect(accordionButton).toHaveAttribute('aria-expanded', 'true');
    await accordionButton.press('Enter');
    await expect(accordionButton).toHaveAttribute('aria-expanded', 'false');
    await accordionButton.press('Space');
    await expect(accordionButton).toHaveAttribute('aria-expanded', 'true');

    const trigger = page.getByTestId('taxonomy-selector-trigger');
    await trigger.click();
    const dialog = page.getByTestId('taxonomy-selector-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('role', 'dialog');
    const optionSize = await dialog
      .locator('[data-testid="taxonomy-preview-option"][data-node-id="emotion"]')
      .evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });
    expect(optionSize.width).toBeGreaterThanOrEqual(44);
    expect(optionSize.height).toBeGreaterThanOrEqual(44);
    await dialog.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport);
  });
});
