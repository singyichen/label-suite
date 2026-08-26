import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { FRONTEND_ROOT, hasRuleViolation, lintFixtures, resultFor } from '../testing/eslint-harness';

/**
 * Regression test for SC-019's second clause as it applies to `useMutation`
 * (issue #420): a TanStack Mutation hook must not use an inline string array
 * as its `mutationKey`, mirroring the existing `queryKey` rule. SC-019 names
 * `useMutation` alongside `useQuery`/`useInfiniteQuery`, but the original
 * `no-restricted-syntax` selector only matched the `queryKey` property name,
 * so `useMutation({ mutationKey: [...] })` passed lint unchecked.
 *
 * See `eslint-query-key.test.ts` for why the fixtures are real temporary
 * files under `src/`.
 */

const FIXTURE_DIR = join(FRONTEND_ROOT, 'src/features/__eslint_mutation_key_fixture__');

const RULE_ID = 'no-restricted-syntax';

function cleanupFixtures(): void {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
}

function writeFixtures(): void {
  mkdirSync(FIXTURE_DIR, { recursive: true });

  // Inline string array as mutationKey — must be reported.
  writeFileSync(
    join(FIXTURE_DIR, 'violation.ts'),
    "export const options = { mutationKey: ['tasks', 'create'] };\n",
  );

  // Key sourced from the QUERY_KEYS factory — must NOT be reported.
  writeFileSync(
    join(FIXTURE_DIR, 'legit.ts'),
    "import { QUERY_KEYS } from '../../shared/constants/query-keys';\n\nexport const options = { mutationKey: QUERY_KEYS.health.status };\n",
  );

  // An inline array built from a variable rather than string literals — must
  // also be reported, for the same reason as the queryKey identifier-array
  // case.
  writeFileSync(
    join(FIXTURE_DIR, 'identifier-array.ts'),
    "export const options = (taskId: string) => ({ mutationKey: [taskId] });\n",
  );

  // A string array that is not a mutationKey — must NOT be reported.
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

function hasMutationKeyViolation(messages: readonly { ruleId: string | null }[]): boolean {
  return hasRuleViolation(messages, RULE_ID);
}

describe('eslint.config.js inline mutationKey rule (SC-019)', () => {
  // Clears fixtures left behind by an interrupted run before the suite starts.
  beforeAll(() => {
    cleanupFixtures();
  });

  afterEach(() => {
    cleanupFixtures();
  });

  it('reports an inline string array used as a mutationKey', async () => {
    writeFixtures();

    const results = await lintAllFixtures();
    const violation = resultFor(results, join(FIXTURE_DIR, 'violation.ts'));

    expect(violation).toBeDefined();
    expect(hasMutationKeyViolation(violation?.messages ?? [])).toBe(true);
  });

  it('does not report a mutationKey sourced from the QUERY_KEYS factory', async () => {
    writeFixtures();

    const results = await lintAllFixtures();
    const legit = resultFor(results, join(FIXTURE_DIR, 'legit.ts'));

    expect(legit).toBeDefined();
    expect(hasMutationKeyViolation(legit?.messages ?? [])).toBe(false);
  });

  it('reports an inline mutationKey array built from a variable', async () => {
    writeFixtures();

    const results = await lintAllFixtures();
    const violation = resultFor(results, join(FIXTURE_DIR, 'identifier-array.ts'));

    expect(violation).toBeDefined();
    expect(hasMutationKeyViolation(violation?.messages ?? [])).toBe(true);
  });

  it('does not report a string array that is not a mutationKey', async () => {
    writeFixtures();

    const results = await lintAllFixtures();
    const unrelated = resultFor(results, join(FIXTURE_DIR, 'unrelated.ts'));

    expect(unrelated).toBeDefined();
    expect(hasMutationKeyViolation(unrelated?.messages ?? [])).toBe(false);
  });
});
