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
 *
 * --- Group 2 addendum (tasks 2.1/2.2, AC-1.11/AC-1.12) ---
 *
 * Tokenizer engine identifiers this file locks in as the seed contract for
 * task 2.3 (design.md decision 4, maintainer ruling 2026-09-16): the
 * versioned engine driving the AC-1.11 success path is `ckip-transformers`
 * version `0.3.4`; the engine deliberately missing `version` driving the
 * AC-1.12 blocked path is `jieba`. Both MUST appear as `<option value="...">`
 * of `#arSeqExportTokenizerSelect` once 2.3/2.4 land, and 2.3's seed for
 * `ckip-transformers` MUST make at least one T006 sample's span cross a
 * token boundary (design.md D3) so `expanded_span_count > 0` is reachable.
 *
 * Additional selector contract this file adds on top of group 1's:
 *   - `#arSeqExportTokenizerSelect`  tokenizer-engine select inside
 *                                    `#arSeqExportTokenizerField`; options
 *                                    are the two identifiers above.
 *   - `#arSeqExportExpansionToggle`  button inside `#arSeqExportExpansionSummary`
 *                                    whose text is exactly
 *                                    "${N} 段標記因對齊被擴張" (N = the
 *                                    manifest's `expanded_span_count`);
 *                                    clicking it reveals `#arSeqExportExpansionList`.
 *   - `#arSeqExportExpansionList`    hidden until the toggle is clicked;
 *                                    contains one `.ar-seq-expansion-item`
 *                                    per expansion, each with
 *                                    `.ar-seq-expansion-original`,
 *                                    `.ar-seq-expansion-expanded` and
 *                                    `.ar-seq-expansion-delta` children.
 *   - `#arSeqExportBlockedNotice`    becomes visible with a Chinese reason
 *                                    when the selected tokenizer lacks
 *                                    `version` and `token_unit` is `word`.
 *
 * Dialog open/close timing for the word path (`token_unit = word`) splits
 * into two halves with different authority:
 *
 *   - Blocked path (AC-1.12) -- SPEC-MANDATED, not a scope decision. The
 *     scenario's third AND clause reads verbatim "使用者於同一對話框改回單位
 *     `character` 後匯出正常完成" ("...in the SAME dialog switches the unit
 *     back to `character` and exports successfully") -- "同一對話框" only
 *     makes sense if the dialog is still open after the blocked confirm.
 *     A Green implementation that auto-closes on blocked confirm violates
 *     AC-1.12 directly; this half of the "does not close" assertion is NOT
 *     open to being overridden.
 *   - Success path (AC-1.11) -- this file's inference, overridable only by
 *     changing already-landed group-1 markup. FR-020(4)/AC-1.11 do not
 *     state close timing verbatim, but `#arSeqExportExpansionSummary` is a
 *     child of `#arSeqExportModal > .modal`
 *     (annotation-results.html:137-153, task 1.5, already committed), so an
 *     auto-close-on-confirm would make the summary unreadable before the
 *     user ever sees it. Overturning this half requires changing that
 *     locked markup structure, not a unilateral Green choice.
 *
 * Both halves apply identically on success and blocked outcomes: for
 * `token_unit = word`, confirming does NOT close the dialog either way --
 * the user dismisses manually (Cancel/Esc/overlay-click, already covered by
 * modal-focus.js). The character-path close-on-confirm behavior from group 1
 * is unchanged.
 *
 * Deliberately NOT asserted here: hiding `#arSeqExportBlockedNotice` the
 * moment the unit select changes back to `character` (AC-1.12 only requires
 * the *subsequent export* to be clean, not an intermediate UI state); the
 * exact wording of the blocked-reason text beyond containing "版本" (the
 * i18n key name and full sentence are Green's choice).
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
    LabelSuiteSpanTaggingExport?: {
      SPAN_TOKEN_ALIGNMENT_MODE?: string;
    };
  }
}

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const SOURCE_PATH = path.resolve(__dirname, '../../pages/task-management/task-detail.html');
const PANEL_LOAD_TIMEOUT = 15000;

const SEQ_TAGGING_TASK_ID = 'T006'; // outputs[] = [{ type: 'sequence_tagging', ... }]
const ENTITY_RECOGNITION_TASK_ID = 'T010'; // outputs[] = [entity_recognition, relation_identification]

// design.md decision 4 (maintainer ruling 2026-09-16) -- see group 2 addendum above.
const TOKENIZER_ENGINE_WITH_VERSION = 'ckip-transformers';
const TOKENIZER_ENGINE_VERSION = '0.3.4';
const TOKENIZER_ENGINE_MISSING_VERSION = 'jieba';

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

type SpansExportRecord = {
  items?: Array<{
    annotations?: Array<{
      annotation_id: string;
      result?: { spans?: unknown };
    }>;
  }>;
};

// AC-1.11 "該樣本已儲存的 spans[] 起訖值未被改動": compares the JSON format's
// per-annotation `result.spans` passthrough (buildExportAnnotationRecord
// merges `cloneExportValue(annotation.value)`, task-detail.html:9288-9343)
// across two exports keyed by annotation_id. JSON-MIN does not carry
// `spans` at all (buildJsonMinExportPayload only merges taskFields, never
// annotation.value -- task-detail.html:9345-9382), so this helper is only
// meaningful against the JSON format.
function extractAnnotationSpans(payload: unknown): Record<string, unknown> {
  const items = (payload as SpansExportRecord).items || [];
  const map: Record<string, unknown> = {};
  items.forEach((item) => {
    (item.annotations || []).forEach((annotation) => {
      map[annotation.annotation_id] = annotation.result ? annotation.result.spans : undefined;
    });
  });
  return map;
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

test.describe('issue #742 -- sequence_tagging export dialog (task 2.1: AC-1.11 word-level export + expansion summary)', () => {
  test('word-level JSON export with a versioned tokenizer records tokenizer/alignment_mode/expanded_span_count in the manifest, keeps the dialog open, and shows a matching "N 段標記因對齊被擴張" summary', async ({ page }) => {
    await gotoAnnotationResults(page, SEQ_TAGGING_TASK_ID);
    await page.locator('#arExportJsonBtn').click();
    await expect(page.locator('#arSeqExportModal')).toBeVisible();

    await page.locator('#arSeqExportUnitSelect').selectOption('word');
    await expect(page.locator('#arSeqExportTokenizerField')).toBeVisible();
    // Today `#arSeqExportTokenizerSelect` has zero <option> elements (design.md
    // background fact 3 / task 2.3 not yet landed), so this line is expected
    // to throw "no matching option" -- the primary Red trigger for this file.
    await page.locator('#arSeqExportTokenizerSelect').selectOption(TOKENIZER_ENGINE_WITH_VERSION);

    const alignmentMode = await page.evaluate(
      () => window.LabelSuiteSpanTaggingExport?.SPAN_TOKEN_ALIGNMENT_MODE,
    );
    expect(typeof alignmentMode).toBe('string');

    const payload = (await downloadDialogExport(page)) as { manifest?: Record<string, unknown> };
    const manifest = payload.manifest;
    expect(manifest?.token_unit).toBe('word');
    expect(manifest?.tokenizer).toEqual({
      engine: TOKENIZER_ENGINE_WITH_VERSION,
      version: TOKENIZER_ENGINE_VERSION,
    });
    expect(manifest?.alignment_mode).toBe(alignmentMode);
    expect(typeof manifest?.expanded_span_count).toBe('number');
    const expandedCount = manifest?.expanded_span_count as number;
    expect(expandedCount).toBeGreaterThan(0);

    // New group-2 design decision (file header): the word path does NOT
    // auto-close on confirm, unlike the character path (task 1.2), because
    // the summary this scenario requires lives inside the modal.
    await expect(page.locator('#arSeqExportModal')).toBeVisible();

    const summary = page.locator('#arSeqExportExpansionSummary');
    await expect(summary).toBeVisible();
    await expect(page.locator('#arSeqExportExpansionToggle')).toContainText(
      `${expandedCount} 段標記因對齊被擴張`,
    );
  });

  test('expanding the summary lists one item per expansion with original text, expanded text, and an offset delta where the expanded text strictly contains the original', async ({ page }) => {
    await gotoAnnotationResults(page, SEQ_TAGGING_TASK_ID);
    await page.locator('#arExportJsonBtn').click();
    await expect(page.locator('#arSeqExportModal')).toBeVisible();
    await page.locator('#arSeqExportUnitSelect').selectOption('word');
    await page.locator('#arSeqExportTokenizerSelect').selectOption(TOKENIZER_ENGINE_WITH_VERSION);

    const payload = (await downloadDialogExport(page)) as { manifest?: Record<string, unknown> };
    const expandedCount = payload.manifest?.expanded_span_count as number;

    await page.locator('#arSeqExportExpansionToggle').click();
    const items = page.locator('.ar-seq-expansion-item');
    await expect(items).toHaveCount(expandedCount);

    const itemCount = await items.count();
    for (let i = 0; i < itemCount; i += 1) {
      const item = items.nth(i);
      const originalText = (await item.locator('.ar-seq-expansion-original').textContent())?.trim() ?? '';
      const expandedText = (await item.locator('.ar-seq-expansion-expanded').textContent())?.trim() ?? '';
      const deltaText = (await item.locator('.ar-seq-expansion-delta').textContent())?.trim() ?? '';

      // expandToTokens only grows a span outward toward token boundaries
      // (span-tagging-export.js: `range.start <= span.start && range.end >=
      // span.end`), so the expanded text is guaranteed to be a strict
      // superstring of the original for any expansion actually reported.
      expect(originalText.length).toBeGreaterThan(0);
      expect(expandedText.length).toBeGreaterThan(originalText.length);
      expect(expandedText).toContain(originalText);
      expect(deltaText.length).toBeGreaterThan(0);
    }
  });

  test('the sample\'s saved spans[] offsets are unchanged after a word-level export (comparing against a character-level baseline export)', async ({ page }) => {
    await gotoAnnotationResults(page, SEQ_TAGGING_TASK_ID);

    await page.locator('#arExportJsonBtn').click();
    await expect(page.locator('#arSeqExportModal')).toBeVisible();
    const baselinePayload = await downloadDialogExport(page);
    const spansBefore = extractAnnotationSpans(baselinePayload);
    expect(Object.keys(spansBefore).length).toBeGreaterThan(0);
    // Character path still auto-closes (task 1.2 convention, unchanged).
    await expect(page.locator('#arSeqExportModal')).toBeHidden();

    await page.locator('#arExportJsonBtn').click();
    await expect(page.locator('#arSeqExportModal')).toBeVisible();
    await page.locator('#arSeqExportUnitSelect').selectOption('word');
    await page.locator('#arSeqExportTokenizerSelect').selectOption(TOKENIZER_ENGINE_WITH_VERSION);
    const wordPayload = await downloadDialogExport(page);
    const spansAfter = extractAnnotationSpans(wordPayload);

    expect(spansAfter).toEqual(spansBefore);
  });

  test('switching back to character on the same task after a word-level export omits tokenizer metadata and shows no expansion summary', async ({ page }) => {
    await gotoAnnotationResults(page, SEQ_TAGGING_TASK_ID);
    await page.locator('#arExportJsonBtn').click();
    await expect(page.locator('#arSeqExportModal')).toBeVisible();
    await page.locator('#arSeqExportUnitSelect').selectOption('word');
    await page.locator('#arSeqExportTokenizerSelect').selectOption(TOKENIZER_ENGINE_WITH_VERSION);
    await downloadDialogExport(page);
    await expect(page.locator('#arSeqExportExpansionSummary')).toBeVisible();

    await page.locator('#arSeqExportUnitSelect').selectOption('character');
    const payload = await downloadDialogExport(page);

    const keys = allKeys(payload);
    expect(keys.has('tokenizer')).toBe(false);
    expect(keys.has('alignment_mode')).toBe(false);
    expect(keys.has('expanded_span_count')).toBe(false);
    await expect(page.locator('#arSeqExportExpansionSummary')).toBeHidden();
  });

  test('word-level JSON-MIN export records tokenizer/alignment_mode/expanded_span_count identically on every row (FR-020(3) dual-format requirement)', async ({ page }) => {
    await gotoAnnotationResults(page, SEQ_TAGGING_TASK_ID);
    await page.locator('#arExportJsonMinBtn').click();
    await expect(page.locator('#arSeqExportModal')).toBeVisible();
    await page.locator('#arSeqExportUnitSelect').selectOption('word');
    await page.locator('#arSeqExportTokenizerSelect').selectOption(TOKENIZER_ENGINE_WITH_VERSION);

    const payload = await downloadDialogExport(page);
    expect(Array.isArray(payload)).toBe(true);
    const rows = payload as Array<Record<string, unknown>>;
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.token_unit).toBe('word');
      expect(row.tokenizer).toEqual({
        engine: TOKENIZER_ENGINE_WITH_VERSION,
        version: TOKENIZER_ENGINE_VERSION,
      });
      expect(typeof row.alignment_mode).toBe('string');
      expect(typeof row.expanded_span_count).toBe('number');
    }
  });
});

test.describe('issue #742 -- sequence_tagging export dialog (task 2.2: AC-1.12 blocked export for a tokenizer missing version info)', () => {
  test('selecting a tokenizer without version info and confirming blocks the export with a Chinese reason naming the missing version info, not the module\'s raw diagnostic string', async ({ page }) => {
    await gotoAnnotationResults(page, SEQ_TAGGING_TASK_ID);
    await page.locator('#arExportJsonBtn').click();
    await expect(page.locator('#arSeqExportModal')).toBeVisible();
    await page.locator('#arSeqExportUnitSelect').selectOption('word');
    // Today `#arSeqExportTokenizerSelect` has zero <option> elements, so this
    // is expected to throw "no matching option" before task 2.3/2.4 land.
    await page.locator('#arSeqExportTokenizerSelect').selectOption(TOKENIZER_ENGINE_MISSING_VERSION);

    await page.locator('#arSeqExportConfirmBtn').click();

    const notice = page.locator('#arSeqExportBlockedNotice');
    await expect(notice).toBeVisible();
    const noticeText = (await notice.textContent()) ?? '';
    // D5: the page's own i18n message, not the module's raw English `reason`
    // ("span-tagging-export: tokenizer.version is required for token_unit word").
    expect(noticeText).toContain('版本');
    expect(noticeText).not.toContain('span-tagging-export');
    expect(noticeText).not.toContain('tokenizer.version');
    expect(noticeText).not.toContain('is required for token_unit word');

    // Blocked path also keeps the dialog open (same group-2 decision as the
    // success path) so the notice stays readable.
    await expect(page.locator('#arSeqExportModal')).toBeVisible();
  });

  test('a blocked export produces no downloaded file and leaves the export-history row count unchanged', async ({ page }) => {
    await gotoAnnotationResults(page, SEQ_TAGGING_TASK_ID);
    const historyRowsBefore = await page.locator('#arExportHistoryBody tr').count();

    await page.locator('#arExportJsonBtn').click();
    await expect(page.locator('#arSeqExportModal')).toBeVisible();
    await page.locator('#arSeqExportUnitSelect').selectOption('word');
    await page.locator('#arSeqExportTokenizerSelect').selectOption(TOKENIZER_ENGINE_MISSING_VERSION);

    let downloadFired = false;
    page.once('download', () => {
      downloadFired = true;
    });
    await page.locator('#arSeqExportConfirmBtn').click();
    await expect(page.locator('#arSeqExportBlockedNotice')).toBeVisible();
    // No waitForEvent race: give a genuine download a window to fire before
    // asserting its absence.
    await page.waitForTimeout(300);
    expect(downloadFired).toBe(false);

    const historyRowsAfter = await page.locator('#arExportHistoryBody tr').count();
    expect(historyRowsAfter).toBe(historyRowsBefore);
  });

  test('the blocked-export click flow never triggers a page error from reading a field absent on the module\'s blocked result (design.md D5)', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });

    await gotoAnnotationResults(page, SEQ_TAGGING_TASK_ID);
    await page.locator('#arExportJsonBtn').click();
    await expect(page.locator('#arSeqExportModal')).toBeVisible();
    await page.locator('#arSeqExportUnitSelect').selectOption('word');
    await page.locator('#arSeqExportTokenizerSelect').selectOption(TOKENIZER_ENGINE_MISSING_VERSION);
    await page.locator('#arSeqExportConfirmBtn').click();
    await expect(page.locator('#arSeqExportBlockedNotice')).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test('switching back to character in the same dialog after a blocked attempt exports normally with no tokenizer fields and no expansion summary', async ({ page }) => {
    await gotoAnnotationResults(page, SEQ_TAGGING_TASK_ID);
    await page.locator('#arExportJsonBtn').click();
    await expect(page.locator('#arSeqExportModal')).toBeVisible();
    await page.locator('#arSeqExportUnitSelect').selectOption('word');
    await page.locator('#arSeqExportTokenizerSelect').selectOption(TOKENIZER_ENGINE_MISSING_VERSION);
    await page.locator('#arSeqExportConfirmBtn').click();
    await expect(page.locator('#arSeqExportBlockedNotice')).toBeVisible();

    await page.locator('#arSeqExportUnitSelect').selectOption('character');
    const payload = await downloadDialogExport(page);

    const keys = allKeys(payload);
    expect(keys.has('tokenizer')).toBe(false);
    expect(keys.has('alignment_mode')).toBe(false);
    expect(keys.has('expanded_span_count')).toBe(false);
    await expect(page.locator('#arSeqExportExpansionSummary')).toBeHidden();
  });
});

/*
 * --- task 2.5 addendum (design.md decision D2) ---
 *
 * `buildJsonExportPayload()` (task-detail.html:9331) hardcodes
 * `schema_version: '1.0.0'` in the JSON manifest today. design.md D2 (2026-09-16
 * maintainer ruling) requires this to become `1.1.0` -- a MINOR bump because
 * the six new fields (D1) are an additive, backward-compatible change for
 * downstream parsers.
 *
 * `schema_version` lives only in the JSON manifest (buildJsonExportPayload),
 * never in JSON-MIN (buildJsonMinExportPayload has no manifest at all, per
 * task-detail.html:9389-9424) -- so unlike the other tests in this file, the
 * three cases below deliberately do NOT assert anything about JSON-MIN.
 *
 * The point of testing all three of T006-character, T006-word and T010 here
 * is that `schema_version` is a single export-*format*-level constant, not a
 * per-task-type or per-token-unit value: T006 (sequence_tagging) goes through
 * `#arSeqExportModal` on both the character and word paths, while T010
 * (entity_recognition) never opens that dialog at all (task 1.1 above) and
 * downloads immediately from `performArExport('json')`. All three must
 * observe the identical `1.1.0` string so a future Green fix cannot special-case
 * the bump onto only one of these call paths.
 */
test.describe('issue #742 -- sequence_tagging export dialog (task 2.5: design.md D2 schema_version pinned to 1.1.0)', () => {
  test('T006 (sequence_tagging) character-level JSON export manifest.schema_version is 1.1.0', async ({ page }) => {
    await gotoAnnotationResults(page, SEQ_TAGGING_TASK_ID);
    await page.locator('#arExportJsonBtn').click();
    await expect(page.locator('#arSeqExportModal')).toBeVisible();
    await expect(page.locator('#arSeqExportUnitSelect')).toHaveValue('character');

    const payload = (await downloadDialogExport(page)) as { manifest?: Record<string, unknown> };
    expect(payload.manifest?.schema_version).toBe('1.1.0');
  });

  test('T006 (sequence_tagging) word-level JSON export manifest.schema_version is 1.1.0', async ({ page }) => {
    await gotoAnnotationResults(page, SEQ_TAGGING_TASK_ID);
    await page.locator('#arExportJsonBtn').click();
    await expect(page.locator('#arSeqExportModal')).toBeVisible();
    await page.locator('#arSeqExportUnitSelect').selectOption('word');
    await page.locator('#arSeqExportTokenizerSelect').selectOption(TOKENIZER_ENGINE_WITH_VERSION);

    const payload = (await downloadDialogExport(page)) as { manifest?: Record<string, unknown> };
    expect(payload.manifest?.schema_version).toBe('1.1.0');
  });

  test('T010 (entity_recognition) JSON export manifest.schema_version is 1.1.0 -- same value as the sequence_tagging cases even though this path never opens #arSeqExportModal', async ({ page }) => {
    await gotoAnnotationResults(page, ENTITY_RECOGNITION_TASK_ID);

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#arExportJsonBtn').click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(downloadPath).not.toBeNull();
    const raw = await fsp.readFile(downloadPath as string, 'utf8');
    const payload = JSON.parse(raw) as { manifest?: Record<string, unknown> };

    expect(payload.manifest?.schema_version).toBe('1.1.0');
  });
});
