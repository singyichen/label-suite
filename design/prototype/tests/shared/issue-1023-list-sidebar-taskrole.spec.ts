/**
 * issue #1023: on `annotation-list.html`, the `mountSidebar()` call
 * (design/prototype/pages/annotation/annotation-list.html ~588) omits
 * `taskRole` entirely:
 *
 *   window.LabelSuiteSharedSidebar.mountSidebar({
 *     mountId: 'sharedSidebarMount',
 *     activeNav: 'annotation',
 *     annotationHref: annotationListHref,
 *     ...
 *   });
 *
 * The control group, `annotation-workspace.html` (1104-1111), resolves the
 * URL's `role` param into `taskRole` before calling `mountSidebar()`:
 *
 *   var urlTaskRole = (function () {
 *     var role = new URLSearchParams(window.location.search).get('role');
 *     return role === 'reviewer' ? 'reviewer'
 *       : role === 'project_leader' ? 'project_leader' : 'annotator';
 *   })();
 *   window.LabelSuiteSharedSidebar.mountSidebar({
 *     mountId: 'sharedSidebarMount',
 *     activeNav: 'annotation',
 *     taskRole: urlTaskRole,
 *     ...
 *   });
 *
 * Because `annotation-list.html` never computes or passes `taskRole`,
 * `renderSidebar()` (design/prototype/pages/shared/sidebar.js ~486-513)
 * always falls through to its `undefined` branch and renders '標記作業'
 * for `#navAnnotation`, no matter what `role` the list page's URL carries.
 * `sidebar.js` already has all three branches (issue #1018, merged as of
 * this file's Traceability baseline) -- reviewer -> 審核作業/Review,
 * project_leader -> 例外處置/Exception Disposition, else -> 標記作業 (no
 * English variant) -- so the fix is solely in annotation-list.html's
 * `mountSidebar()` call site, not in sidebar.js.
 *
 * This file asserts the RENDERED DOM text of `#navAnnotation` on
 * `annotation-list.html` for reviewer and project_leader (currently wrong:
 * both still read '標記作業'), plus guards for annotator / no-role. The zh
 * guards are true non-regression pins (already correct today, unaffected by
 * the fix). The en/annotator guard is DIFFERENT and deliberately NOT a
 * non-regression pin -- see the "DELIBERATELY ACCEPTED REGRESSION" note
 * below and the case itself further down.
 *
 * Structural conventions (mirrors
 * issue-1018-sidebar-pl-exception-label.spec.ts):
 * - Each role/language scenario lives in its own `test.describe`
 *   (retries: 2).
 * - English assertions preset `localStorage.labelsuite.lang = 'en'` via
 *   `page.addInitScript` BEFORE `page.goto`, not a post-navigation
 *   `lang-toggle` click -- `mountSidebar()` bakes `#navAnnotation`'s text
 *   into static HTML once, at mount, from `taskRoleI18n[readStoredLang()]`
 *   (sidebar.js:486, 511-513); a later language toggle never re-invokes
 *   `mountSidebar()` for this element (confirmed in issue #1018's file
 *   header).
 * - All assertions use `expect(...).toHaveText(...)`, which polls/retries,
 *   never a one-shot `.textContent()` / `.evaluate()` read (issue #1040).
 * - `project_leader` is built as a literal query string, not via
 *   `buildListUrl()` (`_workspace-helpers.ts`'s `Role` type is intentionally
 *   `'annotator' | 'reviewer'` only) -- mirrors
 *   `buildProjectLeaderUrl()` in issue-1018-sidebar-pl-exception-label.spec.ts.
 * - No `skipGuidelineModal()` call: unlike annotation-workspace.html,
 *   annotation-list.html has no first-visit guideline modal (confirmed by
 *   its existing annotation-list-reviewer.spec.ts, which never calls it).
 *
 * NOTE on the issue #1018 precedent, and a DELIBERATELY ACCEPTED REGRESSION
 * (see the annotator/en case further down for the assertion itself): before
 * the Green fix, annotation-list.html carried its OWN legacy
 * `applyNavLabels()` / `I18N` dictionary (annotation-list.html:726, 802,
 * 2532-2536, invoked at :2574 and again on every lang-toggle click at
 * :2587) that overwrote `#navAnnotation` AFTER `mountSidebar()` ran, from a
 * plain zh/en pair with NO taskRole awareness at all -- that overwrite was
 * itself a violation of FR-020 ("消費頁面不得於掛載完成後另行以 DOM 操作
 * 覆寫該節點之顯示文字"), and removing it is REQUIRED for the
 * reviewer/project_leader fix above to take effect at all: `sidebar.js`'s
 * `mountSidebar()` opts expose no nav-label override entry (only
 * `roleIndicator`/`roleLabel`), so under "do not touch sidebar.js" there is
 * no alternative to removing this page-local overwrite. The Green fix
 * (70c8e7ba) removed `navAnnotation` from both `applyNavLabels()`'s
 * overwrite list and the `I18N[lang]` dictionary entries, in addition to
 * passing `taskRole` into the `mountSidebar()` call site.
 *
 * That removal has a side effect that IS a regression, not a fix: before,
 * `annotation-list.html` rendered `#navAnnotation` as 'Annotation' under an
 * English locale for the annotator role; after, it renders the untranslated
 * '標記作業' -- an English-locale user now sees Chinese text where they
 * didn't before. This is DELIBERATELY ACCEPTED, not the desired end state.
 * The only way to avoid it without exceeding this issue's scope would be
 * making `sidebar.js`'s `annotator`/else branch language-aware -- but
 * FR-020's current text gives `reviewer` (en: `Review`) and `project_leader`
 * (en: `Exception Disposition`) English strings while `annotator` has none
 * ("維持既有預設「標記作業」" only, no English variant). Adding one is NEW
 * FR-020 contract content, not a clarification, and belongs to issue #1041
 * (filed, awaiting maintainer adjudication on the L0 label i18n gap) --
 * not this issue's Lightweight Path. Once #1041 lands an English string for
 * the annotator/else branch, `sidebar.js` will render it correctly on BOTH
 * `annotation-workspace.html` and `annotation-list.html`, and the assertion
 * below should change from '標記作業' to whatever #1041 defines. Do not
 * read '標記作業' in that case as the desired end state -- it is the
 * regression #1041 is tracked to fix.
 *
 * Traceability: issue #1023; issue #1041 (tracks the deliberately accepted
 * regression above); specs/shared/008-sidebar-navbar-shared/spec.md FR-020.
 */
import { test, expect, type Page } from '@playwright/test';
import { buildListUrl } from '../annotation/_workspace-helpers';

async function presetEnglish(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('labelsuite.lang', 'en');
  });
}

function navAnnotation(page: Page) {
  return page.locator('#navAnnotation');
}

const TASK = 'T001';
const RUN_TYPE = 'dry_run';

/* `_workspace-helpers.ts`'s `Role` type is intentionally `'annotator' |
 * 'reviewer'` only, so the project_leader deep link is built locally here,
 * mirroring buildProjectLeaderUrl() in
 * issue-1018-sidebar-pl-exception-label.spec.ts. */
function buildProjectLeaderListUrl(): string {
  return `/pages/annotation/annotation-list.html?task_id=${TASK}&role=project_leader&run_type=${RUN_TYPE}`;
}

test.describe('issue #1023: reviewer #navAnnotation reads 審核作業 on annotation-list.html (zh)', () => {
  test.describe.configure({ retries: 2 });

  test('reviewer: #navAnnotation reads 審核作業', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: TASK, role: 'reviewer', run_type: RUN_TYPE }));

    // Red: today this renders "標記作業" because annotation-list.html's
    // mountSidebar() call never passes taskRole at all.
    await expect(navAnnotation(page)).toHaveText('審核作業');
  });
});

test.describe('issue #1023: reviewer #navAnnotation reads Review on annotation-list.html (en)', () => {
  test.describe.configure({ retries: 2 });

  test('reviewer: #navAnnotation reads Review with English preset before navigation', async ({ page }) => {
    await presetEnglish(page);
    await page.goto(buildListUrl({ task_id: TASK, role: 'reviewer', run_type: RUN_TYPE }));

    await expect(navAnnotation(page)).toHaveText('Review');
  });
});

test.describe('issue #1023: project_leader #navAnnotation reads 例外處置 on annotation-list.html (zh)', () => {
  test.describe.configure({ retries: 2 });

  test('project_leader: #navAnnotation reads 例外處置', async ({ page }) => {
    await page.goto(buildProjectLeaderListUrl());

    await expect(navAnnotation(page)).toHaveText('例外處置');
  });
});

test.describe('issue #1023: project_leader #navAnnotation reads Exception Disposition on annotation-list.html (en)', () => {
  test.describe.configure({ retries: 2 });

  test('project_leader: #navAnnotation reads Exception Disposition with English preset before navigation', async ({ page }) => {
    await presetEnglish(page);
    await page.goto(buildProjectLeaderListUrl());

    await expect(navAnnotation(page)).toHaveText('Exception Disposition');
  });
});

test.describe('issue #1023: regression guard — annotator/no-role #navAnnotation stays 標記作業 on annotation-list.html (zh/en)', () => {
  test.describe.configure({ retries: 2 });

  /* Non-regression pin: annotator role must keep reading '標記作業', both
   * before and after the Green fix starts passing taskRole. Expected to
   * PASS already, since 'annotator' resolves to the same else-branch that
   * currently fires unconditionally. */
  test('annotator: #navAnnotation stays 標記作業 (zh)', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: TASK, role: 'annotator', run_type: RUN_TYPE }));

    await expect(navAnnotation(page)).toHaveText('標記作業');
  });

  /* DELIBERATELY ACCEPTED REGRESSION -- see the file-header note above for
   * the full explanation. Before the Green fix (70c8e7ba), this case
   * rendered 'Annotation' (en) from annotation-list.html's own legacy
   * `applyNavLabels()` / `I18N[lang].navAnnotation` dictionary
   * (design/prototype/pages/annotation/annotation-list.html:2532-2536),
   * which overwrote `#navAnnotation` after `mountSidebar()` ran and was
   * itself an FR-020 violation. Removing that overwrite was REQUIRED for
   * the reviewer/project_leader fix above to take effect at all -- there is
   * no alternative under `sidebar.js`'s current `opts` surface. Its side
   * effect: `#navAnnotation` is now governed solely by `sidebar.js`, whose
   * `annotator`/else branch has no English variant, so this case regresses
   * to the untranslated '標記作業' -- an English-locale user sees Chinese
   * text where they didn't before. This is an ACCEPTED regression, not a
   * correct or desired outcome: the alternative (giving the `annotator`
   * branch an English string in FR-020) is new contract content outside
   * this issue's Lightweight Path, tracked at issue #1041. DO NOT read
   * '標記作業' below as the intended behavior -- when #1041 lands, this
   * assertion must be updated to whatever English string it defines, not
   * kept as a permanent expectation. */
  test('annotator: #navAnnotation regresses to untranslated 標記作業 (en context, preset before navigation) — accepted, tracked in #1041', async ({ page }) => {
    await presetEnglish(page);
    await page.goto(buildListUrl({ task_id: TASK, role: 'annotator', run_type: RUN_TYPE }));

    await expect(navAnnotation(page)).toHaveText('標記作業');
  });

  /* annotation-list.html's own default role (buildListUrl()'s `role`
   * param defaults to 'annotator'), so a URL with no `role` param at all
   * must behave identically. */
  test('no role param: #navAnnotation stays 標記作業 (zh)', async ({ page }) => {
    await page.goto(`/pages/annotation/annotation-list.html?task_id=${TASK}&run_type=${RUN_TYPE}`);

    await expect(navAnnotation(page)).toHaveText('標記作業');
  });
});
