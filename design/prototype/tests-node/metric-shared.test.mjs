/* Static gate for the shared .metric component (issue #1391, PR-A).
 *
 * The .metric / .metric span / .metric strong rules move verbatim out of
 * pages/dashboard/dashboard.layout.css into pages/shared/metric.css, which
 * dashboard.layout.css pulls in with its very first statement.
 *
 * Traceability: design/system/MASTER.md (design-system contract, not a FR)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHARED = resolve(ROOT, 'pages/shared/metric.css');
const LAYOUT = resolve(ROOT, 'pages/dashboard/dashboard.layout.css');

const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('shared metric.css (issue #1391)', () => {
  it('pages/shared/metric.css exists', () => {
    assert.ok(existsSync(SHARED), 'pages/shared/metric.css is missing');
  });

  it('metric.css defines .metric, .metric span and .metric strong', () => {
    assert.ok(existsSync(SHARED), 'pages/shared/metric.css is missing');
    const css = strip(readFileSync(SHARED, 'utf8'));
    assert.match(css, /\.metric\s*\{/);
    assert.match(css, /\.metric span\s*\{/);
    assert.match(css, /\.metric strong\s*\{/);
  });

  it('dashboard.layout.css no longer defines the .metric rules itself', () => {
    const css = strip(readFileSync(LAYOUT, 'utf8'));
    assert.doesNotMatch(css, /\.metric\s*\{/);
    assert.doesNotMatch(css, /\.metric span\s*\{/);
    assert.doesNotMatch(css, /\.metric strong\s*\{/);
  });

  it('dashboard.layout.css keeps .metrics grid rules (out of scope of the move)', () => {
    const css = strip(readFileSync(LAYOUT, 'utf8'));
    assert.match(css, /\.metrics\s*\{/);
    assert.match(css, /\.metrics\.metrics-readable-labels\s*\{/);
    assert.match(css, /\.metrics-demo-note\s*\{/);
  });

  it('dashboard.layout.css starts with @import of the shared metric.css', () => {
    const first = strip(readFileSync(LAYOUT, 'utf8')).trim().split(';')[0].trim();
    assert.equal(first, '@import url("../shared/metric.css")');
  });
});
