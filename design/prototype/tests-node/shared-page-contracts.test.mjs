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
