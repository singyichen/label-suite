/* Static gate for the task-detail KPI cells adopting the shared MASTER "Metric KPI Tile" (issue #1391 PR-B).
 *
 * The three page-local KPI cell families (.exec-round-item, .progress-metric-item, .kv-item) converge on
 * the shared `.metric` component defined in pages/shared/metric.css (design/system/MASTER.md "Metric KPI Tile").
 * Layout grids (.exec-round-grid, .progress-metric-grid, .worklog-summary-grid, .kv-grid), the `kv-sub` note
 * and the composite `review-progress-breakdown` cell are intentionally kept.
 *
 * Traceability: design/system/MASTER.md (Metric KPI Tile -- design-system contract, not a feature-spec FR)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const DIR = 'pages/task-management';
const read = (rel) => readFileSync(resolve(ROOT, rel), 'utf8');

const PAGE = `${DIR}/task-detail.html`;
const PANELS = {
  overview: { file: `${DIR}/task-detail.panels/overview.html`, cells: 4 },
  'annotation-progress': { file: `${DIR}/task-detail.panels/annotation-progress.html`, cells: 6 },
  'work-log': { file: `${DIR}/task-detail.panels/work-log.html`, cells: 4 },
};
const FILES = [PAGE, ...Object.values(PANELS).map((p) => p.file)];

const OLD_CLASSES = [
  'kv-item', 'kv-key', 'kv-value',
  'progress-metric-item', 'progress-metric-key', 'progress-metric-value',
  'exec-round-item', 'exec-round-key', 'exec-round-value',
];

// A class token: delimited by non-class characters (so kv-grid / kv-sub / exec-round-grid never match).
const tokenRe = (name) => new RegExp(`(?<![\\w-])${name}(?![\\w-])`);

describe('task-detail KPI cells adopt the shared .metric component (issue #1391)', () => {
  for (const file of FILES) {
    for (const name of OLD_CLASSES) {
      it(`${file} no longer uses the legacy class "${name}"`, () => {
        const src = read(file);
        const selector = new RegExp(`\\.${name}(?![\\w-])`);
        const classAttr = new RegExp(`class="[^"]*(?<![\\w-])${name}(?![\\w-])[^"]*"`);
        assert.ok(!selector.test(src), `${file} still has the CSS/JS selector .${name}`);
        assert.ok(!classAttr.test(src), `${file} still has class token ${name}`);
        assert.ok(!tokenRe(name).test(src.replace(/id="[^"]*"/g, '')), `${file} still mentions ${name}`);
      });
    }
  }

  it('task-detail.html links the shared metric.css', () => {
    assert.match(read(PAGE), /<link[^>]+rel="stylesheet"[^>]+href="\.\.\/shared\/metric\.css"/);
  });

  it('task-detail.html defines no page-local .metric rule (single source in shared/metric.css)', () => {
    assert.ok(!/(^|[\s,}{])\.metric(?![\w-])[^{]*\{/m.test(read(PAGE)), 'task-detail.html redefines .metric');
  });

  for (const [name, { file, cells }] of Object.entries(PANELS)) {
    it(`${name} panel has exactly ${cells} class="metric" cells`, () => {
      const n = (read(file).match(/class="metric"/g) || []).length;
      assert.equal(n, cells);
    });
  }

  it('annotation-progress keeps the residual review-progress-breakdown composite cell and its ids', () => {
    const src = read(PANELS['annotation-progress'].file);
    assert.match(src, /review-progress-breakdown/);
    for (const id of ['reviewProgressBreakdownLabel', 'reviewFinalizedCount', 'reviewDisputedCount', 'reviewPendingArbitrationCount']) {
      assert.ok(src.includes(`id="${id}"`), `missing id ${id}`);
    }
  });

  it('work-log avg-per-item sub-note is a <small> (not a span styled by .metric span)', () => {
    assert.match(read(PANELS['work-log'].file), /<small[^>]*id="workLogSummaryAvgPerItemValue"/);
  });
});
