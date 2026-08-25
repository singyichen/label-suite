import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ESLint } from 'eslint';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * Regression test for the module-boundary rules in `frontend/eslint.config.js`
 * (SC-013/SC-014, task 6.3): "feature must not import another feature's
 * internals" and "shared/ must not import from features/".
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

function cleanupFixtures(): void {
  for (const dir of [FIXTURE_FEATURE_A, FIXTURE_FEATURE_B, FIXTURE_SHARED]) {
    rmSync(dir, { recursive: true, force: true });
  }
}

function writeFixtures(): void {
  mkdirSync(FIXTURE_FEATURE_A, { recursive: true });
  mkdirSync(FIXTURE_FEATURE_B, { recursive: true });
  mkdirSync(FIXTURE_SHARED, { recursive: true });

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
  writeFileSync(join(FIXTURE_FEATURE_B, 'index.ts'), "export const bValue = 'b';\n");
  writeFileSync(
    join(FIXTURE_FEATURE_A, 'violation.ts'),
    "import { bValue } from '../__eslint_boundary_fixture_b__/index';\n\nexport const usesB: string = bValue;\n",
  );

  // shared/ -> features/ import — must be reported.
  writeFileSync(
    join(FIXTURE_SHARED, 'violation.ts'),
    "import { bValue } from '../../features/__eslint_boundary_fixture_b__/index';\n\nexport const usesFeatureFromShared: string = bValue;\n",
  );
}

async function lintFixtures() {
  const eslint = new ESLint({ cwd: FRONTEND_ROOT });
  return eslint.lintFiles([
    join(FIXTURE_FEATURE_A, 'index.ts'),
    join(FIXTURE_FEATURE_A, 'violation.ts'),
    join(FIXTURE_SHARED, 'violation.ts'),
  ]);
}

function hasBoundaryViolation(messages: { ruleId: string | null }[]): boolean {
  return messages.some((message) => message.ruleId === 'boundaries/dependencies');
}

describe('eslint.config.js module boundary rules', () => {
  afterEach(() => {
    cleanupFixtures();
  });

  it('reports a feature importing another feature’s internals', async () => {
    writeFixtures();

    const results = await lintFixtures();
    const violation = results.find((result) => result.filePath.endsWith('violation.ts') && result.filePath.includes('__eslint_boundary_fixture_a__'));

    expect(violation).toBeDefined();
    expect(hasBoundaryViolation(violation?.messages ?? [])).toBe(true);
  });

  it('reports shared/ importing from features/', async () => {
    writeFixtures();

    const results = await lintFixtures();
    const violation = results.find((result) => result.filePath.includes('__eslint_boundary_fixture__'));

    expect(violation).toBeDefined();
    expect(hasBoundaryViolation(violation?.messages ?? [])).toBe(true);
  });

  it('does not report a legitimate same-feature internal import', async () => {
    writeFixtures();

    const results = await lintFixtures();
    const legit = results.find((result) => result.filePath.endsWith('__eslint_boundary_fixture_a__/index.ts'));

    expect(legit).toBeDefined();
    expect(hasBoundaryViolation(legit?.messages ?? [])).toBe(false);
  });
});
