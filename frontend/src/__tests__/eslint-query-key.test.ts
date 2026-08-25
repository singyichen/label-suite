import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { FRONTEND_ROOT, hasRuleViolation, lintFixtures, resultFor } from '../testing/eslint-harness';

/**
 * Regression test for SC-019's second clause (task 7.3): a TanStack Query hook
 * must not use an inline string array as its `queryKey`; keys come from the
 * `QUERY_KEYS` factory in `shared/constants/query-keys.ts`.
 *
 * Group 6 only delivered SC-019's first clause ("the file must exist"). The
 * second clause held merely because nothing called `useQuery` yet — nothing in
 * CI would have caught the first feature service that inlined a key. This test
 * pins the enforcement itself, not the current absence of violators.
 *
 * The fixtures are real temporary files under `src/`, for the same reason as
 * `eslint-boundaries.test.ts`: eslint.config.js scopes this rule to
 * `src/**\/*.{ts,tsx}`, so a fixture outside `src/` would never be linted and
 * the test would pass for the wrong reason.
 */

const FIXTURE_DIR = join(FRONTEND_ROOT, 'src/features/__eslint_query_key_fixture__');

const RULE_ID = 'no-restricted-syntax';

function cleanupFixtures(): void {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
}

function writeFixtures(): void {
  mkdirSync(FIXTURE_DIR, { recursive: true });

  // Inline string array as queryKey — must be reported.
  writeFileSync(
    join(FIXTURE_DIR, 'violation.ts'),
    "export const options = { queryKey: ['tasks', 'list'] };\n",
  );

  // Key sourced from the QUERY_KEYS factory — must NOT be reported.
  writeFileSync(
    join(FIXTURE_DIR, 'legit.ts'),
    "import { QUERY_KEYS } from '../../shared/constants/query-keys';\n\nexport const options = { queryKey: QUERY_KEYS.health.status };\n",
  );

  // An inline array built from a variable rather than string literals — must
  // also be reported. This is the shape a feature service naturally reaches
  // for when a key is parameterised (`queryKey: [taskId]`), and it bypasses
  // the QUERY_KEYS factory exactly as much as a literal array does.
  writeFileSync(
    join(FIXTURE_DIR, 'identifier-array.ts'),
    "export const options = (taskId: string) => ({ queryKey: [taskId] });\n",
  );

  // A string array that is not a queryKey — must NOT be reported, so the rule
  // cannot be satisfied by banning array literals wholesale.
  writeFileSync(
    join(FIXTURE_DIR, 'unrelated.ts'),
    "export const columns = ['id', 'name'];\n",
  );
}

async function lintAllFixtures() {
  return lintFixtures([
    join(FIXTURE_DIR, 'violation.ts'),
    join(FIXTURE_DIR, 'legit.ts'),
    join(FIXTURE_DIR, 'identifier-array.ts'),
    join(FIXTURE_DIR, 'unrelated.ts'),
  ]);
}

function hasQueryKeyViolation(messages: readonly { ruleId: string | null }[]): boolean {
  return hasRuleViolation(messages, RULE_ID);
}

describe('eslint.config.js inline queryKey rule (SC-019)', () => {
  // Clears fixtures left behind by an interrupted run before the suite starts.
  beforeAll(() => {
    cleanupFixtures();
  });

  afterEach(() => {
    cleanupFixtures();
  });

  it('reports an inline string array used as a queryKey', async () => {
    writeFixtures();

    const results = await lintAllFixtures();
    const violation = resultFor(results, join(FIXTURE_DIR, 'violation.ts'));

    expect(violation).toBeDefined();
    expect(hasQueryKeyViolation(violation?.messages ?? [])).toBe(true);
  });

  it('does not report a queryKey sourced from the QUERY_KEYS factory', async () => {
    writeFixtures();

    const results = await lintAllFixtures();
    const legit = resultFor(results, join(FIXTURE_DIR, 'legit.ts'));

    expect(legit).toBeDefined();
    expect(hasQueryKeyViolation(legit?.messages ?? [])).toBe(false);
  });

  it('reports an inline queryKey array built from a variable', async () => {
    writeFixtures();

    const results = await lintAllFixtures();
    const violation = resultFor(results, join(FIXTURE_DIR, 'identifier-array.ts'));

    expect(violation).toBeDefined();
    expect(hasQueryKeyViolation(violation?.messages ?? [])).toBe(true);
  });

  it('does not report a string array that is not a queryKey', async () => {
    writeFixtures();

    const results = await lintAllFixtures();
    const unrelated = resultFor(results, join(FIXTURE_DIR, 'unrelated.ts'));

    expect(unrelated).toBeDefined();
    expect(hasQueryKeyViolation(unrelated?.messages ?? [])).toBe(false);
  });
});
