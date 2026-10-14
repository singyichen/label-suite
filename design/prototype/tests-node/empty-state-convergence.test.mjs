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

// Class-context token extraction for files where a bare word search would
// match prose/identifiers (e.g. "empty" in JS). Collects tokens from
// class="..." / class=\"...\" attributes, className = '...', setAttribute
// ('class', '...'), classList.add/remove/toggle('...'), and CSS selectors
// (whole .css files, or <style> blocks of .html files).
function classTokens(rel) {
  const text = read(rel);
  const out = new Set();
  const addList = (str) => str.split(/\s+/).filter(Boolean).forEach((t) => out.add(t));
  for (const m of text.matchAll(/\bclass\s*=\s*\\?["']([^"'\\]*)/g)) addList(m[1]);
  for (const m of text.matchAll(/\bclassName\s*=\s*['"]([^'"]*)['"]/g)) addList(m[1]);
  for (const m of text.matchAll(/setAttribute\(\s*['"]class['"]\s*,\s*['"]([^'"]*)['"]/g)) addList(m[1]);
  for (const m of text.matchAll(/classList\.\w+\(([^)]*)\)/g)) {
    for (const q of m[1].matchAll(/['"]([^'"]+)['"]/g)) addList(q[1]);
  }
  let css = '';
  if (rel.endsWith('.css')) css = text;
  else for (const m of text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) css += m[1];
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of css.matchAll(/(?<!\d)\.(-?[_a-zA-Z][\w-]*)/g)) out.add(m[1]);
  return out;
}

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
  {
    name: 'batch 3 (sidebar notifications, dashboard, annotation-list)',
    classContext: true,
    markers: {},
    html: ['pages/annotation/annotation-list.html'],
    js: ['pages/shared/sidebar.js', 'pages/dashboard/dashboard.js'],
    css: ['pages/shared/sidebar.css', 'pages/dashboard/dashboard.layout.css'],
    // Legacy class tokens banned per file (class contexts only).
    legacyByFile: {
      'pages/annotation/annotation-list.html': ['empty', 'empty-msg'],
      'pages/shared/sidebar.js': ['notif-empty'],
      'pages/shared/sidebar.css': ['notif-empty'],
      'pages/dashboard/dashboard.js': ['list-empty'],
      'pages/dashboard/dashboard.layout.css': ['list-empty'],
    },
    // Class tokens that must be present (class contexts only).
    classMarkers: {
      'pages/annotation/annotation-list.html': ['empty-state', 'empty-state-panel', 'empty-state-desc', 'empty-state-action'],
      'pages/shared/sidebar.js': ['empty-state', 'empty-state-compact'],
      'pages/dashboard/dashboard.js': ['empty-state', 'empty-state-compact'],
    },
    // sidebar.css is loaded by every page: shared sheet must be its first statement.
    firstStatement: { file: 'pages/shared/sidebar.css', statement: '@import url("./empty-state.css");' },
    // dashboard keeps its test id on the converged element.
    literals: { 'pages/dashboard/dashboard.js': ['data-testid="task-list-empty"'] },
    manifestRemoved: ['empty', 'list-empty', 'notif-empty'],
  },
  {
    name: 'batch 4 (workspace history, audit drawers)',
    classContext: true,
    markers: {},
    html: [
      'pages/annotation/annotation-workspace.html',
      'pages/admin/user-management.html',
      'pages/admin/role-settings.html',
    ],
    js: ['pages/annotation/annotation-workspace.config.js'],
    legacyByFile: {
      'pages/annotation/annotation-workspace.html': ['history-empty'],
      'pages/annotation/annotation-workspace.config.js': ['history-empty'],
      'pages/admin/user-management.html': ['audit-drawer-empty'],
      'pages/admin/role-settings.html': ['audit-drawer-empty'],
    },
    classMarkers: {
      'pages/annotation/annotation-workspace.config.js': ['empty-state', 'empty-state-compact'],
      'pages/admin/user-management.html': ['empty-state', 'empty-state-compact'],
      'pages/admin/role-settings.html': ['empty-state', 'empty-state-compact'],
    },
    // Audit drawer keeps its ids (JS toggles #auditDrawerEmpty, writes #auditDrawerEmptyText).
    literals: {
      'pages/admin/user-management.html': ['id="auditDrawerEmpty"', 'id="auditDrawerEmptyText"'],
      'pages/admin/role-settings.html': ['id="auditDrawerEmpty"', 'id="auditDrawerEmptyText"'],
    },
    manifestRemoved: ['history-empty', 'audit-drawer-empty'],
  },
  {
    name: 'batch 5 (task-config engine, relation partial)',
    classContext: true,
    markers: {},
    // No `html` entries: the per-html link loop must not apply to partials/js/css.
    html: [],
    js: ['pages/task-management/task-config.engine.js'],
    legacyByFile: {
      'pages/task-management/task-config.engine.js': ['annotation-preview-empty', 'taxonomy-selector-empty'],
      'pages/task-management/task-config.css': ['annotation-preview-empty', 'taxonomy-selector-empty'],
      'pages/dataset/dataset-analysis-detail.partials/quality-relation_identification.html': ['anomaly-empty'],
      // Alias removed: the shared sheet must no longer carry the anomaly-empty selector.
      'pages/shared/empty-state.css': ['anomaly-empty'],
    },
    classMarkers: {
      'pages/task-management/task-config.engine.js': ['empty-state', 'empty-state-compact'],
      'pages/dataset/dataset-analysis-detail.partials/quality-relation_identification.html': ['empty-state', 'empty-state-panel', 'empty-state-compact'],
      'pages/shared/empty-state.css': ['empty-state-compact'],
    },
    // The outlier empty block keeps its id (JS toggles #anomRelOutlierEmpty).
    literals: {
      'pages/dataset/dataset-analysis-detail.partials/quality-relation_identification.html': ['id="anomRelOutlierEmpty"'],
    },
    manifestRemoved: ['anomaly-empty', 'annotation-preview-empty', 'taxonomy-selector-empty'],
  },
  {
    name: 'batch 6 (task-detail)',
    classContext: true,
    markers: {},
    // Partials are deliberately not in `html`: the shared sheet is linked once, from the host page.
    html: ['pages/task-management/task-detail.html'],
    js: [],
    legacyByFile: {
      'pages/task-management/task-detail.html': [
        'ar-empty-state', 'ar-empty-icon', 'ar-empty-title', 'ar-empty-hint',
        'ar-export-empty', 'member-detail-empty', 'member-search-empty',
        'progress-empty-state', 'progress-empty-title',
        'worklog-empty-state', 'worklog-empty-icon', 'worklog-empty-title',
        'annotation-preview-empty',
      ],
      'pages/task-management/task-detail.panels/annotation-progress.html': ['progress-empty-state', 'progress-empty-title', 'member-detail-empty'],
      'pages/task-management/task-detail.panels/annotation-results.html': ['ar-empty-state', 'ar-empty-icon', 'ar-empty-title', 'ar-empty-hint', 'ar-export-empty'],
      'pages/task-management/task-detail.panels/work-log.html': ['worklog-empty-state', 'worklog-empty-icon', 'worklog-empty-title'],
    },
    classMarkers: {
      // JS-built member-search rows: tr.empty-state-row > td.empty-state-td > div.empty-state.empty-state-cell > p.empty-state-desc
      'pages/task-management/task-detail.html': ['empty-state', 'empty-state-row', 'empty-state-td', 'empty-state-cell', 'empty-state-desc'],
      'pages/task-management/task-detail.panels/annotation-progress.html': ['empty-state', 'empty-state-panel', 'empty-state-title', 'empty-state-action', 'empty-state-compact'],
      'pages/task-management/task-detail.panels/annotation-results.html': ['empty-state', 'empty-state-panel', 'empty-state-icon', 'empty-state-title', 'empty-state-desc', 'empty-state-compact'],
      'pages/task-management/task-detail.panels/work-log.html': ['empty-state', 'empty-state-panel', 'empty-state-icon', 'empty-state-title', 'empty-state-action'],
    },
    // Hooks that JS / tests rely on must survive the class swap.
    literals: {
      'pages/task-management/task-detail.panels/annotation-progress.html': ['id="progressEmptyState"', 'id="progressEmptyTitle"', 'id="finalExceptionPoolEmpty"', 'id="memberDetailEmpty"'],
      'pages/task-management/task-detail.panels/annotation-results.html': ['id="arEmptyState"', 'id="arEmptyTitle"', 'id="arEmptyHint"', 'id="arExportHistoryEmpty"'],
      'pages/task-management/task-detail.panels/work-log.html': ['id="workLogEmptyState"', 'id="workLogEmptyTitle"', 'id="workLogBackToOverviewBtn"'],
    },
    manifestRemoved: ['ar-empty', 'ar-export-empty', 'member-detail-empty', 'member-search-empty', 'progress-empty', 'worklog-empty'],
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
    for (const file of batch.classContext ? [] : [...batch.html, ...(batch.partials ?? []), ...batch.js]) {
      for (const token of batch.legacy ?? LEGACY) {
        it(`${file} has no legacy token ${token}`, () => {
          assert.doesNotMatch(read(file), legacyRe(token));
        });
      }
    }
    for (const [file, tokens] of Object.entries(batch.legacyByFile ?? {})) {
      for (const token of tokens) {
        it(`${file} has no class token ${token}`, () => {
          assert.ok(!classTokens(file).has(token), `${file} still uses class ${token}`);
        });
      }
    }
    for (const [file, tokens] of Object.entries(batch.classMarkers ?? {})) {
      for (const token of tokens) {
        it(`${file} uses class ${token}`, () => {
          assert.ok(classTokens(file).has(token), `${file} lacks class ${token}`);
        });
      }
    }
    if (batch.firstStatement) {
      const { file, statement } = batch.firstStatement;
      it(`${file} starts with ${statement}`, () => {
        const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '').trimStart();
        assert.ok(css.startsWith(statement), `first statement is not ${statement}`);
      });
    }
    for (const [file, lits] of Object.entries(batch.literals ?? {})) {
      for (const lit of lits) {
        it(`${file} keeps ${lit}`, () => {
          assert.ok(read(file).includes(lit));
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

for (const batch of BATCHES.filter((b) => !b.blocks && b.manifestRemoved)) {
  describe(`empty-state manifest: ${batch.name}`, () => {
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

// Manifest hygiene (issue #1189 close-out): no transitional exceptions left, and
// the page-local registry holds narrow prefixes rather than 1-4 letter catch-alls.
describe('empty-state manifest hygiene', () => {
  const manifest = () => JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const OVERLY_GENERIC = ['t', 'is', 'ar', 'item', 're', 'rv', 's2', 'sa', 'sr', 'md', 'na', 'kv', 'ws', 'td', 'sys', 'trb', 'va', 'mod', 'rel', 'task', 'status'];
  const NARROWED = ['t-pass', 't-fail', 'is-loading', 'is-active', 'is-dark', 'is-on', 'is-settings', 'is-integrated', 'ar-review', 'ar-history', 'ar-summary', 'ar-expand', 'ar-id', 'ar-completed', 'ar-stage', 'ar-seq', 'ar-export', 'ar-filter', 'item-pair', 're-preview', 'rv-btn', 'rv-choice', 'rv-answer', 'rv-correction', 'rv-review', 'rv-decision', 'rv-section', 'rv-merged', 'rv-finalized', 'rv-unit', 'rv-flow', 'rv-submit', 's2-primary', 's2-preview', 's2-layout', 's2-visual', 's2-settings', 's2-code', 'sa-col', 'sr-only', 'md-id', 'md-text', 'md-time', 'na-cell', 'kv-dl', 'kv-sub', 'ws-lock', 'ws-finalized', 'ws-bypass', 'td-muted', 'td-actions', 'sys-col', 'sys-bg', 'trb-text', 'va-dim', 'mod-rate', 'rel-sel', 'task-col', 'task-role', 'task-bg', 'task-check', 'task-item', 'task-table', 'task-row', 'task-name', 'task-type', 'task-header', 'status-badge', 'status-hint', 'status-stepper'];

  it('classScan.transitionalClasses is an empty array', () => {
    const t = manifest().classScan?.transitionalClasses;
    assert.ok(Array.isArray(t), 'transitionalClasses is not an array');
    assert.deepEqual(t, []);
  });

  it('pageLocalClasses.classes holds no overly generic prefix', () => {
    const classes = manifest().classScan?.pageLocalClasses?.classes ?? [];
    const found = OVERLY_GENERIC.filter((p) => classes.includes(p));
    assert.deepEqual(found, [], `generic prefixes still registered: ${found.join(', ')}`);
  });

  for (const prefix of NARROWED) {
    it(`pageLocalClasses.classes contains narrowed prefix ${prefix}`, () => {
      const classes = manifest().classScan?.pageLocalClasses?.classes ?? [];
      assert.ok(classes.includes(prefix), `${prefix} is not registered`);
    });
  }
});
