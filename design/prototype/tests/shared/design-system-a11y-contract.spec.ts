/*
 * Design-system accessibility contract — rendered outcomes only.
 *
 * This is the feature-oriented home for the design-system accessibility
 * guards that previously lived in 15 one-off `issue-NNN-*.spec.ts` files
 * (issues #935, #981, #982, #1019, #1022, #1028, #1029), consolidated per
 * issue #1059 §3 item 3 and README Test Policy rules 3 and 4. It lives in
 * `tests/shared/` because the contract spans admin, annotation, dataset and
 * task-management pages, following the precedent of
 * `tests/shared/sidebar-design-system.spec.ts`.
 *
 * What it asserts — and only this:
 *   - rendered WCAG contrast ratio of a real computed foreground against its
 *     real computed background, per theme;
 *   - rendered `font-size`, against the design-system label floor
 *     `--text-label` (12px; design/prototype/assets/tokens.css:75,
 *     design/system/MASTER.md:417 Typography table, "Label" row);
 *   - the rendered text/class identity of the measured node, so a row cannot
 *     silently start measuring the wrong element.
 *
 * What it deliberately does NOT assert (dropped by issue #1059 §3 item 3):
 *   - token-probe equality (`.btn-cta`'s computed color === a throwaway probe
 *     styled `color: var(--color-on-cta)`) — an internal token-choice pin with
 *     no observable consequence beyond the contrast rows below;
 *   - deprecated / page-local token absence or resolution
 *     (`--navbar-mobile-height` et al) — implementation detail.
 *
 * Adding a selector to the contract is a table row, not a new test.
 *
 * Canonical page specs covered:
 *   specs/admin/006-user-management/spec.md
 *   specs/admin/007-role-settings/spec.md
 *   specs/annotation/015-annotation-workspace/spec.md
 *   specs/dataset/  dataset-analysis-detail page spec
 *   specs/task-management/010-task-list/spec.md
 *   specs/task-management/013-task-new/spec.md
 *   specs/task-management/014-task-detail/spec.md
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import path from 'path';
import { buildWorkspaceUrl, dismissGuidelineModal } from '../annotation/_workspace-helpers';

type Theme = 'light' | 'dark';
const THEMES: Theme[] = ['light', 'dark'];

/** WCAG 2.1 SC 1.4.3 minimum for normal-size text. */
const AA_TEXT = 4.5;
/**
 * WCAG 2.1 SC 1.4.11 minimum for non-text graphical content. Applies to the
 * `.guideline-file-icon.md` glyph only: `GUIDELINE_FILE_ICON_SVG.markdown`
 * (annotation-workspace.config.js:6450, applied at :6470) is a path/polyline/line glyph with no
 * `<text>` element, and the adjacent `.guideline-file-name` span already
 * carries the file name as `textContent`, so the icon is redundant decoration
 * rather than the sole conveyor of information (issue #935).
 */
const AA_NON_TEXT = 3;
/**
 * Accepted-tradeoff floor for white-on-`--color-primary` in light theme
 * (issue #1030, maintainer decision 2026-09-27): measured 4.4669:1, 0.033
 * under AA, sanctioned as a tradeoff rather than a defect — see the Step
 * Indicator arbitration record in design/system/MASTER.md. These rows guard
 * against further regression rather than asserting an AA pass, so a future
 * change to `--color-primary` / `--color-on-cta` that drops below 4.4 fails
 * here as a signal to revisit that arbitration record.
 */
const ACCEPTED_TRADEOFF_LIGHT_FLOOR = 4.4;

/** Resolved value of `--text-label`, the design-system functional-text floor. */
const LABEL_FONT_SIZE = '12px';

const EXAMPLE_DATA = path.resolve(__dirname, '../../../../docs/product/example-data');
const TASK_NEW_URL = '/pages/task-management/task-new.html';
const TASK_LIST_URL = '/pages/task-management/task-list.html';
const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

/* ------------------------------------------------------------------ *
 * Contrast measurement
 *
 * One copy lives here. Before this consolidation twelve specs each held their
 * own; eleven of those twelve are the files this suite replaces, so the only
 * other copy left in the tree is tests/account/auth-token-canonical.spec.ts.
 * Two copies is thin ground for the usual "everyone does it this way"
 * argument, so the reason to keep them separate has to stand on its own: the
 * two measure different things — that file guards four standalone auth pages
 * that deliberately do not import tokens.css, this one guards the pages that
 * do — and a shared helper would let a change made for one silently alter
 * what the other asserts. If a third consumer appears, extracting is probably
 * the better call.
 * ------------------------------------------------------------------ */

/** Parses a computed `rgb(r, g, b)` / `rgba(r, g, b, a)` string into channel values. */
function parseRgbChannels(rgbString: string): [number, number, number] {
  const matches = rgbString.match(/\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 3) {
    throw new Error(`Cannot parse computed color as rgb(): ${rgbString}`);
  }
  return [Number(matches[0]), Number(matches[1]), Number(matches[2])];
}

/** WCAG 2.1 relative luminance (sRGB gamma-corrected). */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const toLinear = (channel8bit: number) => {
    const c = channel8bit / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [rl, gl, bl] = [toLinear(r), toLinear(g), toLinear(b)];
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/** WCAG 2.1 contrast ratio between two computed color strings. */
function contrastRatio(colorA: string, colorB: string): number {
  const luminanceA = relativeLuminance(parseRgbChannels(colorA));
  const luminanceB = relativeLuminance(parseRgbChannels(colorB));
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * How a contract row's element is obtained before its computed style is read.
 *
 * `synthetic` exists for states that are not rendered on page load and whose
 * real interaction is out of scope for a contrast guard: `.toast` is
 * `opacity: 0` until JS injects `.show` on a dynamically created node,
 * `.step-circle.done` needs the wizard driven forward, and the `.btn-cta`
 * rows measure the page's CSS rule rather than one particular button
 * instance. A throwaway element inherits the page's already-loaded CSS and
 * the live `data-theme`, so its computed style is the rule under contract.
 * `tag` is part of the contract: `button.btn-cta` and `div.btn-cta` can
 * resolve differently through UA styles and element-qualified selectors.
 */
type Probe =
  | { kind: 'live'; selector: string }
  | { kind: 'synthetic'; tag: 'button' | 'div'; className: string };

type ContrastRow = {
  /** Human-readable name of the guarded outcome; used in the failure message. */
  label: string;
  probe: Probe;
  /** Per-theme minimum rendered contrast ratio. */
  floor: Record<Theme, number>;
};

type ContrastPageContract = {
  scenario: string;
  url: string;
  /** Re-run after every themed load, to reveal rows behind an interaction. */
  reveal?: (page: Page) => Promise<void>;
  rows: ContrastRow[];
};

/**
 * Loads `url` painted in `theme`, from empty `localStorage`.
 *
 * `theme-fouc.js` reads `label-suite-theme` synchronously before paint
 * (design/prototype/assets/theme-fouc.js:4), so the page is painted in the
 * requested theme rather than toggled into it — the same mechanism every
 * migrated case used.
 *
 * The `clear()` keeps each load equivalent to the per-case browser context
 * every migrated case used to get. A consolidated scenario reuses one context
 * across both themed loads, and these pages do write to storage — task-new
 * persists `labelsuite.systemRole` and `labelsuite.lang`, and
 * `CREATED_TASKS_KEY` once a task is created (task-new.html:1420). None of
 * those is known to change a measured colour today, so this is hygiene
 * rather than a fix for an observed failure: it removes the class of
 * difference between the first and second load rather than relying on none of
 * it mattering.
 *
 * Init scripts accumulate in registration order, so on the second call the
 * first call's script also re-runs; clearing twice and then setting the later
 * theme is idempotent and leaves exactly `{ label-suite-theme: <theme> }`.
 */
async function loadWithTheme(page: Page, url: string, theme: Theme) {
  await page.addInitScript((selectedTheme) => {
    window.localStorage.clear();
    window.localStorage.setItem('label-suite-theme', selectedTheme);
  }, theme);
  await page.goto(url);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await page.addStyleTag({ content: NO_TRANSITION_CSS });
}

/**
 * Suppresses transitions and animations so a contrast row measures the
 * settled rendered colours rather than an in-flight interpolation.
 *
 * This is required, not cosmetic. `.step-circle` declares
 * `transition: all var(--dur-fast)` (task-new.html:38) and its `active` class
 * is applied by JS after load (task-new.html:912), so `getComputedStyle()`
 * returns the *animating* value if it runs inside that window.
 * The exposure is new, and it comes from this suite being faster.
 * `measureContrast()` resolves the selector and reads the style in one
 * `page.evaluate()` round trip; the migrated cases used `Locator.evaluate()`,
 * which resolves the handle and then makes a second round trip to read. That
 * second trip is structural, not luck, and it reliably landed after the
 * transition settled — so the old specs were not fragile, and this one would
 * be without the override. Measured here without it, dark
 * `.step-circle.active` has been seen mid-interpolation at 4.86:1
 * (color rgb(34, 31, 78) on rgb(126, 136, 241)) against a settled 5.36:1
 * (--color-on-cta on --color-primary in dark, tokens.css:157). That run did
 * not breach the 4.5 floor, so treat this as removing a known source of
 * variance rather than as a reproduced failure.
 *
 * A transition only affects intermediate values, never the end state, so the
 * settled measurement is the value the migrated cases were written to pin.
 */
const NO_TRANSITION_CSS = `*, *::before, *::after {
  transition: none !important;
  animation: none !important;
}`;

/**
 * Reads the probe's rendered foreground and background and returns their
 * contrast ratio.
 *
 * A page re-render (e.g. task-detail.html's 560ms skeleton timer) can
 * detach-and-replace the target between resolving it and reading its computed
 * style (issue #1040). `Locator.evaluate()` does those as two round trips,
 * leaving a gap where the swap lands and the stale handle's
 * `getComputedStyle()` returns empty strings. Retrying around that gap with
 * `expect(...).toPass()` was reproduced failing at every interval tried
 * (including a 10s timeout, single worker, no contention: 2/20 failed) —
 * a fixed-period poll against a fixed-period swap can alias instead of
 * converging.
 *
 * This removes the gap instead of outrunning it: `page.evaluate()` resolves
 * the selector via `document.querySelector` and reads `getComputedStyle` in
 * the same synchronous callback with no `await` between them. Page JS is
 * single-threaded and non-preemptive, so no pending re-render callback can
 * run in between; the callback always observes a live element. The
 * "continuously detached and replaced" scenario at the bottom of this file
 * is the regression guard for that property.
 *
 * `document.querySelector` returns the first match rather than erroring on
 * several, which matches the `.first()` semantics every migrated case used.
 */
async function measureContrast(page: Page, probe: Probe): Promise<number> {
  if (probe.kind === 'synthetic') {
    const { color, backgroundColor } = await page.evaluate(
      ({ tag, className }) => {
        const el = document.createElement(tag);
        el.className = className;
        document.body.appendChild(el);
        const style = window.getComputedStyle(el);
        const read = { color: style.color, backgroundColor: style.backgroundColor };
        el.remove();
        return read;
      },
      { tag: probe.tag, className: probe.className }
    );
    return contrastRatio(color, backgroundColor);
  }

  await expect(page.locator(probe.selector).first()).toBeVisible();
  const { color, backgroundColor } = await page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`No element matched selector after toBeVisible(): ${selector}`);
    const style = window.getComputedStyle(el);
    return { color: style.color, backgroundColor: style.backgroundColor };
  }, probe.selector);
  return contrastRatio(color, backgroundColor);
}

/* ------------------------------------------------------------------ *
 * The contrast contract
 * ------------------------------------------------------------------ */

const CONTRAST_CONTRACT: ContrastPageContract[] = [
  {
    scenario:
      'admin/user-management.html — primary CTA and pagination hold their contrast floor in both themes',
    url: '/pages/admin/user-management.html',
    rows: [
      {
        // issue #981: `.btn-primary` set a literal `color: white` instead of
        // `var(--color-white)`, which in dark theme left pure white on
        // `--color-cta` (#34D399) at ~1.92:1.
        label: '#addUserBtn.btn-primary foreground on its CTA background',
        probe: { kind: 'live', selector: '#addUserBtn.btn-primary' },
        floor: { light: AA_TEXT, dark: AA_TEXT },
      },
      {
        // issue #1019: `.page-btn.active` set a literal `color: white` on
        // `background: var(--color-primary)`; dark theme #818CF8 gave ~2.98:1.
        label: '.page-btn.active foreground on --color-primary',
        probe: { kind: 'live', selector: '.page-btn.active' },
        floor: { light: ACCEPTED_TRADEOFF_LIGHT_FLOOR, dark: AA_TEXT },
      },
    ],
  },
  {
    scenario: 'admin/role-settings.html — .btn-cta holds AA contrast in both themes',
    url: '/pages/admin/role-settings.html',
    rows: [
      {
        // issue #1029: a page-local `html[data-theme="dark"] .btn-cta { color: #0F172A }`
        // hardcoded a literal instead of `--color-on-cta`. Note the class list
        // is `btn-cta` alone here, unlike the `btn btn-cta` pages below.
        label: '.btn-cta foreground on --color-cta',
        probe: { kind: 'synthetic', tag: 'button', className: 'btn-cta' },
        floor: { light: AA_TEXT, dark: AA_TEXT },
      },
    ],
  },
  {
    scenario:
      'annotation/annotation-workspace.html — .btn-cta and the markdown guideline icon hold their contrast floor in both themes',
    // `task_id` is required: annotation-workspace.config.js's boot() redirects
    // to annotation-list.html whenever resolveTaskProfile(taskId) finds no
    // matching task-detail.data.js profile (spec 015 FR-004). T001/sent-001 is
    // a valid seeded pair.
    url: buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }),
    reveal: async (page) => {
      await dismissGuidelineModal(page);
      await page.waitForSelector('.guideline-file-icon.md');
    },
    rows: [
      {
        // issue #1029: `.btn-cta` used `var(--color-white)` (itself remapped to
        // the #16161F card surface in dark theme) instead of `--color-on-cta`.
        label: '.btn-cta foreground on --color-cta',
        probe: { kind: 'synthetic', tag: 'button', className: 'btn btn-cta' },
        floor: { light: AA_TEXT, dark: AA_TEXT },
      },
      {
        // issue #935: the icon foreground was a literal #8B5CF6 / #A78BFA
        // before `--color-file-markdown` existed. Judged against the non-text
        // 3:1 threshold, not 4.5:1 — see AA_NON_TEXT above.
        label: '.guideline-file-icon.md glyph on its own background',
        probe: { kind: 'live', selector: '.guideline-file-icon.md' },
        floor: { light: AA_NON_TEXT, dark: AA_NON_TEXT },
      },
    ],
  },
  {
    scenario:
      'task-management/task-list.html — CTA, table header, pagination and toast hold their contrast floor in both themes',
    url: TASK_LIST_URL,
    rows: [
      {
        // issue #1028: task-list.html's inline `<style>` redeclares a whole
        // `:root` that shadows the linked canonical tokens.css, and
        // `--color-cta` there was the pre-#973 #10B981 instead of #047857 —
        // silently reverting the issue #973 AA fix on this page only. This is
        // a pass-guard on the fixed state, not a pin on a known failure.
        label: '#newTaskBtn .btn-primary foreground on --color-cta (token-shadow guard)',
        probe: { kind: 'live', selector: '#newTaskBtn' },
        floor: { light: AA_TEXT, dark: AA_TEXT },
      },
      {
        // issue #1028, same shadowed `:root`: `--color-ink-muted` was the
        // pre-#973 #94A3B8 instead of #64748B, consumed as `.task-table th`
        // foreground against `var(--color-slate-50)`.
        label: '#thTaskName .task-table th foreground on --color-slate-50 (token-shadow guard)',
        probe: { kind: 'live', selector: '#thTaskName' },
        floor: { light: AA_TEXT, dark: AA_TEXT },
      },
      {
        // issue #1019, same literal `color: white` on `--color-primary`.
        label: '.page-btn.active foreground on --color-primary',
        probe: { kind: 'live', selector: '.page-btn.active' },
        floor: { light: ACCEPTED_TRADEOFF_LIGHT_FLOOR, dark: AA_TEXT },
      },
      {
        // issue #1019: `.toast` set a literal `color: white` on
        // `background: var(--color-ink)`. Light `--color-ink` is #1E1B4B so it
        // happened to pass (~15.99:1); dark remaps to the #E2E8F0 light slate,
        // leaving white on light at ~1.23:1.
        label: '.toast foreground on --color-ink',
        probe: { kind: 'synthetic', tag: 'div', className: 'toast' },
        floor: { light: AA_TEXT, dark: AA_TEXT },
      },
    ],
  },
  {
    scenario:
      'task-management/task-detail.html — .btn-cta and member pagination hold their contrast floor in both themes',
    url: TASK_DETAIL_URL,
    // The member-management pagination lives behind a tab click and the
    // panels arrive as fetched partials — wait for the last partial before
    // interacting, matching task-detail-member-management-add.spec.ts.
    reveal: async (page) => {
      await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
      await page.locator('#tabMemberManagement').click();
      await expect(page.locator('#memberManagementPanel')).not.toHaveClass(/hidden/);
    },
    rows: [
      {
        // issue #1029: `.btn-cta` used `var(--color-white)` instead of
        // `--color-on-cta`.
        label: '.btn-cta foreground on --color-cta',
        probe: { kind: 'synthetic', tag: 'button', className: 'btn btn-cta' },
        floor: { light: AA_TEXT, dark: AA_TEXT },
      },
      {
        // issue #1019: the member-management pagination's own
        // `.page-btn.active`. The `#memberPaginationControls` scope is load
        // bearing — the page has 4 further `.page-btn.active` nodes across its
        // metadata / work-log / audit-record / audit-export controls.
        label: '#memberPaginationControls .page-btn.active foreground on --color-primary',
        probe: { kind: 'live', selector: '#memberPaginationControls .page-btn.active' },
        floor: { light: ACCEPTED_TRADEOFF_LIGHT_FLOOR, dark: AA_TEXT },
      },
    ],
  },
  {
    scenario:
      'task-management/task-new.html — step indicator, primary CTA and toast hold their contrast floor in both themes',
    url: TASK_NEW_URL,
    rows: [
      {
        // issue #981, same literal `color: white` as user-management.html.
        label: '.action-bar .btn-primary foreground on its CTA background',
        probe: { kind: 'live', selector: '.action-bar .btn-primary' },
        floor: { light: AA_TEXT, dark: AA_TEXT },
      },
      {
        // issue #1019: `.step-circle.active` set a literal `color: white` on
        // `background: var(--color-primary)`.
        label: '.step-circle.active foreground on --color-primary',
        probe: { kind: 'live', selector: '.step-circle.active' },
        floor: { light: ACCEPTED_TRADEOFF_LIGHT_FLOOR, dark: AA_TEXT },
      },
      {
        // issue #1029: `.step-circle.done` set a literal `color: white` on
        // `background: var(--color-cta)`; the literal keyword bypasses
        // `--color-white`'s dark remap, giving ~1.9224:1 in dark theme.
        label: '.step-circle.done foreground on --color-cta',
        probe: { kind: 'synthetic', tag: 'div', className: 'step-circle done' },
        floor: { light: AA_TEXT, dark: AA_TEXT },
      },
      {
        // issue #1019, same `.toast` rule as task-list.html.
        label: '.toast foreground on --color-ink',
        probe: { kind: 'synthetic', tag: 'div', className: 'toast' },
        floor: { light: AA_TEXT, dark: AA_TEXT },
      },
    ],
  },
];

for (const contract of CONTRAST_CONTRACT) {
  test(contract.scenario, async ({ page }) => {
    for (const theme of THEMES) {
      await loadWithTheme(page, contract.url, theme);
      await contract.reveal?.(page);
      for (const row of contract.rows) {
        const ratio = await measureContrast(page, row.probe);
        expect(
          ratio,
          `${theme} theme — ${row.label}: measured ${ratio.toFixed(4)}:1, floor ${row.floor[theme]}:1`
        ).toBeGreaterThanOrEqual(row.floor[theme]);
      }
    }
  });
}

/* ------------------------------------------------------------------ *
 * The rendered font-size contract
 *
 * Every row reads the real rendered getComputedStyle() font-size through
 * toHaveCSS() — never the CSS or inline-style source text — so it cannot be
 * satisfied by a comment or a dead rule. `identity` proves the row measured
 * the node it names.
 *
 * These rows are theme-independent: `--text-label` has one value in both
 * themes (design/prototype/assets/tokens.css:75), so they run once, on the
 * default load, exactly as the migrated cases did.
 * ------------------------------------------------------------------ */

type FontSizeRow = {
  label: string;
  /** Resolves the node whose rendered font-size is under contract. */
  locate: (page: Page) => Locator;
  /** Rendered-state identity guard for the located node. */
  identity?: { exactText?: string; containsText?: string; hasClass?: RegExp };
};

type FontSizeContract = {
  scenario: string;
  /** Navigates and drives whatever reveals this group's rows. */
  reach: (page: Page) => Promise<void>;
  rows: FontSizeRow[];
};

/** task-new.html's step-1 chips are rendered from config after load. */
async function reachTaskNewCategoryChips(page: Page) {
  await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
    null,
    { timeout: 30000 }
  );
}

/**
 * Drives step 1 to the ABSA unified preview (`renderAbsaUnifiedPreview`),
 * which is the only path that renders `.absa-relation-badge` and, after the
 * relType patch below, the relation-type badge. Selections match the
 * pre-existing "absa-va.json — triple output" test
 * (tests/task-management/task-new-output-type-preview.spec.ts:1211).
 */
async function reachAbsaUnifiedPreview(page: Page) {
  await reachTaskNewCategoryChips(page);
  await page.fill('#taskNameInput', 'design-system-a11y-contract-absa');
  await page.locator('#taskCategoryChips [data-key="regression"]').click();
  await page.locator('#taskCategoryChips [data-key="sequence"]').click();
  await page.locator('#taskInputTypeChips [data-key="single_item"]').click();
  await page.locator('#taskOutputTypeChips [data-key="entity_recognition"]').click();
  await page.locator('#taskOutputTypeChips [data-key="relation_identification"]').click();
  await page.locator('#taskOutputTypeChips [data-key="multi_dim"]').click();

  await page.locator('#datasetFileInput').setInputFiles(path.join(EXAMPLE_DATA, 'absa-va.json'));
  await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();

  const roles: Record<string, string> = {
    utterances: 'evidence',
    text: 'input',
    gold_triplets: 'output',
    incomplete_annotations: 'output',
  };
  for (const [col, role] of Object.entries(roles)) {
    await page.locator(`.inline-preview-role-select[aria-label$="${col}"]`).selectOption(role);
  }

  await page.evaluate(() => {
    (window as Window & { revalidateCurrentStep?: () => void }).revalidateCurrentStep?.();
  });
  await page.waitForTimeout(200);
  await page.locator('#nextBtn').click();
  await expect(page.locator('#step2Panel')).not.toHaveClass(/hidden/);
}

const REL_TYPE = 'likes';

const FONT_SIZE_CONTRACT: FontSizeContract[] = [
  {
    scenario: 'admin/role-settings.html — functional text renders at the --text-label floor',
    reach: async (page) => {
      await page.goto('/pages/admin/role-settings.html');
    },
    rows: [
      {
        // issue #982 spot 7: role-settings.html:209, the "需任務角色" pill next
        // to permission rows that require a scoped task role.
        label: '.task-role-badge',
        locate: (page) => page.locator('.task-role-badge').first(),
        identity: { containsText: '需任務角色' },
      },
      {
        // issue #982 spot 8: role-settings.html:225, the "（唯讀）" note on a
        // read-only permission cell.
        label: '.readonly-note',
        locate: (page) => page.locator('#readonlyNote_task_detail_view'),
        identity: { exactText: '（唯讀）' },
      },
    ],
  },
  {
    scenario:
      'dataset/dataset-analysis-detail.html — stats summary labels render at the --text-label floor',
    // T108 is a single_dim task per
    // tests/dataset/dataset-analysis-detail-composite-badge.spec.ts:81, and the
    // `tab=stats` entry matches dataset-analysis-detail-stats-i18n.spec.ts:17.
    reach: async (page) => {
      await page.goto('/pages/dataset/dataset-analysis-detail.html?task_id=T108&tab=stats');
    },
    rows: [
      {
        // issue #982 spot 6: dataset-analysis-detail.html:208, the stat-block
        // caption ("Mean" / "SD" / "Median" / ...) in the single-dimension
        // stats summary panel.
        label: '.stats-summary-item-label',
        locate: (page) => page.locator('#statsSingleDimLblMean'),
        identity: { hasClass: /stats-summary-item-label/ },
      },
    ],
  },
  {
    scenario:
      'task-management/task-new.html — relation-extraction preview badges render at the --text-label floor',
    // issue #982 spots 1-2 render inside #annotationPreview via
    // renderRelationExtractionPreview(), a legacy single-output path reached
    // only when state.taskType is 'relation_extraction' directly — the current
    // step-1 multi-output chips drive state.selectedOutputTypes instead. State
    // is set the same way tests/task-management/task-new-step2-dark-mode.spec.ts:16-42
    // does. Both badges come from this one setup, so one load covers both.
    reach: async (page) => {
      await page.goto(TASK_NEW_URL);
      await page.evaluate(() => {
        type TaskWindow = Window & {
          state: { taskType: string; configData: Record<string, unknown>; lang: 'zh' | 'en' };
          getDefaultTemplateForLang: (
            taskType: string,
            lang: 'zh' | 'en'
          ) => Record<string, unknown>;
          renderTemplateBtns: () => void;
          renderSchemaFields: () => void;
          showStep: (step: number) => void;
        };
        const win = window as unknown as TaskWindow;
        win.state.taskType = 'relation_extraction';
        win.state.lang = 'zh';
        win.state.configData = win.getDefaultTemplateForLang('relation_extraction', 'zh');
        win.renderTemplateBtns();
        win.renderSchemaFields();
        win.showStep(2);
      });
    },
    rows: [
      {
        // issue #982 spot 1: task-config.css:443.
        label: '.re-preview-entity-badge',
        locate: (page) => page.locator('#annotationPreview .re-preview-entity-badge').first(),
      },
      {
        // issue #982 spot 2: task-config.css:449.
        label: '.re-preview-relation-badge',
        locate: (page) => page.locator('#annotationPreview .re-preview-relation-badge').first(),
      },
    ],
  },
  {
    scenario:
      'task-management/task-new.html — step-1 field-type and category subgroup labels render at the --text-label floor',
    reach: async (page) => {
      await reachTaskNewCategoryChips(page);
      await page.fill('#taskNameInput', 'design-system-a11y-contract-step1');
      // Two categories, so #taskOutputTypeChips renders subgroup headings
      // (showSubheaders = groups.length > 1) — issue #982 spot 5.
      await page.locator('#taskCategoryChips [data-key="sequence"]').click();
      await page.locator('#taskCategoryChips [data-key="regression"]').click();
      await page.locator('#taskInputTypeChips [data-key="single_item"]').click();
      await page.locator('#taskOutputTypeChips [data-key="entity_recognition"]').click();
      // The field-role mapping table appears as soon as a dataset file is
      // uploaded in step 1 — issue #982 spot 4.
      await page
        .locator('#datasetFileInput')
        .setInputFiles(path.join(EXAMPLE_DATA, 'entity-recognition.json'));
      await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();
    },
    rows: [
      {
        // issue #982 spot 4: task-config.css:523, the field-type badge in the
        // dataset field-role mapping table header.
        label: '.inline-preview-type-badge',
        locate: (page) => page.locator('.inline-preview-type-badge').first(),
      },
      {
        // issue #982 spot 5: task-config.css:536, the category subgroup
        // heading inside #taskOutputTypeChips.
        label: '.task-type-subgroup-label',
        locate: (page) => page.locator('.task-type-subgroup-label').first(),
      },
    ],
  },
  {
    scenario:
      'task-management/task-new.html — ABSA unified preview relation badges render at the --text-label floor',
    reach: async (page) => {
      await reachAbsaUnifiedPreview(page);
      // Confirm the unified preview rendered at least one relation row before
      // mutating state, so the container handed to the refresh call below is
      // the real one already on the page.
      await expect(page.locator('#annotationPreview .absa-relation-row').first()).toBeVisible();
      // absa-va.json's triples carry no relType, so buildRelationTripleRow()'s
      // guard (task-config.engine.js:2087) suppresses the type badge. Patch a
      // relType that also exists in
      // outputConfigs['relation_identification'].relation_types — the only way
      // the badge renders at all — then re-render in place. Same state-patch
      // pattern as task-new-step2-dark-mode.spec.ts:16-42.
      await page.evaluate((relType) => {
        type AbsaWindow = Window & {
          state: {
            outputConfigs: Record<string, { relation_types?: string[] }>;
            previewTriples: Array<{ relType?: string | null }>;
          };
          renderAbsaUnifiedPreview_refresh: (container: Element) => void;
        };
        const win = window as unknown as AbsaWindow;
        if (!win.state.outputConfigs['relation_identification']) {
          win.state.outputConfigs['relation_identification'] = {};
        }
        win.state.outputConfigs['relation_identification'].relation_types = [relType];
        win.state.previewTriples[0].relType = relType;
        const container = document.querySelector('#annotationPreview .preview-unified');
        if (!container) throw new Error('preview-unified container not found');
        win.renderAbsaUnifiedPreview_refresh(container);
      }, REL_TYPE);
    },
    rows: [
      {
        // issue #982 spot 3: task-config.css:491, rendered by
        // buildRelationTripleRow() inside the ABSA unified preview.
        label: '.absa-relation-badge',
        locate: (page) => page.locator('#annotationPreview .absa-relation-badge').first(),
      },
      {
        // issue #1022: the relation-type badge span built at
        // task-config.engine.js:2088-2091 used an inline `font-size:10px`.
        //
        // `.absa-relation-row span` also matches the row's outer content span
        // (it wraps subj/arrow/relBadge/arrow2/obj/typeBadge, so it too
        // contains "類型：" as a substring). typeBadge is appended last among
        // that span's children, so in document order it is the LAST match —
        // `.first()` would resolve to the ancestor content span instead.
        label: 'relation-type badge (buildRelationTripleRow typeBadge)',
        locate: (page) =>
          page
            .locator('#annotationPreview .absa-relation-row span', { hasText: '類型：' })
            .last(),
        identity: { exactText: `類型：${REL_TYPE}` },
      },
    ],
  },
];

for (const contract of FONT_SIZE_CONTRACT) {
  test(contract.scenario, async ({ page }) => {
    await contract.reach(page);
    for (const row of contract.rows) {
      const el = row.locate(page);
      await expect(el, `${row.label} must be visible`).toBeVisible();
      if (row.identity?.hasClass) {
        await expect(el, `${row.label} identity`).toHaveClass(row.identity.hasClass);
      }
      if (row.identity?.exactText) {
        await expect(el, `${row.label} identity`).toHaveText(row.identity.exactText);
      }
      if (row.identity?.containsText) {
        await expect(el, `${row.label} identity`).toContainText(row.identity.containsText);
      }
      await expect(el, `${row.label} must render at the --text-label floor`).toHaveCSS(
        'font-size',
        LABEL_FONT_SIZE
      );
    }
  });
}

/* ------------------------------------------------------------------ *
 * Measurement-helper regression guard (issue #1040)
 * ------------------------------------------------------------------ */

test('measureContrast reads a live element even while it is continuously detached and replaced', async ({
  page,
}) => {
  await loadWithTheme(page, TASK_DETAIL_URL, 'dark');
  // Scoped to a throwaway container (unique id) so this test's own
  // .page-btn.active node can never collide with task-detail.html's real
  // pagination controls (member-management / metadata / work-log /
  // audit-record / audit-export), regardless of whether the page's own 560ms
  // re-render timer has fired yet.
  //
  // A single one-shot 0ms replace (matching production's single 560ms timer)
  // reliably fires *before* the test script even reaches measureContrast,
  // because the preceding awaited round trips already exceed 0ms — so it never
  // lands in the narrow internal gap between a Locator resolving an element
  // handle and evaluating on that handle. To turn that rare production race
  // into a deterministic repro, this continuously detaches-and-replaces the
  // button (capped at MAX_ITERATIONS) for the whole duration of the test,
  // guaranteeing some replacement lands inside whatever gap
  // toBeVisible() / evaluate() leave open.
  await page.evaluate(() => {
    const container = document.createElement('div');
    container.id = 'racetestContainer1040';
    document.body.appendChild(container);
    let current = document.createElement('button');
    current.className = 'page-btn active';
    current.style.color = 'rgb(255, 255, 255)';
    current.style.backgroundColor = 'rgb(0, 0, 0)';
    container.appendChild(current);

    const MAX_ITERATIONS = 20000;
    let iterations = 0;
    const swap = () => {
      if (iterations++ >= MAX_ITERATIONS) return;
      const fresh = document.createElement('button');
      fresh.className = 'page-btn active';
      fresh.style.color = 'rgb(255, 255, 255)';
      fresh.style.backgroundColor = 'rgb(0, 0, 0)';
      current.replaceWith(fresh);
      current = fresh;
      window.setTimeout(swap, 0);
    };
    window.setTimeout(swap, 0);
  });
  const ratio = await measureContrast(page, {
    kind: 'live',
    selector: '#racetestContainer1040 .page-btn.active',
  });
  expect(ratio).toBeGreaterThan(1);
});
