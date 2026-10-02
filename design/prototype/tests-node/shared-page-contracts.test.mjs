/* Static gate over the shared page shells, the design tokens and the
 * prototype file tree (migrated by issue #1059 group 2 out of two Playwright
 * specs).
 *
 * Grouped by subject -- "what the prototype tree contains" rather than "what
 * a page renders". Unlike the two per-artifact files next to this one, these
 * four cases each scan a different file (eight page shells, one CSS token
 * file, one absent page), so they share a gate rather than a single artifact;
 * what makes the grouping defensible is that none of them is tied to one
 * page's rendered behavior.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

/* ------------------------------------------------------------------ *
 * From tests/shared/language-switch-consistency.spec.ts (that file was itself
 * folded into tests/shared/sidebar-i18n.spec.ts by issue #1059 group 5)
 *
 * Every page must delegate to the shared sidebar global language API (no
 * direct html[lang] writes or direct persistence), admin nav labels must
 * remain translatable, and the serif fallback stack in assets/tokens.css must
 * stay complete. The two rendered cases (mobile toggle sync, L0 nav label
 * text after a switch) stay in the Playwright suite, now
 * tests/shared/sidebar-i18n.spec.ts.
 *
 * Traceability: specs/shared/008-sidebar-navbar-shared/spec.md
 *   FR-009, FR-009A, FR-009B, SC-006, SC-006A
 * Traceability: design/system/MASTER.md (serif fallback stack — design-system
 * contract, not a feature-spec FR)
 *   §Typography
 * ------------------------------------------------------------------ */

// Each entry lists the page shell plus the runtime modules it loads; the
// language-switch rules apply to their combined source.
const pagesNeedingUnifiedLanguageSwitch = [
  ['pages/dashboard/dashboard.html', 'pages/dashboard/dashboard.js'],
  ['pages/admin/user-management.html'],
  ['pages/admin/role-settings.html'],
  ['pages/account/profile.html'],
  ['pages/account/login.html'],
  ['pages/account/register.html'],
  ['pages/account/forgot-password.html'],
  ['pages/account/reset-password.html'],
];

describe('Prototype global language switch implementation', () => {
  it('uses shared sidebar global language API across all pages', () => {
    for (const sourceFiles of pagesNeedingUnifiedLanguageSwitch) {
      const label = sourceFiles.join(' + ');
      const source = sourceFiles
        .map((relativePath) => readFileSync(join(ROOT, relativePath), 'utf8'))
        .join('\n');

      assert.ok(
        source.includes('LabelSuiteSharedSidebar.applyGlobalLanguage('),
        `${label} should use shared applyGlobalLanguage`,
      );
      assert.ok(
        !source.includes('document.documentElement.lang'),
        `${label} should not write html lang directly`,
      );
      assert.ok(
        !source.includes('LabelSuiteSharedSidebar.setStoredLang('),
        `${label} should not persist language directly`,
      );
    }
  });

  it('translates disable modal title in user-management page', () => {
    const relativePath = 'pages/admin/user-management.html';
    const source = readFileSync(join(ROOT, relativePath), 'utf8');

    assert.ok(
      source.includes('disableModalTitle:'),
      `${relativePath} must declare the disableModalTitle i18n key`,
    );
    assert.ok(
      source.includes("'disableModalTitle'"),
      `${relativePath} must render the disable modal title through t('disableModalTitle')`,
    );
  });

  it('uses full serif fallback stack in shared design tokens', () => {
    const source = readFileSync(join(ROOT, 'assets/tokens.css'), 'utf8');

    assert.ok(
      source.includes(
        "--font-serif-display:  'Crimson Pro', 'Noto Serif TC', 'Source Han Serif TC', Georgia, serif;",
      ),
      'assets/tokens.css must keep the full --font-serif-display fallback stack (MASTER.md §Typography)',
    );
  });
});

/* ------------------------------------------------------------------ *
 * From tests/shared/notification-dropdown.spec.ts
 *
 * The removed standalone notification-settings page must stay removed
 * (preferences live on /profile). The two rendered dropdown cases stay in the
 * Playwright spec.
 *
 * Traceability: specs/shared/008-sidebar-navbar-shared/spec.md
 *   FR-018C, FR-018C1, FR-018E
 * ------------------------------------------------------------------ */
describe('Shared notification dropdown', () => {
  it('does not keep the removed notification settings page', () => {
    const removedPage = join(ROOT, 'pages/account/notification-settings.html');
    assert.strictEqual(
      existsSync(removedPage),
      false,
      `the standalone notification settings page must stay removed: ${removedPage}`,
    );
  });
});

/* ------------------------------------------------------------------ *
 * Auth pages — MASTER rule 9 naming clause, --color-primary-soft-bg and
 * --color-ink-muted declaration/consumption guards (issue #1067)
 *
 * Scope note (issue #1067, narrowed by the 2026-09-30 maintainer comment):
 * issue #1059 group 3 widened the four auth-page cases in
 * tests/account/auth-token-canonical.spec.ts into rendered-outcome
 * assertions for --color-card and --color-ink. That left three gaps the
 * maintainer's comment confirmed are still open, plus one pre-existing gap
 * this file also closes:
 *   1. --color-primary-soft-bg is consumed only inside :hover rules
 *      (.lang-toggle:hover on all four pages, .sso-btn:hover on login only),
 *      so no rendered static-pair assertion can see it; asserted here as
 *      source text (declared value + consuming selector), not as a hover
 *      browser case, per the maintainer's "node gate" steer and #1059's
 *      <=1,700 case-count direction.
 *   2. MASTER rule 9 clause (a) -- "Local token names must reuse the
 *      canonical names from tokens.css -- do not invent parallel names" --
 *      is a source-text rule no rendered assertion can ever see (verified in
 *      auth-token-canonical.spec.ts's own header: renaming --color-card to
 *      --auth-card-bg while still declaring and re-mapping it passes every
 *      rendered case). This is also the only place that can check the dark
 *      block re-maps every local color token.
 *   3. --color-ink-muted's dark value (#9CA3AF) has no coverage; issue
 *      #1069 only added a rendered light-contrast assertion for
 *      .card-subtitle.
 *   4. Deprecated-name hygiene: the absence pin issue #1059 group 3 removed
 *      targeted --color-background / --color-text / --color-primary-light
 *      (names no page or asset consumes). It never covered
 *      --color-text-muted, which MASTER.md:354 deprecates and which
 *      assets/tokens.css:26 still ships as a legacy alias of
 *      --color-ink-muted.
 *
 * Clause (b) of rule 9 (the dark re-map's *values*) is already covered for
 * --color-card / --color-ink by auth-token-canonical.spec.ts and for
 * --color-ink-muted's light value by issue #1069; this file does not re-pin
 * those. It pins values here only for tokens no browser case covers
 * (--color-primary-soft-bg, --color-ink-muted's dark value).
 *
 * Traceability: design/system/MASTER.md §Dark Mode Tokens > Implementation
 *   Rules > "9. Standalone auth pages (no tokens.css)" (~line 347-370);
 *   assets/tokens.css. No feature-spec FR -- design-system contract only,
 *   consistent with the rest of this file's existing rows.
 * ------------------------------------------------------------------ */

const AUTH_PAGES_WITH_LOCAL_TOKENS = [
  'pages/account/login.html',
  'pages/account/register.html',
  'pages/account/forgot-password.html',
  'pages/account/reset-password.html',
];

/**
 * Splits an auth page source into its light `:root` block and its dark
 * `html[data-theme="dark"]` block. Both blocks in every auth page shell are
 * indented so that only the block's own closing brace sits alone on a line
 * with exactly 4 leading spaces -- every nested single-line rule inside the
 * dark block (e.g. `.login-btn:hover { background: #10B981; }`) closes on
 * the same line it opens, so it can never be mistaken for the block's own
 * closing brace.
 */
function splitAuthTokenBlocks(source) {
  const rootMatch = source.match(/:root\s*{([\s\S]*?)\n {4}}/);
  const darkMatch = source.match(/html\[data-theme="dark"\]\s*{([\s\S]*?)\n {4}}/);
  if (!rootMatch || !darkMatch) {
    throw new Error('Could not locate :root or html[data-theme="dark"] block');
  }
  return { light: rootMatch[1], dark: darkMatch[1] };
}

/** Every `--color-*` custom property name declared in a CSS block (deduped). */
function declaredColorTokenNames(blockSource) {
  const matches = blockSource.match(/--color-[a-zA-Z-]+(?=\s*:)/g) || [];
  return [...new Set(matches)];
}

describe('Auth pages — MASTER rule 9 token naming and coverage gaps (issue #1067)', () => {
  // tokens.css's own canonical --color-* names, read from source rather than
  // duplicated as a literal list so this gate tracks tokens.css instead of
  // drifting from it.
  const tokensCssSource = readFileSync(join(ROOT, 'assets/tokens.css'), 'utf8');
  const tokensCssColorNames = new Set(declaredColorTokenNames(tokensCssSource));

  // Rule 9 documents --color-card as "a new canonical name for the auth card
  // surface" even though it is not in tokens.css (these pages do not import
  // it). --color-border-focus and --color-link are pre-existing auth-page
  // tokens with no tokens.css counterpart to duplicate -- rule 9's "do not
  // invent parallel names" is about not creating a second name for a concept
  // tokens.css already names, which does not apply to a concept it has none
  // for. All four auth pages declare both consistently in light and dark,
  // and MASTER never lists either as deprecated. They are not deprecated
  // parallel names and not part of this issue's reported gap, so they are an
  // explicit, documented exception rather than a silent gap in the
  // enumeration below.
  const canonicalAuthColorTokenNames = new Set([
    ...tokensCssColorNames,
    '--color-card',
    '--color-border-focus',
    '--color-link',
  ]);

  // The dark block re-maps every local color token except --color-cta /
  // --color-cta-hover: the CTA button's dark colors are applied via a direct
  // `.submit-btn`/`.login-btn` selector override instead of a custom-property
  // remap (see MASTER's rule 9 sample code), consistently across all four
  // pages.
  const tokensHandledViaSelectorOverrideInDark = new Set(['--color-cta', '--color-cta-hover']);

  for (const relativePath of AUTH_PAGES_WITH_LOCAL_TOKENS) {
    const source = readFileSync(join(ROOT, relativePath), 'utf8');
    const { light, dark } = splitAuthTokenBlocks(source);

    it(`${relativePath} declares and consumes --color-primary-soft-bg in both themes`, () => {
      assert.match(
        light,
        /--color-primary-soft-bg:\s*#EEF2FF/,
        `${relativePath} light :root must declare --color-primary-soft-bg: #EEF2FF (MASTER rule 9)`,
      );
      assert.match(
        dark,
        /--color-primary-soft-bg:\s*#1E1B4B/,
        `${relativePath} dark block must re-map --color-primary-soft-bg to #1E1B4B (MASTER rule 9)`,
      );

      const langToggleHover = source.match(/\.lang-toggle:hover\s*{([^}]*)}/);
      assert.ok(langToggleHover, `${relativePath} must define a .lang-toggle:hover rule`);
      assert.match(
        langToggleHover[1],
        /var\(--color-primary-soft-bg\)/,
        `${relativePath} .lang-toggle:hover must consume var(--color-primary-soft-bg)`,
      );

      if (relativePath === 'pages/account/login.html') {
        const ssoBtnHover = source.match(/\.sso-btn:hover\s*{([^}]*)}/);
        assert.ok(ssoBtnHover, `${relativePath} must define a .sso-btn:hover rule`);
        assert.match(
          ssoBtnHover[1],
          /var\(--color-primary-soft-bg\)/,
          `${relativePath} .sso-btn:hover must consume var(--color-primary-soft-bg)`,
        );
      }
    });

    it(`${relativePath} declares --color-ink-muted and consumes it in .card-subtitle`, () => {
      assert.match(
        light,
        /--color-ink-muted:\s*#64748B/,
        `${relativePath} light :root must declare --color-ink-muted: #64748B (MASTER rule 9)`,
      );
      assert.match(
        dark,
        /--color-ink-muted:\s*#9CA3AF/,
        `${relativePath} dark block must re-map --color-ink-muted to #9CA3AF (MASTER rule 9)`,
      );

      const cardSubtitleRule = source.match(/\.card-subtitle\s*{([^}]*)}/);
      assert.ok(cardSubtitleRule, `${relativePath} must define a .card-subtitle rule`);
      assert.match(
        cardSubtitleRule[1],
        /color:\s*var\(--color-ink-muted\)/,
        `${relativePath} .card-subtitle must consume var(--color-ink-muted)`,
      );
    });

    it(`${relativePath} only declares canonical --color-* names (MASTER rule 9 clause a)`, () => {
      const declaredNames = new Set([
        ...declaredColorTokenNames(light),
        ...declaredColorTokenNames(dark),
      ]);
      for (const name of declaredNames) {
        assert.ok(
          canonicalAuthColorTokenNames.has(name),
          `${relativePath} declares ${name}, which is neither a tokens.css canonical name nor a ` +
            'documented auth-page exception (--color-card, --color-border-focus, --color-link) -- ' +
            'MASTER rule 9 clause (a) forbids inventing parallel names',
        );
      }
    });

    it(`${relativePath} dark block re-maps every local color token the light block declares`, () => {
      const lightNames = declaredColorTokenNames(light);
      const darkNames = new Set(declaredColorTokenNames(dark));
      for (const name of lightNames) {
        if (tokensHandledViaSelectorOverrideInDark.has(name)) continue;
        assert.ok(
          darkNames.has(name),
          `${relativePath} declares ${name} in :root but its html[data-theme="dark"] block ` +
            'does not re-map it (MASTER rule 9: "Each page must include a ' +
            'html[data-theme="dark"] block that re-maps the local tokens")',
        );
      }
    });

    it(`${relativePath} never declares a deprecated parallel token name`, () => {
      for (const deprecatedName of [
        '--color-background',
        '--color-text',
        '--color-primary-light',
        '--color-text-muted',
      ]) {
        assert.ok(
          !source.includes(`${deprecatedName}:`),
          `${relativePath} must not declare the deprecated parallel name ${deprecatedName} ` +
            '(MASTER rule 9 / Anti-Patterns)',
        );
      }
    });
  }
});
