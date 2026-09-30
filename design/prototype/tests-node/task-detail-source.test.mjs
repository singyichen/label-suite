/* Static source gate over pages/task-management/task-detail.html (migrated by
 * issue #1059 group 2 out of two Playwright specs).
 *
 * Grouped by the scanned artifact, not by originating spec: all seven cases
 * are occurrence/ban-literal scans over the same one page source, which is
 * also the only artifact a mutation has to touch to prove the guard works.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE_PATH = resolve(HERE, '../pages/task-management/task-detail.html');
const source = readFileSync(SOURCE_PATH, 'utf8');

/* ------------------------------------------------------------------ *
 * From tests/task-management/issue-742-seq-tagging-export-dialog.spec.ts
 *
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-020, AC-1.10, SC-045
 *
 * SC-045 source-scan guard (tasks.md group 1, task 1.3, issue #742): the
 * sequence derivation must have a single entry point in the shared module,
 * the page must never restate a tagging-scheme prefix or the scheme/unit
 * value domains as literals, and the entity_recognition export branch must
 * stay untouched by this change.
 * ------------------------------------------------------------------ */
describe('issue #742 -- sequence_tagging export dialog (task 1.3: SC-045 source-scan guard)', () => {
  it('LabelSuiteSpanTaggingExport.deriveSequence has exactly one call site in task-detail.html (single derivation entry point)', () => {
    const count = (source.match(/\bderiveSequence\(/g) || []).length;
    assert.strictEqual(
      count,
      1,
      `deriveSequence( must have exactly one call site in task-detail.html, found ${count}`,
    );
  });

  it('task-detail.html never concatenates a B-/I-/E-/S- tag prefix literal', () => {
    let literalCount = 0;
    for (const prefix of ['B-', 'I-', 'E-', 'S-']) {
      literalCount += (source.match(new RegExp(`'${prefix}'`, 'g')) || []).length;
      literalCount += (source.match(new RegExp(`"${prefix}"`, 'g')) || []).length;
    }
    assert.strictEqual(
      literalCount,
      0,
      `tag prefixes must come from the shared module, found ${literalCount} B-/I-/E-/S- literal(s) in task-detail.html`,
    );
  });

  it('the scheme/unit option domains are rendered from the shared module constants, not a second hardcoded list', () => {
    // Reference-count assertion on the module's own identifiers (FR-020(1)):
    // rendering MUST read LabelSuiteSpanTaggingExport.EXPORT_TAGGING_SCHEMES /
    // .EXPORT_TOKEN_UNITS, not restate the value domain as a literal array.
    const schemeConstantRefs = (source.match(/EXPORT_TAGGING_SCHEMES/g) || []).length;
    const unitConstantRefs = (source.match(/EXPORT_TOKEN_UNITS/g) || []).length;
    assert.ok(
      schemeConstantRefs >= 1,
      `task-detail.html must reference EXPORT_TAGGING_SCHEMES at least once, found ${schemeConstantRefs}`,
    );
    assert.ok(
      unitConstantRefs >= 1,
      `task-detail.html must reference EXPORT_TOKEN_UNITS at least once, found ${unitConstantRefs}`,
    );

    const literalSchemeArray = (
      source.match(/\[\s*['"]BIO['"]\s*,\s*['"]BIOES['"]\s*,\s*['"]IOB2['"]\s*\]/g) || []
    ).length;
    assert.strictEqual(
      literalSchemeArray,
      0,
      `the tagging-scheme domain must not be restated as a literal array, found ${literalSchemeArray}`,
    );

    const literalUnitArray = (
      source.match(/\[\s*['"]character['"]\s*,\s*['"]word['"]\s*\]/g) || []
    ).length;
    assert.strictEqual(
      literalUnitArray,
      0,
      `the token-unit domain must not be restated as a literal array, found ${literalUnitArray}`,
    );
  });

  it('the entity_recognition export branch (buildTaskSpecificExportFields entities fallback) never calls deriveSequence', () => {
    // Anchors are the current, unmodified entities-fallback branch text
    // (tasks.md scope: T010/entity_recognition export fields MUST NOT
    // change) through the next function declaration -- if a future edit
    // renames these anchors it has touched code this change must leave
    // alone.
    const startAnchor = 'fields.entities = value && value.entities ? cloneExportValue(value.entities) : [];';
    const endAnchor = 'function buildExportAnnotationRecord';
    const startIndex = source.indexOf(startAnchor);
    const endIndex = source.indexOf(endAnchor);
    assert.ok(
      startIndex > -1,
      `the entities-fallback anchor must still exist in task-detail.html: ${startAnchor}`,
    );
    assert.ok(
      endIndex > startIndex,
      `the "${endAnchor}" anchor must follow the entities-fallback anchor (got ${endIndex} after ${startIndex})`,
    );

    const entityBranch = source.slice(startIndex, endIndex);
    assert.ok(
      !entityBranch.includes('deriveSequence'),
      'the entity_recognition export branch must not call deriveSequence',
    );
  });
});

/* ------------------------------------------------------------------ *
 * From tests/task-management/issue-726-url-view-state.spec.ts
 *
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-019, AC-1.8, SC-044
 *
 * 1.2 source-scan guards (design.md D1/D2/D3 structural contract, issue
 * #726): URL view-state write-back must not create history entries and must
 * converge on one function, and the review-status enum must have a single
 * hardcoded definition.
 * ------------------------------------------------------------------ */
describe('Task detail URL view-state (issue #726) -- 1.2 source-scan guards (design.md D1/D2/D3 structural contract)', () => {
  it('history.pushState() is never used -- filtering/pagination MUST NOT create history entries', () => {
    const count = (source.match(/history\.pushState\(/g) || []).length;
    assert.strictEqual(
      count,
      0,
      `task-detail.html must never call history.pushState(), found ${count} call(s)`,
    );
  });

  it('history.replaceState() calls converge on a single write-back function', () => {
    // design.md D1/D2: one syncUrlToViewState() function is the only
    // caller of history.replaceState(); ~20 individual filter/sort/page
    // handlers must NOT each call it directly.
    const count = (source.match(/history\.replaceState\(/g) || []).length;
    assert.strictEqual(
      count,
      1,
      `history.replaceState( must have exactly one call site (syncUrlToViewState), found ${count}`,
    );
  });

  it('the review-status legal-value set has exactly one hardcoded definition (Generalization-First)', () => {
    // AR_REVIEW_STATUS_ORDER is the sole source of truth for the
    // ar_review_status enum (design.md D5); a second hardcoded copy in
    // the URL-parsing code would silently drift from it the next time a
    // status is added.
    // Three-state as of spec 014 v3.0.0 (issue #688); the former
    // `approved`/`modified` interim states were retired (issue #807).
    const literalArrayCount = (
      source.match(/\['pending', 'disputed', 'finalized'\]/g) || []
    ).length;
    assert.strictEqual(
      literalArrayCount,
      1,
      `the review-status literal array must be defined exactly once, found ${literalArrayCount}`,
    );

    const identifierCount = (source.match(/AR_REVIEW_STATUS_ORDER/g) || []).length;
    // 1 definition + at least 1 usage site; a URL-parsing validator that
    // reads this identifier adds a further usage site instead of a new
    // literal array.
    assert.ok(
      identifierCount >= 2,
      `AR_REVIEW_STATUS_ORDER must have a definition plus at least one usage site, found ${identifierCount} reference(s)`,
    );
  });
});
