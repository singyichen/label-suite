/* Static gate for the empty-state class convergence (issue #1189).
 *
 * Per-page empty-state class families (empty-row*, empty-title, empty-desc,
 * page-local empty-state blocks) converge on one shared component defined in
 * pages/shared/empty-state.css and specified in design/system/MASTER.md
 * "Empty State". Each batch appends an entry to BATCHES; the cases below are
 * data-driven over that table.
 *
 * Traceability: design/system/MASTER.md (Empty State -- design-system contract,
 * not a feature-spec FR)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const MANIFEST = resolve(ROOT, '..', 'system', 'inventory-manifest.json');
const SHARED_CSS = 'pages/shared/empty-state.css';

const SHARED_SELECTORS = [
  'empty-state',
  'empty-state-icon',
  'empty-state-title',
  'empty-state-desc',
  'empty-state-action',
  'empty-state-cell',
  'empty-state-panel',
  'empty-state-page',
  'empty-state-td',
  'empty-state-dense',
];

// Legacy tokens: boundary match so empty-state-* never counts.
const LEGACY = [
  'empty-row',
  'empty-row-cell',
  'empty-row-wrap',
  'empty-row-title',
  'empty-row-desc',
  'empty-title',
  'empty-desc',
];
const legacyRe = (name) => new RegExp(`(?<![\\w-])${name}(?![\\w-])`);
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

// Append one entry per batch. `html` files must link the shared sheet;
// every file in `html` + `js` must be free of legacy tokens; `markers` maps
// file -> tokens that must be present after convergence.
const BATCHES = [
  {
    name: 'batch 1',
    html: [
      'pages/task-management/task-list.html',
      'pages/dataset/dataset-analysis-list.html',
      'pages/admin/user-management.html',
    ],
    js: ['pages/dataset/dataset-analysis-list.view.js'],
    markers: {
      'pages/task-management/task-list.html': ['empty-state-row'],
      'pages/dataset/dataset-analysis-list.view.js': ['empty-state-row'],
      'pages/admin/user-management.html': ['empty-state-page'],
    },
  },
];

describe('empty-state shared stylesheet', () => {
  it(`${SHARED_CSS} exists`, () => {
    assert.ok(existsSync(join(ROOT, SHARED_CSS)), `${SHARED_CSS} is missing`);
  });

  for (const name of SHARED_SELECTORS) {
    it(`defines .${name}`, () => {
      assert.ok(existsSync(join(ROOT, SHARED_CSS)), `${SHARED_CSS} is missing`);
      const css = read(SHARED_CSS);
      assert.match(css, new RegExp(`\\.${name}(?![\\w-])`), `.${name} not defined`);
    });
  }
});

for (const batch of BATCHES) {
  describe(`empty-state convergence: ${batch.name}`, () => {
    for (const file of batch.html) {
      it(`${file} links shared/empty-state.css`, () => {
        assert.match(read(file), /<link[^>]+href="\.\.\/shared\/empty-state\.css"/);
      });
    }
    for (const file of [...batch.html, ...batch.js]) {
      for (const token of LEGACY) {
        it(`${file} has no legacy token ${token}`, () => {
          assert.doesNotMatch(read(file), legacyRe(token));
        });
      }
    }
    for (const [file, tokens] of Object.entries(batch.markers)) {
      for (const token of tokens) {
        it(`${file} contains ${token}`, () => {
          assert.match(read(file), new RegExp(`(?<![\\w-])${token}(?![\\w-])`));
        });
      }
    }
  });
}

describe('empty-state inventory manifest', () => {
  it("classScan.componentClasses['empty-state'] includes 'empty-state'", () => {
    const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
    const classes = manifest.classScan?.componentClasses?.['empty-state'];
    assert.ok(Array.isArray(classes), "componentClasses['empty-state'] is missing");
    assert.ok(classes.includes('empty-state'));
  });
});
