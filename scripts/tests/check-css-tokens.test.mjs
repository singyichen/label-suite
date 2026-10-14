import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', 'check-css-tokens.mjs');
const roots = [];

after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

// Build a fixture repo root: design/prototype/assets/tokens.css plus extra files.
function makeRoot(files, tokensCss = ':root { --color-primary: #123456; }\n') {
  const root = mkdtempSync(join(tmpdir(), 'css-tokens-'));
  roots.push(root);
  const all = { 'design/prototype/assets/tokens.css': tokensCss, ...files };
  for (const [rel, content] of Object.entries(all)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  return root;
}

function run(root, allowlist) {
  const args = [SCRIPT, '--root', root];
  if (allowlist !== undefined) {
    const file = join(root, 'allowlist.json');
    writeFileSync(file, typeof allowlist === 'string' ? allowlist : JSON.stringify(allowlist));
    args.push('--allowlist', file);
  } else {
    const file = join(root, 'allowlist.json');
    writeFileSync(file, '[]');
    args.push('--allowlist', file);
  }
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' });
  return { status: result.status, out: `${result.stdout}${result.stderr}` };
}

test('undefined token fails with file:line and token (C6-1)', () => {
  const root = makeRoot({
    'design/prototype/pages/a/page.html':
      '<html>\n<body>\n<div style="color: var(--missing-token)"></div>\n</body></html>\n',
  });
  const { status, out } = run(root);
  assert.equal(status, 1, out);
  assert.match(out, /design\/prototype\/pages\/a\/page\.html:3: undefined token --missing-token/);
});

test('undefined token with fallback still fails (C6-2)', () => {
  const root = makeRoot({
    'design/prototype/assets/extra.css': '.a {\n  color: var(--ghost, #fff);\n}\n',
  });
  const { status, out } = run(root);
  assert.equal(status, 1, out);
  assert.match(out, /design\/prototype\/assets\/extra\.css:2: undefined token --ghost/);
});

test('token defined in the same css file passes (C6-3)', () => {
  const root = makeRoot({
    'design/prototype/assets/local.css': ':root { --local-gap: 4px; }\n.a { margin: var(--local-gap); }\n',
  });
  const { status, out } = run(root);
  assert.equal(status, 0, out);
});

test('token defined in html <style> of the same file passes (C6-3)', () => {
  const root = makeRoot({
    'design/prototype/pages/b/page.html':
      '<style>\n:root { --page-only: 1px; }\n</style>\n<div style="padding: var(--page-only)"></div>\n',
  });
  const { status, out } = run(root);
  assert.equal(status, 0, out);
});

test('token defined in tokens.css passes (C6-4)', () => {
  const root = makeRoot({
    'design/prototype/pages/c/page.html': '<div style="color: var(--color-primary)"></div>\n',
  });
  const { status, out } = run(root);
  assert.equal(status, 0, out);
});

test('allowlisted (file, token) violation passes (C6-5)', () => {
  const file = 'design/prototype/pages/d/page.html';
  const root = makeRoot({ [file]: '<div style="color: var(--legacy)"></div>\n' });
  const { status, out } = run(root, [{ file, token: '--legacy', reason: 'tracked in #1379' }]);
  assert.equal(status, 0, out);
});

test('allowlist entry for a different file does not exempt the violation', () => {
  const file = 'design/prototype/pages/d/page.html';
  const root = makeRoot({ [file]: '<div style="color: var(--legacy)"></div>\n' });
  const { status, out } = run(root, [
    { file: 'design/prototype/pages/other.html', token: '--legacy', reason: 'wrong file' },
  ]);
  assert.equal(status, 1, out);
  assert.match(out, /page\.html:1: undefined token --legacy/);
});

test('new violation not in allowlist fails while allowlisted one is ignored', () => {
  const file = 'design/prototype/pages/e/page.html';
  const root = makeRoot({
    [file]: '<div style="color: var(--legacy)"></div>\n<div style="color: var(--brand-new)"></div>\n',
  });
  const { status, out } = run(root, [{ file, token: '--legacy', reason: 'tracked in #1379' }]);
  assert.equal(status, 1, out);
  assert.match(out, /page\.html:2: undefined token --brand-new/);
  assert.doesNotMatch(out, /undefined token --legacy/);
});

test('allowlist entry with empty reason invalidates the list', () => {
  const file = 'design/prototype/pages/f/page.html';
  const root = makeRoot({ [file]: '<div style="color: var(--legacy)"></div>\n' });
  const { status, out } = run(root, [{ file, token: '--legacy', reason: '   ' }]);
  assert.equal(status, 1, out);
  assert.match(out, /reason/i);
});

test('allowlist entry with missing reason invalidates the list', () => {
  const root = makeRoot({ 'design/prototype/pages/g/page.html': '<p>ok</p>\n' });
  const { status, out } = run(root, [{ file: 'design/prototype/pages/g/page.html', token: '--x' }]);
  assert.equal(status, 1, out);
  assert.match(out, /reason/i);
});

test('var() inside a CSS comment is ignored', () => {
  const root = makeRoot({
    'design/prototype/assets/commented.css':
      '/* old: color: var(--removed-token) */\n/*\n var(--multi-line-removed)\n*/\n.a { color: var(--color-primary); }\n',
  });
  const { status, out } = run(root);
  assert.equal(status, 0, out);
});

test('token from another token file (artifact-tokens.css) is not a global source', () => {
  const root = makeRoot({
    'design/prototype/assets/artifact-tokens.css': ':root { --artifact-only: red; }\n',
    'design/prototype/pages/h/page.html': '<div style="color: var(--artifact-only)"></div>\n',
  });
  const { status, out } = run(root);
  assert.equal(status, 1, out);
  assert.match(out, /pages\/h\/page\.html:1: undefined token --artifact-only/);
});

test('files under node_modules, tests and tests-node are not scanned', () => {
  const bad = '<div style="color: var(--nope)"></div>\n';
  const root = makeRoot({
    'design/prototype/node_modules/pkg/index.html': bad,
    'design/prototype/tests/fixture.html': bad,
    'design/prototype/tests-node/fixture.html': bad,
  });
  const { status, out } = run(root);
  assert.equal(status, 0, out);
});

// ---- Review follow-ups (H1, H2, M1, M2) ----

test('html: var() in html comments, script and prose is not scanned (M1)', () => {
  const root = makeRoot({
    'design/prototype/pages/a/page.html':
      '<!-- var(--in-comment) -->\n<p>text var(--in-prose)</p>\n<script>\n// var(--in-js)\nconst s = "var(--in-str)";\n</script>\n',
  });
  const { status, out } = run(root);
  assert.equal(status, 0, out);
});

test('html: <style> block and style attribute are still scanned (M1)', () => {
  const root = makeRoot({
    'design/prototype/pages/a/page.html':
      '<style>\n.a { color: var(--in-style); }\n</style>\n<div style="color: var(--in-attr)"></div>\n',
  });
  const { status, out } = run(root);
  assert.equal(status, 1, out);
  assert.match(out, /page\.html:2: undefined token --in-style/);
  assert.match(out, /page\.html:4: undefined token --in-attr/);
});

test('a commented-out declaration does not define the token (H2)', () => {
  const root = makeRoot({
    'design/prototype/pages/a/page.html':
      '<!-- --ghost: 1 -->\n<script>const x = "--ghost: 2";</script>\n<style>.a { color: var(--ghost); }</style>\n',
  });
  const { status, out } = run(root);
  assert.equal(status, 1, out);
  assert.match(out, /undefined token --ghost/);
});

test('uppercase VAR and multi-line var( are detected (M2)', () => {
  const root = makeRoot({
    'design/prototype/pages/a/a.css': '.a { color: VAR(--upper); }\n.b {\n  color: var(\n    --multi\n  );\n}\n',
  });
  const { status, out } = run(root);
  assert.equal(status, 1, out);
  assert.match(out, /a\.css:1: undefined token --upper/);
  assert.match(out, /a\.css:3: undefined token --multi/);
});

test('stale allowlist entry (never matched) fails (H1)', () => {
  const root = makeRoot({ 'design/prototype/pages/a/a.css': '.a { color: var(--color-primary); }\n' });
  const { status, out } = run(root, [
    { file: 'design/prototype/pages/a/a.css', token: '--gone', reason: 'was needed once' },
  ]);
  assert.equal(status, 1, out);
  assert.match(out, /stale allowlist entry/);
});

test('duplicate allowlist entry fails (H1)', () => {
  const root = makeRoot({ 'design/prototype/pages/a/a.css': '.a { color: var(--missing); }\n' });
  const entry = { file: 'design/prototype/pages/a/a.css', token: '--missing', reason: 'host page declares it' };
  const { status, out } = run(root, [entry, entry]);
  assert.equal(status, 1, out);
  assert.match(out, /duplicate allowlist entry/);
});

test('allowlist entry missing file or token fails cleanly (H1)', () => {
  const root = makeRoot({});
  const { status, out } = run(root, [{ token: '--x', reason: 'r' }]);
  assert.equal(status, 1, out);
  assert.match(out, /file/);
});
