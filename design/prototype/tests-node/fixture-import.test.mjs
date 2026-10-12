/* Node gate for issue #1071: every Playwright spec must take `test`/`expect`
 * from the shared fixture (tests/fixtures.ts), which disables CSS
 * transitions/animations. A direct value import from '@playwright/test'
 * silently bypasses it. `import type` is fine -- it carries no runtime.
 */
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const testsDir = new URL('../tests/', import.meta.url).pathname;
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : [],
  );

it('no spec imports runtime values from @playwright/test directly', () => {
  const offenders = walk(testsDir)
    .filter((f) => !f.endsWith('/tests/fixtures.ts'))
    .filter((f) => {
      const src = readFileSync(f, 'utf8');
      // Any import clause (default, namespace or named) except a pure-type one.
      const imports = [...src.matchAll(/import\s+(?!type\b)([^;]*?)\s+from\s+['"]@playwright\/test['"]/g)];
      const exportsFrom = /export\s+[^;]*?\s+from\s+['"]@playwright\/test['"]/.test(src);
      const runtime = imports.some(([, clause]) => !/^\{[^}]*\}$/.test(clause) || clause.replace(/[{}]/g, '').split(',').some((n) => n.trim() && !n.trim().startsWith('type ')));
      return runtime || exportsFrom || /require\(\s*['"]@playwright\/test['"]/.test(src);
    });
  assert.deepEqual(offenders, [], 'import { test, expect } from the relative tests/fixtures instead');
});
