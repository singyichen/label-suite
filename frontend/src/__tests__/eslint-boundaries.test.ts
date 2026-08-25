import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ESLint } from 'eslint';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

/**
 * Regression test for the module-boundary rules in `frontend/eslint.config.js`
 * (FR-014, tasks 6.3 and 7.3): "feature must not import another feature's
 * internals", "shared/ must not import from features/", and "the route tree
 * must not load feature internals directly".
 *
 * `eslint-plugin-boundaries` resolves its element patterns (`src/features/*`,
 * `src/shared`) relative to `process.cwd()`, and the boundaries rule is only
 * attached to files matched by the `files: ['src/**\/*.{ts,tsx}']` block in
 * eslint.config.js (itself resolved relative to the config file's directory).
 * So the fixtures below must be real, temporary files under the project's
 * actual `src/features/` and `src/shared/` — a fixture directory outside
 * `src/` would never be classified as a `feature`/`shared` element and the
 * rule would silently not apply, defeating the test.
 */

const FRONTEND_ROOT = join(import.meta.dirname, '..', '..');
const FIXTURE_FEATURE_A = join(FRONTEND_ROOT, 'src/features/__eslint_boundary_fixture_a__');
const FIXTURE_FEATURE_B = join(FRONTEND_ROOT, 'src/features/__eslint_boundary_fixture_b__');
const FIXTURE_SHARED = join(FRONTEND_ROOT, 'src/shared/__eslint_boundary_fixture__');
const FIXTURE_ROUTES = join(FRONTEND_ROOT, 'src/routes/__eslint_boundary_fixture__');

function cleanupFixtures(): void {
  for (const dir of [FIXTURE_FEATURE_A, FIXTURE_FEATURE_B, FIXTURE_SHARED, FIXTURE_ROUTES]) {
    rmSync(dir, { recursive: true, force: true });
  }
}

function writeFixtures(): void {
  mkdirSync(FIXTURE_FEATURE_A, { recursive: true });
  mkdirSync(FIXTURE_FEATURE_B, { recursive: true });
  mkdirSync(FIXTURE_SHARED, { recursive: true });
  mkdirSync(FIXTURE_ROUTES, { recursive: true });

  // Legitimate same-feature internal import — must NOT be reported.
  writeFileSync(
    join(FIXTURE_FEATURE_A, 'helper.ts'),
    "export const helper = (): string => 'a';\n",
  );
  writeFileSync(
    join(FIXTURE_FEATURE_A, 'index.ts'),
    "import { helper } from './helper';\n\nexport const aValue: string = helper();\n",
  );

  // feature -> other-feature import — must be reported.
  writeFileSync(
    join(FIXTURE_FEATURE_B, 'internal.ts'),
    "export const bInternal = 'b-internal';\n",
  );
  writeFileSync(
    join(FIXTURE_FEATURE_B, 'index.ts'),
    "export { bInternal } from './internal';\n\nexport const bValue = 'b';\n",
  );
  writeFileSync(
    join(FIXTURE_FEATURE_A, 'violation.ts'),
    "import { bValue } from '../__eslint_boundary_fixture_b__/index';\n\nexport const usesB: string = bValue;\n",
  );

  // shared/ -> features/ import — must be reported.
  writeFileSync(
    join(FIXTURE_SHARED, 'violation.ts'),
    "import { bValue } from '../../features/__eslint_boundary_fixture_b__/index';\n\nexport const usesFeatureFromShared: string = bValue;\n",
  );

  // routes/ -> a feature's internal file — must be reported (FR-014's
  // "route tree 直接載入 feature internals").
  writeFileSync(
    join(FIXTURE_ROUTES, 'violation.ts'),
    "import { bInternal } from '../../features/__eslint_boundary_fixture_b__/internal';\n\nexport const routeUsesInternal: string = bInternal;\n",
  );

  // routes/ -> the same feature's public entry point — must NOT be reported;
  // this is how the real route tree is expected to reach a feature.
  writeFileSync(
    join(FIXTURE_ROUTES, 'legit.ts'),
    "import { bValue } from '../../features/__eslint_boundary_fixture_b__';\n\nexport const routeUsesEntryPoint: string = bValue;\n",
  );
}

async function lintFixtures() {
  const eslint = new ESLint({ cwd: FRONTEND_ROOT });
  return eslint.lintFiles([
    join(FIXTURE_FEATURE_A, 'index.ts'),
    join(FIXTURE_FEATURE_A, 'violation.ts'),
    join(FIXTURE_SHARED, 'violation.ts'),
    join(FIXTURE_ROUTES, 'violation.ts'),
    join(FIXTURE_ROUTES, 'legit.ts'),
  ]);
}

function hasBoundaryViolation(messages: { ruleId: string | null }[]): boolean {
  return messages.some((message) => message.ruleId === 'boundaries/dependencies');
}

/**
 * Finds the lint result for one fixture by its absolute path.
 *
 * Matching on an absolute path rather than a substring matters: the shared and
 * routes fixture directories share the `__eslint_boundary_fixture__` name, so a
 * substring match would silently resolve to whichever result happens to come
 * first and the test would assert against the wrong file.
 */
function resultFor(results: { filePath: string }[], fixturePath: string) {
  return results.find((result) => result.filePath === fixturePath);
}

describe('eslint.config.js module boundary rules', () => {
  // Removes fixtures left behind by a previously interrupted run (Ctrl-C,
  // CI OOM-kill) before the suite starts, in addition to the `afterEach`
  // cleanup below.
  beforeAll(() => {
    cleanupFixtures();
  });

  afterEach(() => {
    cleanupFixtures();
  });

  it('reports a feature importing another feature’s internals', async () => {
    writeFixtures();

    const results = await lintFixtures();
    const violation = resultFor(results, join(FIXTURE_FEATURE_A, 'violation.ts'));

    expect(violation).toBeDefined();
    expect(hasBoundaryViolation(violation?.messages ?? [])).toBe(true);
  });

  it('reports shared/ importing from features/', async () => {
    writeFixtures();

    const results = await lintFixtures();
    const violation = resultFor(results, join(FIXTURE_SHARED, 'violation.ts'));

    expect(violation).toBeDefined();
    expect(hasBoundaryViolation(violation?.messages ?? [])).toBe(true);
  });

  it('does not report a legitimate same-feature internal import', async () => {
    writeFixtures();

    const results = await lintFixtures();
    const legit = resultFor(results, join(FIXTURE_FEATURE_A, 'index.ts'));

    expect(legit).toBeDefined();
    expect(hasBoundaryViolation(legit?.messages ?? [])).toBe(false);
  });

  it('reports the route tree importing a feature’s internal file', async () => {
    writeFixtures();

    const results = await lintFixtures();
    const violation = resultFor(results, join(FIXTURE_ROUTES, 'violation.ts'));

    expect(violation).toBeDefined();
    expect(hasBoundaryViolation(violation?.messages ?? [])).toBe(true);
  });

  it('does not report the route tree importing a feature’s public entry point', async () => {
    writeFixtures();

    const results = await lintFixtures();
    const legit = resultFor(results, join(FIXTURE_ROUTES, 'legit.ts'));

    expect(legit).toBeDefined();
    expect(hasBoundaryViolation(legit?.messages ?? [])).toBe(false);
  });
});
