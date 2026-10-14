/* Static gate for the dataset-analysis-detail stats KPI tiles adopting the shared MASTER "Metric KPI Tile" (issue #1453).
 *
 * The page-local KPI families (.stats-metric-card / -label / -value / -desc and .stats-inline-card) converge on
 * the shared `.metric` component defined in pages/shared/metric.css (design/system/MASTER.md "Metric KPI Tile").
 * The `.stats-metric-grid` layout grid and the `.stats-summary-*` blocks (not KPI tiles) are intentionally kept.
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
const DIR = 'pages/dataset';
const read = (rel) => readFileSync(resolve(ROOT, rel), 'utf8');

const PAGE = `${DIR}/dataset-analysis-detail.html`;
const PARTIALS = {
  entity_recognition: { file: `${DIR}/dataset-analysis-detail.partials/stats-entity_recognition.html`, cells: 1 },
  relation_identification: { file: `${DIR}/dataset-analysis-detail.partials/stats-relation_identification.html`, cells: 6 },
  sequence_tagging: { file: `${DIR}/dataset-analysis-detail.partials/stats-sequence_tagging.html`, cells: 1 },
};
const FILES = [PAGE, ...Object.values(PARTIALS).map((p) => p.file)];

const OLD_CLASSES = [
  'stats-metric-card', 'stats-metric-label', 'stats-metric-value', 'stats-metric-desc', 'stats-inline-card',
];

// A class token: delimited by non-class characters (so stats-metric-grid never matches).
const tokenRe = (name) => new RegExp(`(?<![\\w-])${name}(?![\\w-])`);
// Count KPI cells: class="metric" or class="metric metric-lg".
const countCells = (src) => (src.match(/class="metric(?:\s+metric-lg)?"/g) || []).length;
// Opening tag (with attributes) of the element carrying the given id.
const openTagOf = (src, id) => {
  const m = src.match(new RegExp(`<([a-z0-9]+)\\b[^>]*\\bid="${id}"[^>]*>`));
  assert.ok(m, `missing element with id ${id}`);
  return m[0];
};

describe('dataset-analysis-detail stats KPI tiles adopt the shared .metric component (issue #1453)', () => {
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

  it('dataset-analysis-detail.html links the shared metric.css', () => {
    assert.match(read(PAGE), /<link[^>]+rel="stylesheet"[^>]+href="\.\.\/shared\/metric\.css"/);
  });

  it('dataset-analysis-detail.html defines no page-local .metric rule (single source in shared/metric.css)', () => {
    assert.ok(!/(^|[\s,}{])\.metric(?![\w-])[^{]*\{/m.test(read(PAGE)), 'dataset-analysis-detail.html redefines .metric');
  });

  it('dataset-analysis-detail.html stats section has exactly 5 metric cells', () => {
    assert.equal(countCells(read(PAGE)), 5);
  });

  for (const [name, { file, cells }] of Object.entries(PARTIALS)) {
    it(`stats-${name} partial has exactly ${cells} metric cell(s)`, () => {
      assert.equal(countCells(read(file)), cells);
    });
  }

  it('hero tiles in entity_recognition / sequence_tagging use metric-lg', () => {
    for (const k of ['entity_recognition', 'sequence_tagging']) {
      assert.match(read(PARTIALS[k].file), /class="metric metric-lg"/, `${k} hero tile is not metric-lg`);
    }
  });

  it('kept layout grid .stats-metric-grid is still present', () => {
    assert.match(read(PAGE), /\.stats-metric-grid\s*\{/);
    assert.match(read(PARTIALS.relation_identification.file), /class="stats-metric-grid"/);
  });

  it('label ids are preserved and sit on a <span>', () => {
    const page = read(PAGE);
    for (const id of ['statsLblSentence', 'statsLblToken', 'statsLblCompletion', 'statsLblSubmitted', 'statsLblAvgTime']) {
      assert.match(openTagOf(page, id), /^<span\b/, `${id} must be a <span>`);
    }
    const rel = read(PARTIALS.relation_identification.file);
    for (const id of ['statsRelTotalTripleLabel', 'statsRelMaxTripleLabel']) {
      assert.match(openTagOf(rel, id), /^<span\b/, `${id} must be a <span>`);
    }
    assert.match(openTagOf(read(PARTIALS.entity_recognition.file), 'statsSeqAvgLabel'), /^<span\b/);
    assert.match(openTagOf(read(PARTIALS.sequence_tagging.file), 'statsSeqTagAvgLabel'), /^<span\b/);
  });

  it('description ids are preserved, carry metric-desc and are not a <span>', () => {
    const page = read(PAGE);
    const rel = read(PARTIALS.relation_identification.file);
    const cases = [
      [page, ['statsDescSentence', 'statsDescToken', 'statsDescCompletion', 'statsDescSubmitted', 'statsDescAvgTime']],
      [rel, ['statsRelTotalTripleDesc', 'statsRelUniqueTripleDesc', 'statsRelAvgTripleDesc', 'statsRelAnnotated5xDesc', 'statsRelAvgAnnotatorsDesc', 'statsRelMaxTripleDesc']],
    ];
    for (const [src, ids] of cases) {
      for (const id of ids) {
        const tag = openTagOf(src, id);
        assert.match(tag, /^<(div|p)\b/, `${id} must be a <div> or <p>`);
        assert.match(tag, /class="[^"]*(?<![\w-])metric-desc(?![\w-])[^"]*"/, `${id} must carry metric-desc`);
      }
    }
  });

  it('values are <strong> and the avg-time "s" suffix is a <small>, not a <span> inside <strong>', () => {
    const page = read(PAGE);
    assert.ok(!/<strong\b[^>]*>[^<]*<span\b/.test(page), 'a <span> still sits inside <strong>');
    assert.match(page, /<strong\b[^>]*>\s*48\s*<small\b[^>]*>\s*s\s*<\/small>/);
    assert.ok((page.match(/<strong\b/g) || []).length >= 5, 'expected a <strong> value per KPI cell');
  });

  it('shared metric.css defines .metric-desc and .metric-lg strong', () => {
    const css = read('pages/shared/metric.css');
    assert.match(css, /\.metric-desc\s*\{/);
    assert.match(css, /\.metric-lg\s+strong\s*\{/);
  });
});
