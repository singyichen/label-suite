import { test, expect } from '@playwright/test';
import { resolvePort } from '../playwright.config';

// Regression coverage for issue #582: baseURL and webServer both hardcoded
// 8888, so a Playwright run reusing an already-listening server (e.g. from
// another git worktree) silently tested the wrong tree's files.
test.describe('playwright.config port resolution', () => {
  const original = process.env.PW_PORT;

  test.afterEach(() => {
    if (original === undefined) delete process.env.PW_PORT;
    else process.env.PW_PORT = original;
  });

  test('defaults to 8888 when PW_PORT is unset', () => {
    delete process.env.PW_PORT;
    expect(resolvePort()).toBe(8888);
  });

  test('uses PW_PORT when set, so isolated worktrees can run on separate ports', () => {
    process.env.PW_PORT = '9321';
    expect(resolvePort()).toBe(9321);
  });

  test('falls back to 8888 for a non-numeric PW_PORT', () => {
    process.env.PW_PORT = 'not-a-number';
    expect(resolvePort()).toBe(8888);
  });

  test('falls back to 8888 for an empty PW_PORT', () => {
    process.env.PW_PORT = '';
    expect(resolvePort()).toBe(8888);
  });

  test('falls back to 8888 for a negative PW_PORT instead of failing to bind', () => {
    process.env.PW_PORT = '-1';
    expect(resolvePort()).toBe(8888);
  });

  test('falls back to 8888 for a PW_PORT above the valid port range', () => {
    process.env.PW_PORT = '99999';
    expect(resolvePort()).toBe(8888);
  });
});
