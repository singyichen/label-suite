/*
 * Traceability: openspec/changes/task-detail-seq-tagging-export-dialog/
 *   specs/task-management/014-task-detail/spec.md
 *   FR-020, AC-1.10, SC-045 (AC-1.11/AC-1.12/AC-1.13 belong to group 2 and
 *   the final group -- not covered here).
 *
 * TDD Red (tasks.md group 1, tasks 1.1/1.2/1.3, issue #742). Today
 * `design/prototype/pages/shared/span-tagging-export.js` has no caller
 * anywhere in the prototype (design.md background fact 1) and
 * `annotation-results.html` has exactly the two pre-existing export buttons
 * with no dialog markup at all, so every test in the "1.1" and "1.2"
 * describe blocks below is expected to fail against that baseline. Green
 * work happens in tasks 1.4-1.6 (senior-frontend) and MUST NOT weaken or
 * rewrite any assertion here to pass.
 *
 * Selector contract this file defines (target selectors MUST NOT be chosen
 * by Green -- CLAUDE.md TDD rule): the export dialog these tests target is
 * `#arSeqExportModal`, opened by clicking either existing export button
 * (`#arExportJsonBtn` / `#arExportJsonMinBtn`) when `TASK_DATA.outputs[]`
 * contains `sequence_tagging`. Inside it:
 *   - `#arSeqExportSchemeSelect`    tagging-scheme select (BIO/BIOES/IOB2)
 *   - `#arSeqExportUnitSelect`      token-unit select (character/word)
 *   - `#arSeqExportTokenizerField`  tokenizer-engine field, visible only
 *                                   when the unit select is `word`
 *   - `#arSeqExportExpansionSummary` alignment-expansion summary container
 *     (group 2 populates it; here it must stay hidden on the character path)
 *   - `#arSeqExportConfirmBtn`      triggers the download for whichever
 *                                   button opened the dialog
 * Design decision this file locks in (not stated verbatim by the delta,
 * chosen for consistency with the existing `#riskModal` pattern at
 * task-detail.html:9515 `closeRiskModal()`): confirming closes the dialog.
 * "改選 BIOES 再次匯出" (AC-1.10) is therefore modelled as re-opening the
 * dialog via the export button a second time, not keeping one dialog open
 * across two downloads.
 *
 * Deliberately NOT asserted here (left to other tasks/owners):
 *   - Word-level metadata, expansion summaries, the missing-version block
 *     path (AC-1.11/AC-1.12) -- group 2, tasks 2.1/2.2.
 *   - Esc/overlay-click dismissal of the dialog -- design.md D6 reuses the
 *     shared `modal-focus.js` mechanism already regression-covered by
 *     task-management-modal-focus.spec.ts; re-asserting it here would
 *     duplicate that contract instead of adding one.
 *   - Any `tags`/per-annotation-record placement of the derived sequence --
 *     AC-1.10 only names manifest-level `tagging_scheme`/`token_unit`; the
 *     "file MUST NOT contain a tokenizer/alignment_mode/expanded_span_count
 *     key" checks below scan the whole payload, not just the manifest, so
 *     they still catch a leak into any other location.
 *
 * KNOWN CONFLICT flagged for team-lead: `task-detail-annotation-results.spec.ts`
 * ("downloads JSON-MIN export with task-specific NER summary fields") drives
 * T006 today and asserts an immediate download with `entities_summary`. Once
 * 1.6 makes T006's export open this dialog instead (outputs[] contains
 * `sequence_tagging`), that pre-existing test will fail. This file does not
 * touch it (out of this task's scope); resolving the T006 reassignment is a
 * task 1.8 regression concern, not a QA task 1.1-1.3 one.
 */
import { promises as fsp } from 'node:fs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test, expect, type Page } from '@playwright/test';

declare global {
  interface Window {
    TASK_DATA?: {
      outputs?: Array<{ type: string; config?: Record<string, unknown> }>;
    };
  }
}

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const SOURCE_PATH = path.resolve(__dirname, '../../pages/task-management/task-detail.html');
const PANEL_LOAD_TIMEOUT = 15000;

const SEQ_TAGGING_TASK_ID = 'T006'; // outputs[] = [{ type: 'sequence_tagging', ... }]
const ENTITY_RECOGNITION_TASK_ID = 'T010'; // outputs[] = [entity_recognition, relation_identification]

async function gotoAnnotationResults(page: Page, taskId: string) {
  await page.goto(`${TASK_DETAIL_URL}?task_id=${taskId}&tab=annotation-results`);
  await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });
}

async function selectOptionValues(page: Page, selector: string): Promise<string[]> {
  return page
    .locator(selector)
    .evaluate((el) => Array.from((el as HTMLSelectElement).options).map((option) => option.value));
}

async function downloadDialogExport(page: Page): Promise<unknown> {
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#arSeqExportConfirmBtn').click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const raw = await fsp.readFile(downloadPath as string, 'utf8');
  return JSON.parse(raw);
}

function collectKeys(value: unknown, keys: Set<string>) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectKeys(item, keys));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      keys.add(key);
      collectKeys(nested, keys);
    }
  }
}

function allKeys(payload: unknown): Set<string> {
  const keys = new Set<string>();
  collectKeys(payload, keys);
  return keys;
}

test.describe('issue #742 -- sequence_tagging export dialog (task 1.1: dialog + selectors)', () => {
  test('export dialog opens for T006 (sequence_tagging) with scheme and unit selectors defaulting to BIO / character', async ({ page }) => {
    await gotoAnnotationResults(page, SEQ_TAGGING_TASK_ID);

    await page.locator('#arExportJsonBtn').click();
    const modal = page.locator('#arSeqExportModal');
    await expect(modal).toBeVisible();

    const schemeSelect = page.locator('#arSeqExportSchemeSelect');
    await expect(schemeSelect).toBeVisible();
    expect(await selectOptionValues(page, '#arSeqExportSchemeSelect')).toEqual(['BIO', 'BIOES', 'IOB2']);
    await expect(schemeSelect).toHaveValue('BIO');

    const unitSelect = page.locator('#arSeqExportUnitSelect');
    await expect(unitSelect).toBeVisible();
    expect(await selectOptionValues(page, '#arSeqExportUnitSelect')).toEqual(['character', 'word']);
    await expect(unitSelect).toHaveValue('character');
  });

  test('switching token unit to word reveals the tokenizer engine field; switching back to character hides it', async ({ page }) => {
    await gotoAnnotationResults(page, SEQ_TAGGING_TASK_ID);
    await page.locator('#arExportJsonBtn').click();
    await expect(page.locator('#arSeqExportModal')).toBeVisible();

    const tokenizerField = page.locator('#arSeqExportTokenizerField');
    await expect(tokenizerField).toBeHidden();

    await page.locator('#arSeqExportUnitSelect').selectOption('word');
    await expect(tokenizerField).toBeVisible();

    await page.locator('#arSeqExportUnitSelect').selectOption('character');
    await expect(tokenizerField).toBeHidden();
  });

  test('export dialog does not appear for T010 (entity_recognition); both export buttons still download immediately', async ({ page }) => {
    await gotoAnnotationResults(page, ENTITY_RECOGNITION_TASK_ID);

    const jsonDownload = page.waitForEvent('download');
    await page.locator('#arExportJsonBtn').click();
    await jsonDownload;
    await expect(page.locator('#arSeqExportModal')).toBeHidden();

    const jsonMinDownload = page.waitForEvent('download');
    await page.locator('#arExportJsonMinBtn').click();
    await jsonMinDownload;
    await expect(page.locator('#arSeqExportModal')).toBeHidden();
  });
});

test.describe('issue #742 -- sequence_tagging export dialog (task 1.2: AC-1.10 character-level metadata)', () => {
  test('default character-level JSON export records BIO/character in the manifest, omits tokenizer metadata anywhere in the file, and shows no expansion summary', async ({ page }) => {
    await gotoAnnotationResults(page, SEQ_TAGGING_TASK_ID);
    await page.locator('#arExportJsonBtn').click();
    await expect(page.locator('#arSeqExportModal')).toBeVisible();
    await expect(page.locator('#arSeqExportSchemeSelect')).toHaveValue('BIO');
    await expect(page.locator('#arSeqExportUnitSelect')).toHaveValue('character');

    const payload = await downloadDialogExport(page);
    const manifest = (payload as { manifest?: Record<string, unknown> }).manifest;
    expect(manifest?.tagging_scheme).toBe('BIO');
    expect(manifest?.token_unit).toBe('character');

    const keys = allKeys(payload);
    expect(keys.has('tokenizer')).toBe(false);
    expect(keys.has('alignment_mode')).toBe(false);
    expect(keys.has('expanded_span_count')).toBe(false);

    await expect(page.locator('#arSeqExportExpansionSummary')).toBeHidden();
  });

  test('default character-level JSON-MIN export records BIO/character on every row and omits tokenizer metadata anywhere in the file', async ({ page }) => {
    await gotoAnnotationResults(page, SEQ_TAGGING_TASK_ID);
    await page.locator('#arExportJsonMinBtn').click();
    await expect(page.locator('#arSeqExportModal')).toBeVisible();
    await expect(page.locator('#arSeqExportSchemeSelect')).toHaveValue('BIO');
    await expect(page.locator('#arSeqExportUnitSelect')).toHaveValue('character');

    const payload = await downloadDialogExport(page);
    expect(Array.isArray(payload)).toBe(true);
    const rows = payload as Array<Record<string, unknown>>;
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.tagging_scheme).toBe('BIO');
      expect(row.token_unit).toBe('character');
    }

    const keys = allKeys(payload);
    expect(keys.has('tokenizer')).toBe(false);
    expect(keys.has('alignment_mode')).toBe(false);
    expect(keys.has('expanded_span_count')).toBe(false);

    await expect(page.locator('#arSeqExportExpansionSummary')).toBeHidden();
  });

  test('re-exporting with BIOES after BIO produces two files with distinct tagging_scheme and never mutates the task output config', async ({ page }) => {
    await gotoAnnotationResults(page, SEQ_TAGGING_TASK_ID);
    const beforeConfig = await page.evaluate(() => JSON.stringify(window.TASK_DATA?.outputs ?? []));

    await page.locator('#arExportJsonBtn').click();
    await expect(page.locator('#arSeqExportModal')).toBeVisible();
    const firstPayload = (await downloadDialogExport(page)) as { manifest?: Record<string, unknown> };
    expect(firstPayload.manifest?.tagging_scheme).toBe('BIO');
    // Confirming closes the dialog (design decision documented in the file header).
    await expect(page.locator('#arSeqExportModal')).toBeHidden();

    await page.locator('#arExportJsonBtn').click();
    await expect(page.locator('#arSeqExportModal')).toBeVisible();
    await page.locator('#arSeqExportSchemeSelect').selectOption('BIOES');
    const secondPayload = (await downloadDialogExport(page)) as { manifest?: Record<string, unknown> };
    expect(secondPayload.manifest?.tagging_scheme).toBe('BIOES');

    const afterConfig = await page.evaluate(() => JSON.stringify(window.TASK_DATA?.outputs ?? []));
    expect(afterConfig).toBe(beforeConfig);

    const seqTaggingConfig = await page.evaluate(() => {
      const outputs = window.TASK_DATA?.outputs ?? [];
      const found = outputs.find((output) => output.type === 'sequence_tagging');
      return found?.config ?? null;
    });
    expect(seqTaggingConfig).not.toBeNull();
    expect(seqTaggingConfig).not.toHaveProperty('tagging_scheme');
    expect(seqTaggingConfig).not.toHaveProperty('token_unit');
  });
});

test.describe('issue #742 -- sequence_tagging export dialog (task 1.3: SC-045 source-scan guard)', () => {
  const source = fs.readFileSync(SOURCE_PATH, 'utf8');

  test('LabelSuiteSpanTaggingExport.deriveSequence has exactly one call site in task-detail.html (single derivation entry point)', () => {
    const count = (source.match(/\bderiveSequence\(/g) || []).length;
    expect(count).toBe(1);
  });

  test('task-detail.html never concatenates a B-/I-/E-/S- tag prefix literal', () => {
    let literalCount = 0;
    for (const prefix of ['B-', 'I-', 'E-', 'S-']) {
      literalCount += (source.match(new RegExp(`'${prefix}'`, 'g')) || []).length;
      literalCount += (source.match(new RegExp(`"${prefix}"`, 'g')) || []).length;
    }
    expect(literalCount).toBe(0);
  });

  test('the scheme/unit option domains are rendered from the shared module constants, not a second hardcoded list', () => {
    // Reference-count assertion on the module's own identifiers (FR-020(1)):
    // rendering MUST read LabelSuiteSpanTaggingExport.EXPORT_TAGGING_SCHEMES /
    // .EXPORT_TOKEN_UNITS, not restate the value domain as a literal array.
    const schemeConstantRefs = (source.match(/EXPORT_TAGGING_SCHEMES/g) || []).length;
    const unitConstantRefs = (source.match(/EXPORT_TOKEN_UNITS/g) || []).length;
    expect(schemeConstantRefs).toBeGreaterThanOrEqual(1);
    expect(unitConstantRefs).toBeGreaterThanOrEqual(1);

    const literalSchemeArray = (
      source.match(/\[\s*['"]BIO['"]\s*,\s*['"]BIOES['"]\s*,\s*['"]IOB2['"]\s*\]/g) || []
    ).length;
    expect(literalSchemeArray).toBe(0);

    const literalUnitArray = (
      source.match(/\[\s*['"]character['"]\s*,\s*['"]word['"]\s*\]/g) || []
    ).length;
    expect(literalUnitArray).toBe(0);
  });

  test('the entity_recognition export branch (buildTaskSpecificExportFields entities fallback) never calls deriveSequence', () => {
    // Anchors are the current, unmodified entities-fallback branch text
    // (tasks.md scope: T010/entity_recognition export fields MUST NOT
    // change) through the next function declaration -- if a future edit
    // renames these anchors it has touched code this change must leave
    // alone.
    const startAnchor = 'fields.entities = value && value.entities ? cloneExportValue(value.entities) : [];';
    const endAnchor = 'function buildExportAnnotationRecord';
    const startIndex = source.indexOf(startAnchor);
    const endIndex = source.indexOf(endAnchor);
    expect(startIndex).toBeGreaterThan(-1);
    expect(endIndex).toBeGreaterThan(startIndex);

    const entityBranch = source.slice(startIndex, endIndex);
    expect(entityBranch).not.toContain('deriveSequence');
  });
});
