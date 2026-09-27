/**
 * Traceability: issue #1022 — the relation-type badge ("類型：X") rendered by
 * buildRelationTripleRow() in design/prototype/pages/task-management/
 * task-config.engine.js:2089 uses `font-size:10px`, below the design-system
 * minimum --text-label (12px, design/prototype/assets/tokens.css:67,
 * design/system/MASTER.md:414 Typography table, "Label" row).
 *
 * Scope: this file covers ONLY the typeBadge span built at engine.js:2088-2091
 * inside buildRelationTripleRow(). It does NOT cover the checkmark glyph at
 * engine.js:2485 (decorative icon sizing, out of scope for #1022) and does
 * NOT duplicate the .absa-relation-badge coverage already in
 * tests/task-management/issue-982-ten-px-functional-text.spec.ts.
 *
 * The assertion below reads the real rendered getComputedStyle() font-size
 * via Playwright's toHaveCSS() — never the CSS/inline-style source string —
 * so it can't be satisfied by a comment or a dead rule.
 *
 * RED (current state): the assertion FAILS because typeBadge's inline style
 * still declares `font-size:10px`. GREEN (after fix): engine.js:2089 becomes
 * `font-size:var(--text-label)` (12px) and this assertion passes unchanged.
 */
import { test, expect, type Page } from '@playwright/test';
import path from 'path';

const TASK_NEW_URL = '/pages/task-management/task-new.html';
const EXAMPLE_DATA = path.resolve(__dirname, '../../../../docs/product/example-data');
const EXPECTED_FONT_SIZE = '12px';
const REL_TYPE = 'likes';

async function waitForCategoryChips(page: Page) {
  await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
    null,
    { timeout: 30000 },
  );
}

test.describe('Issue #1022 — relation triple-row type badge at 10px', () => {
  // Reuses the exact step-1 selections already verified in
  // issue-982-ten-px-functional-text.spec.ts's "absa-relation-badge" test, to
  // reach the same renderAbsaUnifiedPreview() unified preview and get at
  // least one .absa-relation-row rendered inside #annotationPreview
  // .preview-unified. That dataset's triples have no relType by default, so
  // the typeBadge span is not yet present -- state is patched directly (same
  // pattern as tests/task-management/task-new-step2-dark-mode.spec.ts:16-42)
  // to give the first previewTriple a relType that also exists in
  // outputConfigs['relation_identification'].relation_types (the guard at
  // engine.js:2087), which is the only way buildRelationTripleRow() renders
  // the typeBadge at all.
  test('renders the relation-type badge at the design-system label size', async ({ page }) => {
    await waitForCategoryChips(page);
    await page.fill('#taskNameInput', 'issue-1022-type-badge-test');
    await page.locator('#taskCategoryChips [data-key="regression"]').click();
    await page.locator('#taskCategoryChips [data-key="sequence"]').click();
    await page.locator('#taskInputTypeChips [data-key="single_item"]').click();
    await page.locator('#taskOutputTypeChips [data-key="entity_recognition"]').click();
    await page.locator('#taskOutputTypeChips [data-key="relation_identification"]').click();
    await page.locator('#taskOutputTypeChips [data-key="multi_dim"]').click();

    await page.locator('#datasetFileInput').setInputFiles(path.join(EXAMPLE_DATA, 'absa-va.json'));
    await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();

    const roles: Record<string, string> = {
      utterances: 'evidence',
      text: 'input',
      gold_triplets: 'output',
      incomplete_annotations: 'output',
    };
    for (const [col, role] of Object.entries(roles)) {
      await page.locator(`.inline-preview-role-select[aria-label$="${col}"]`).selectOption(role);
    }

    await page.evaluate(() => {
      (window as Window & { revalidateCurrentStep?: () => void }).revalidateCurrentStep?.();
    });
    await page.waitForTimeout(200);
    await page.locator('#nextBtn').click();
    await expect(page.locator('#step2Panel')).not.toHaveClass(/hidden/);

    // Confirm the unified preview rendered at least one relation row before
    // mutating state, so the container handed to the refresh call below is
    // the real one already on the page.
    await expect(page.locator('#annotationPreview .absa-relation-row').first()).toBeVisible();

    await page.evaluate((relType) => {
      type AbsaWindow = Window & {
        state: {
          outputConfigs: Record<string, { relation_types?: string[] }>;
          previewTriples: Array<{ relType?: string | null }>;
        };
        renderAbsaUnifiedPreview_refresh: (container: Element) => void;
      };
      const win = window as unknown as AbsaWindow;
      if (!win.state.outputConfigs['relation_identification']) {
        win.state.outputConfigs['relation_identification'] = {};
      }
      win.state.outputConfigs['relation_identification'].relation_types = [relType];
      win.state.previewTriples[0].relType = relType;
      const container = document.querySelector('#annotationPreview .preview-unified');
      if (!container) throw new Error('preview-unified container not found');
      win.renderAbsaUnifiedPreview_refresh(container);
    }, REL_TYPE);

    // `.absa-relation-row span` also matches the row's outer content span
    // (it wraps subj/arrow/relBadge/arrow2/obj/typeBadge, so it too contains
    // "類型：" as a text substring). typeBadge is appended last among that
    // span's children, so in document order it is the LAST match, not the
    // first -- picking .first() resolves to the ancestor content span instead.
    const typeBadge = page
      .locator('#annotationPreview .absa-relation-row span', { hasText: '類型：' })
      .last();
    await expect(typeBadge).toBeVisible();
    await expect(typeBadge).toHaveText('類型：' + REL_TYPE);
    await expect(typeBadge).toHaveCSS('font-size', EXPECTED_FONT_SIZE);
  });
});
