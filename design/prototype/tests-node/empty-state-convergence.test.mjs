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
  {
    name: 'batch 2 (dataset-analysis-detail)',
    html: [
      'pages/dataset/dataset-analysis-detail.html',
    ],
    partials: [
      'pages/dataset/dataset-analysis-detail.partials/quality-single_label.html',
      'pages/dataset/dataset-analysis-detail.partials/quality-single_dim.html',
      'pages/dataset/dataset-analysis-detail.partials/quality-multi_label.html',
    ],
    js: [],
    legacy: [
      'stats-empty',
      'stats-empty-icon',
      'stats-empty-title',
      'stats-empty-desc',
      'quality-empty',
      'quality-empty-icon',
      'quality-empty-title',
      'quality-empty-desc',
      'anomaly-empty',
    ],
    markers: {
      'pages/dataset/dataset-analysis-detail.partials/quality-single_label.html': ['empty-state', 'empty-state-panel', 'empty-state-compact'],
      'pages/dataset/dataset-analysis-detail.partials/quality-single_dim.html': ['empty-state', 'empty-state-panel', 'empty-state-compact'],
      'pages/dataset/dataset-analysis-detail.partials/quality-multi_label.html': ['empty-state', 'empty-state-panel', 'empty-state-compact'],
    },
    // Page-level empty blocks: id -> inner element ids that must stay.
    blocks: {
      statsEmpty: ['statsEmptyTitle', 'statsEmptyDesc'],
      qualityEmpty: ['emptyTitle', 'emptyDesc'],
    },
    blocksFile: 'pages/dataset/dataset-analysis-detail.html',
    sharedExtra: ['empty-state-compact'],
    manifestRemoved: ['stats-empty', 'quality-empty'],
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
    for (const file of [...batch.html, ...(batch.partials ?? []), ...batch.js]) {
      for (const token of batch.legacy ?? LEGACY) {
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

for (const batch of BATCHES.filter((b) => b.blocks)) {
  describe(`empty-state DOM contract: ${batch.name}`, () => {
    // Slice from the element's opening tag to the next sibling-level block end
    // (next id'd block or 600 chars) -- enough to see its icon/title/desc children.
    const blockHtml = (html, id) => {
      const i = html.indexOf(`id="${id}"`);
      assert.notEqual(i, -1, `#${id} not found`);
      const open = html.lastIndexOf('<', i);
      return { tag: html.slice(open, html.indexOf('>', i) + 1), body: html.slice(i, i + 900) };
    };
    for (const [id, innerIds] of Object.entries(batch.blocks)) {
      const cls = (re, tag) => assert.match(tag, re);
      it(`#${id} carries classes empty-state and empty-state-panel`, () => {
        const { tag } = blockHtml(read(batch.blocksFile), id);
        const m = tag.match(/class="([^"]*)"/);
        assert.ok(m, `#${id} has no class attribute`);
        const classes = m[1].split(/\s+/);
        assert.ok(classes.includes('empty-state'), `#${id} lacks empty-state`);
        assert.ok(classes.includes('empty-state-panel'), `#${id} lacks empty-state-panel`);
        cls(/id=/, tag);
      });
      for (const child of ['empty-state-icon', 'empty-state-title', 'empty-state-desc']) {
        it(`#${id} contains .${child}`, () => {
          const { body } = blockHtml(read(batch.blocksFile), id);
          assert.match(body, new RegExp(`class="[^"]*(?<![\\w-])${child}(?![\\w-])`));
        });
      }
      for (const inner of innerIds) {
        it(`#${id} keeps inner id ${inner}`, () => {
          assert.match(read(batch.blocksFile), new RegExp(`id="${inner}"`));
        });
      }
    }
    for (const name of batch.sharedExtra) {
      it(`${SHARED_CSS} defines .${name}`, () => {
        assert.ok(existsSync(join(ROOT, SHARED_CSS)), `${SHARED_CSS} is missing`);
        assert.match(read(SHARED_CSS), new RegExp(`\\.${name}(?![\\w-])`));
      });
    }
    for (const name of batch.manifestRemoved) {
      it(`manifest transitionalClasses no longer lists ${name}`, () => {
        const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
        const listed = (manifest.classScan?.transitionalClasses ?? []).flatMap((t) => t.classes);
        assert.ok(!listed.includes(name), `${name} still transitional`);
      });
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
