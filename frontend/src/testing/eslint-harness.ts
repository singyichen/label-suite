import { join } from 'node:path';

import { ESLint } from 'eslint';

/**
 * Shared harness for the tests that pin `eslint.config.js` rules by linting
 * temporary fixture files (`src/__tests__/eslint-*.test.ts`).
 *
 * These tests run the project's real config rather than a hand-built one, so
 * a rule that is deleted or misconfigured turns them red — which is the whole
 * point of having them.
 */

/**
 * Absolute path to `frontend/`.
 *
 * ESLint must run with this as its cwd: `eslint-plugin-boundaries` resolves
 * its element patterns (`src/features/*`, `src/routes`, ...) relative to
 * `process.cwd()`, so linting from anywhere else would classify every fixture
 * as unknown and silently apply no boundary rule at all.
 */
export const FRONTEND_ROOT = join(import.meta.dirname, '..', '..');

/** Lints `filePaths` with the project's real `eslint.config.js`. */
export async function lintFixtures(filePaths: string[]): Promise<ESLint.LintResult[]> {
  const eslint = new ESLint({ cwd: FRONTEND_ROOT });
  return eslint.lintFiles(filePaths);
}

/**
 * Finds the lint result for one fixture by its absolute path.
 *
 * Matching on the absolute path rather than a substring matters: fixture
 * directories in different element roots may share a name, and a substring
 * match would silently resolve to whichever result came first, asserting
 * against the wrong file.
 */
export function resultFor(
  results: ESLint.LintResult[],
  fixturePath: string,
): ESLint.LintResult | undefined {
  return results.find((result) => result.filePath === fixturePath);
}

/** Whether `messages` contains a report from `ruleId`. */
export function hasRuleViolation(
  messages: readonly { ruleId: string | null }[],
  ruleId: string,
): boolean {
  return messages.some((message) => message.ruleId === ruleId);
}
