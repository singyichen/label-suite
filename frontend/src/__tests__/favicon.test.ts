import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { FRONTEND_ROOT } from '../testing/eslint-harness';

/**
 * Regression test for issue #419: `frontend/index.html` served no
 * `<link rel="icon">` and `frontend/public/` didn't exist, so browsers
 * fell back to requesting `/favicon.ico`, which 404s in both dev and the
 * built `dist/` output.
 */
describe('favicon', () => {
  it('declares an icon link in index.html <head>', () => {
    const html = readFileSync(join(FRONTEND_ROOT, 'index.html'), 'utf-8');

    expect(html).toMatch(/<link\s+rel="icon"[^>]*href="\/favicon\.svg"[^>]*\/?>/);
  });

  it('ships the favicon asset under public/', () => {
    expect(existsSync(join(FRONTEND_ROOT, 'public/favicon.svg'))).toBe(true);
  });
});
