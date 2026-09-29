/* Node gate for the prototype harness (issue #1059).
 *
 * `tests/` is the Playwright browser suite; everything in this directory is a
 * pure Node assertion that renders no page. Run it with `pnpm test:node`.
 * Stdlib only -- node:test + node:assert/strict, no runner dependency.
 *
 * File name matters: `pnpm test:node` is bare `node --test`, which collects
 * only files matching node:test's default patterns. Name every file here
 * `*.test.mjs` or it is silently not run.
 */
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { resolvePort } from '../resolve-port.mjs';

// Regression coverage for issue #582: baseURL and webServer both hardcoded
// 8888, so a Playwright run reusing an already-listening server (e.g. from
// another git worktree) silently tested the wrong tree's files.
describe('playwright.config port resolution', () => {
  const original = process.env.PW_PORT;

  afterEach(() => {
    if (original === undefined) delete process.env.PW_PORT;
    else process.env.PW_PORT = original;
  });

  it('defaults to 8888 when PW_PORT is unset', () => {
    delete process.env.PW_PORT;
    assert.equal(resolvePort(), 8888);
  });

  it('uses PW_PORT when set, so isolated worktrees can run on separate ports', () => {
    process.env.PW_PORT = '9321';
    assert.equal(resolvePort(), 9321);
  });

  it('falls back to 8888 for a non-numeric PW_PORT', () => {
    process.env.PW_PORT = 'not-a-number';
    assert.equal(resolvePort(), 8888);
  });

  it('falls back to 8888 for an empty PW_PORT', () => {
    process.env.PW_PORT = '';
    assert.equal(resolvePort(), 8888);
  });

  it('falls back to 8888 for a negative PW_PORT instead of failing to bind', () => {
    process.env.PW_PORT = '-1';
    assert.equal(resolvePort(), 8888);
  });

  it('falls back to 8888 for a PW_PORT above the valid port range', () => {
    process.env.PW_PORT = '99999';
    assert.equal(resolvePort(), 8888);
  });
});
