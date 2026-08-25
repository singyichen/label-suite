import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      boundaries,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  // Module boundary rules (FR-013, FR-014): vertical feature slicing —
  // features/* may not import each other's internals, shared/ may not depend
  // on features/ (shared must stay feature-agnostic), and the route tree may
  // only reach a feature through its public entry point.
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
      },
      'boundaries/elements': [
        { type: 'feature', pattern: 'src/features/*', capture: ['feature'] },
        { type: 'shared', pattern: 'src/shared' },
        { type: 'routes', pattern: 'src/routes' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'allow',
          policies: [
            {
              from: { element: { type: 'feature' } },
              disallow: {
                to: {
                  element: {
                    type: 'feature',
                    captured: { feature: '!{{from.element.captured.feature}}' },
                  },
                },
              },
              message: 'Feature modules must not import another feature\'s internal files.',
            },
            {
              from: { element: { type: 'shared' } },
              disallow: { to: { element: { type: 'feature' } } },
              message: 'shared/ must not import from features/ (shared code must stay feature-agnostic).',
            },
            // FR-014's fourth clause. The route tree is the one place outside
            // a feature that legitimately loads it, so it cannot simply be
            // denied — it is restricted to the feature's `index.ts` barrel.
            // Anything deeper couples the router to a feature's internal
            // layout and makes that layout unrefactorable.
            {
              from: { element: { type: 'routes' } },
              disallow: {
                to: { element: { type: 'feature', fileInternalPath: '!index.ts' } },
              },
              message:
                'The route tree must load a feature through its public entry point (features/<name>/index.ts), not its internal files.',
            },
          ],
        },
      ],
    },
  },
  // SC-019 (second clause): TanStack Query keys come from the `QUERY_KEYS`
  // factory in shared/constants/query-keys.ts. An inline array hard-codes a
  // cache key at one call site, so the invalidation call elsewhere has nothing
  // to stay in sync with and silently stops matching when either side changes.
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Property[key.name='queryKey'] > ArrayExpression > Literal",
          message:
            'Use a key from QUERY_KEYS (shared/constants/query-keys.ts) instead of an inline queryKey array (SC-019).',
        },
      ],
    },
  },
);
